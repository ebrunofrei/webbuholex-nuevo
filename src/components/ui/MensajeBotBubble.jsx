import React, { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

import LegalMarkdown from "@/components/litisbot/chat/markdown/LegalMarkdown";
import LegalReviewPanel from "@/components/litisbot/chat/markdown/ui/LegalReviewPanel";

import { analyzeLegalLogicCoherence } from "@/components/litisbot/chat/markdown/logic/LegalLogicCoherenceEngine";
import { detectInternalContradictions } from "@/components/litisbot/chat/markdown/logic/LegalContradictionEngine";
import { createJurisprudenceComparator } from "@/components/litisbot/chat/markdown/juris/JurisprudenceComparator";
import { createHttpJurisProvider } from "@/components/litisbot/chat/markdown/juris/jurisProviderHttp";

import { semanticNormalize } from "@/components/litisbot/chat/markdown/logic/SemanticLegalFormatter";
import { formatUltraPremiumLegal } from "@/components/litisbot/chat/markdown/logic/AdvancedLegalRhetoricEngine";
import StructuredAnalysisToggle from "@/components/litisbot/chat-pro/components/StructuredAnalysisToggle.jsx";

const MAX_CHARS_PREVIEW = 900;
const MAX_BROWSER_CHARS = 280;
const AZURE_VOICE = "es-PE-AngeloNeural";

/* ============================================================
   📚 Jurisprudencia (Backend-first)
   ============================================================ */

const jurisComparator = (() => {
  try {
    const provider = createHttpJurisProvider({
      endpoint: "/api/juris/search",
    });
    return createJurisprudenceComparator(provider);
  } catch {
    return null;
  }
})();

export default function MensajeBotBubble({ msg, structuredAnalysis }) {
  /* ============================================================
     STATE
     ============================================================ */

  const [expanded, setExpanded] = useState(false);
  const [stableText, setStableText] = useState("");
  const [ttsState, setTtsState] = useState("idle");
  const [jurisData, setJurisData] = useState(null);

  /* ============================================================
     REFS
     ============================================================ */

  const utteranceRef = useRef(null);
  const audioRef = useRef(null);

  /* ============================================================
     CONGELAR TEXTO
     ============================================================ */

  useEffect(() => {
    if (typeof msg?.content === "string") {
      setStableText(msg.content);
    }
  }, [msg?.content]);

  const rawText = stableText || "";

  /* ============================================================
     🧠 PIPELINE EDITORIAL (Determinista)
     ============================================================ */

  const processedText = useMemo(() => {
    if (!rawText) return "";

    const normalized = semanticNormalize(rawText);

    return formatUltraPremiumLegal(normalized, {
      country: "PE",        // Determinista
      mode: "litigacion",   // Dinámico si luego decides exponerlo
    });
  }, [rawText]);

  /* ============================================================
     PREVIEW
     ============================================================ */

  const isThinking =
    msg?._placeholder ||
    msg?.loading ||
    (!rawText.trim() && msg?.role === "assistant");

  const isLong = processedText.length > MAX_CHARS_PREVIEW;

  const visibleText = useMemo(() => {
    if (!isLong || expanded) return processedText;
    return processedText.slice(0, MAX_CHARS_PREVIEW) + "…";
  }, [processedText, isLong, expanded]);

  /* ============================================================
     🧠 MOTOR DE COHERENCIA + CONTRADICCIONES
     ============================================================ */

  const reviewReport = useMemo(() => {
    if (!rawText || rawText.length < 900) return null;

    const coherence = analyzeLegalLogicCoherence(rawText, {
      minLen: 900,
    });

    if (!coherence) return null;

    const contradictions = detectInternalContradictions(
      coherence.claims || []
    );

    return {
      coherence,
      contradictions,
      jurisprudence: jurisData,
    };
  }, [rawText, jurisData]);

  /* ============================================================
     ⚖️ JURISPRUDENCIA (async)
     ============================================================ */

  useEffect(() => {
    let active = true;

    async function fetchJuris() {
      if (!jurisComparator) return;
      if (!rawText || rawText.length < 1200) return;

      const coherence = analyzeLegalLogicCoherence(rawText, {
        minLen: 900,
      });

      if (!coherence?.claims?.length) return;

      try {
        const data = await jurisComparator.compare({
          claims: coherence.claims,
          jurisdiction: "PE",
          limit: 5,
        });

        if (active) {
          setJurisData(data);
        }
      } catch {
        // Silencioso
      }
    }

    fetchJuris();

    return () => {
      active = false;
    };
  }, [rawText]);

  /* ============================================================
     🔊 TTS
     ============================================================ */

  async function playTTS() {
    if (!rawText.trim()) return;

    if (rawText.length > MAX_BROWSER_CHARS) {
      const res = await fetch("/api/tts/azure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText, voice: AZURE_VOICE }),
      });

      const { audioBase64 } = await res.json();
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => setTtsState("idle");
      audio.play();
      setTtsState("playing");
      return;
    }

    const u = new SpeechSynthesisUtterance(rawText);
    u.lang = "es-PE";
    u.onend = () => setTtsState("idle");

    utteranceRef.current = u;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setTtsState("playing");
  }

  /* ============================================================
     THINKING STATE
     ============================================================ */

  if (isThinking) {
    return (
      <div className="py-10 text-neutral-400 italic">
        Procesando análisis jurídico…
      </div>
    );
  }

  if (!rawText.trim()) return null;

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <article className="py-12 border-b border-neutral-100 space-y-6">

      {/* 🧠 Panel de revisión */}
      <LegalReviewPanel report={reviewReport} />

      {/* 📖 Renderer universal */}
      <LegalMarkdown content={visibleText} />

      {structuredAnalysis && (
        <StructuredAnalysisToggle result={structuredAnalysis} />
      )}

      {/* 🔽 Expandir */}
      {isLong && (
        <div className="text-sm text-neutral-500">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="hover:text-neutral-900 transition"
          >
            {expanded ? "Mostrar menos" : "Continuar lectura"}
          </button>
        </div>
      )}

      {/* 🔊 TTS */}
      <div className="flex justify-end text-neutral-400">
        {ttsState === "idle" ? (
          <button onClick={playTTS}>
            <Play size={18} />
          </button>
        ) : (
          <button onClick={() => setTtsState("idle")}>
            <Pause size={18} />
          </button>
        )}
      </div>

    </article>
  );
}