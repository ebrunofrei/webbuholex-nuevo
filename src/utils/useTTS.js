// ============================================================
// 🦉 BúhoLex | Hook TTS compartido (Play / Pause / Resume / Restart)
// - Cancela SIEMPRE al desmontar o cuando tú lo llames con stop(true)
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";

const sanitize = (htmlOrText = "") =>
  String(htmlOrText)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu, " ")
    .replace(/\b(?!(?:19|20)\d{2}\b)\d{1,3}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const chunk = (text, size = 1700) => {
  const out = []; let i = 0;
  while (i < text.length) {
    let end = Math.min(i + size, text.length);
    const dot = text.lastIndexOf(".", end);
    if (dot > i + 200) end = dot + 1;
    out.push(text.slice(i, end).trim());
    i = end;
  }
  return out.filter(Boolean);
};

export function useTTS() {
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);
  const [state, setState] = useState({ status: "idle", idx: 0, chunks: [] }); // idle|playing|paused
  const currentRef = useRef(null);

  useEffect(() => { try { synthRef.current?.getVoices(); } catch {} }, []);

  const stop = useCallback((reset = true) => {
    try { synthRef.current?.cancel?.(); } catch {}
    currentRef.current = null;
    setState((s) => ({ status: "idle", idx: reset ? 0 : s.idx, chunks: reset ? [] : s.chunks }));
  }, []);

  useEffect(() => () => stop(true), [stop]);

  const start = useCallback((text) => {
    const chunks = chunk(sanitize(text));
    if (!chunks.length) return;
    setState({ status: "playing", idx: 0, chunks });
  }, []);

  const speakFrom = useCallback((index) => {
    const { chunks } = state;
    if (!chunks.length || index >= chunks.length) return stop(true);
    const utt = new SpeechSynthesisUtterance(chunks[index]);
    utt.lang = "es-PE"; utt.rate = 1.0; utt.pitch = 1.0;
    utt.onend = () => setState((s) => ({ ...s, idx: s.idx + 1 }));
    utt.onerror = () => setState((s) => ({ ...s, idx: s.idx + 1 }));
    currentRef.current = utt;
    synthRef.current.speak(utt);
  }, [state, stop]);

  useEffect(() => {
    if (state.status !== "playing") return;
    if (!synthRef.current?.speaking && !synthRef.current?.paused) speakFrom(state.idx);
  }, [state.status, state.idx, speakFrom]);

  const toggle = useCallback((plainTextBuilder) => {
    if (state.status === "idle") {
      const plain = plainTextBuilder?.();
      if (!plain) return;
      start(plain);
      return;
    }
    if (state.status === "playing") {
      try { synthRef.current?.pause?.(); } catch {}
      setState((s) => ({ ...s, status: "paused" }));
      return;
    }
    if (state.status === "paused") {
      try { synthRef.current?.resume?.(); } catch {}
      setState((s) => ({ ...s, status: "playing" }));
    }
  }, [state.status, start]);

  const restart = useCallback((plainTextBuilder) => {
    const plain = plainTextBuilder?.();
    if (!plain) return;
    stop(true);
    setTimeout(() => start(plain), 20);
  }, [stop, start]);

  return { ttsState: state, toggleTTS: toggle, restartTTS: restart, stopTTS: stop, sanitize };
}
