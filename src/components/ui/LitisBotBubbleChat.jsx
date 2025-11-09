// src/components/LitisBotBubbleChat.jsx
/* eslint-disable react/no-danger */
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  FaPaperclip,
  FaMicrophone,
  FaPaperPlane,
  FaVolumeUp,
  FaRegCopy,
  FaRegEdit,
  FaRegThumbsUp,
  FaRegThumbsDown,
  FaRedoAlt,
  FaInfinity,
  FaStop,
  FaBellSlash,
  FaBell,
} from "react-icons/fa";

import litisLogo from "@/assets/litisbot-logo.png";
import { enviarMensajeIA, pingIA } from "@/services/chatClient";

// === Voz centralizada (coherente con vozService.js actualizado) ===
import {
  reproducirVoz,
  replayLast,
  loopLast,
  stopVoz,
  setTTSMuted,
  getTTSMuted,
  isSpeaking,
} from "@/services/vozService.js";

/* ============================================================
   ⚙️ Preferencias TTS (voz, velocidad, tono) + storage (v1)
============================================================ */
const VOICES = [
  { id: "es-ES-AlvaroNeural", label: "Álvaro (varón, ES-ES)" },
  { id: "es-ES-ElviraNeural", label: "Elvira (mujer, ES-ES)" },
  { id: "es-MX-JorgeNeural", label: "Jorge (varón, ES-MX)" },
  { id: "es-MX-DaliaNeural", label: "Dalia (mujer, ES-MX)" },
];

const IS_BROWSER = typeof window !== "undefined";
const TTS_STORE_KEY = "ttsPrefs:v1";
const CHAT_STORE_KEY = "litisChat:v1"; // persistencia ligera (session)

function loadTtsPrefs() {
  if (!IS_BROWSER) return null;
  try {
    const raw = window.localStorage.getItem(TTS_STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function saveTtsPrefs(prefs) {
  if (!IS_BROWSER) return;
  try {
    window.localStorage.setItem(TTS_STORE_KEY, JSON.stringify(prefs));
  } catch {}
}
function loadChatSession() {
  if (!IS_BROWSER) return null;
  try {
    const raw = window.sessionStorage.getItem(CHAT_STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function saveChatSession(messages) {
  if (!IS_BROWSER) return;
  try {
    const compact = Array.isArray(messages) ? messages.slice(-50) : [];
    window.sessionStorage.setItem(CHAT_STORE_KEY, JSON.stringify(compact));
  } catch {}
}

/* ============================================================
   Utilidades de formato / sanitización
============================================================ */
function sanitizeHtml(html = "") {
  if (!IS_BROWSER) {
    return String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
      .trim();
  }
  try {
    const tmp = document.createElement("div");
    tmp.innerHTML = html || "";
    tmp.querySelectorAll("script,style,noscript").forEach((el) => el.remove());
    return tmp.innerHTML;
  } catch {
    return html || "";
  }
}
function toPlain(html) {
  if (!IS_BROWSER) return String(html || "");
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return tmp.textContent || tmp.innerText || html || "";
}
async function copyToClipboardFallback(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (!IS_BROWSER) return false;
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
function prepararTextoParaCopia(html) {
  const plano = toPlain(html);
  return plano.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ============================================================
   💬 Mensaje del ASISTENTE (burbuja blanca)
============================================================ */
function MensajeBotBubble({ msg, onCopy, onEdit, onFeedback, ttsPrefs }) {
  const [editando, setEditando] = useState(false);
  const [editValue, setEditValue] = useState(msg.content || "");
  const [leyendo, setLeyendo] = useState(false);

  async function handleSpeak() {
    if (leyendo) return;
    setLeyendo(true);
    try {
      const plain = toPlain(msg.content || "");
      // Solo reproduce si el usuario lo pidió (click)
      await reproducirVoz(plain, {
        voz: ttsPrefs?.voiceId || "es-ES-AlvaroNeural",
        // Se envía en puntos porcentuales (coherente con vozService)
        rate: Math.round(((ttsPrefs?.rate ?? 1) - 1) * 100) || 0,
        pitch: parseInt(ttsPrefs?.pitch ?? 0, 10) || 0,
      });
    } catch (err) {
      console.error("🔇 Error TTS:", err);
    } finally {
      setLeyendo(false);
    }
  }

  async function handleCopiar() {
    const limpio = prepararTextoParaCopia(msg.content);
    const ok = await copyToClipboardFallback(limpio);
    onCopy && onCopy(limpio, ok);
  }

  return (
    <div
      className="flex flex-col w-fit max-w-[92%] rounded-[1.5rem] shadow border px-4 py-4"
      style={{
        backgroundColor: "#ffffff",
        borderColor: "rgba(92,46,11,0.15)",
        color: "#5C2E0B",
      }}
    >
      {!editando ? (
        <div
          className="leading-relaxed whitespace-pre-wrap break-words text-[16px]"
          style={{ textAlign: "justify", wordBreak: "break-word" }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(msg.content) }}
        />
      ) : (
        <div className="flex flex-col gap-2 w-full">
          <textarea
            className="w-full border rounded p-2 text-[15px] leading-relaxed"
            style={{ borderColor: "rgba(92,46,11,0.3)", color: "#5C2E0B" }}
            rows={4}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
          <div className="flex gap-4 text-[15px]">
            <button
              className="font-semibold"
              style={{ color: "#0f5132" }}
              onClick={() => {
                setEditando(false);
                onEdit && onEdit(editValue);
              }}
            >
              Guardar
            </button>
            <button
              style={{ color: "#842029" }}
              onClick={() => {
                setEditando(false);
                setEditValue(msg.content || "");
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!editando && (
        <div className="flex flex-row flex-wrap items-center gap-4 mt-4 text-[18px]">
          {/* voz */}
          <button
            className="flex items-center justify-center w-9 h-9 rounded-full"
            style={{
              background: "#5C2E0B",
              color: "#fff",
              opacity: leyendo ? 0.6 : 1,
              cursor: leyendo ? "not-allowed" : "pointer",
            }}
            aria-label="Leer en voz alta"
            title="Leer en voz alta"
            disabled={leyendo}
            onClick={handleSpeak}
          >
            <FaVolumeUp size={16} />
          </button>

          {/* copiar */}
          <button
            style={{ color: "#5C2E0B" }}
            onClick={handleCopiar}
            title="Copiar para Word / PDF"
            aria-label="Copiar"
          >
            <FaRegCopy size={18} />
          </button>

          {/* editar */}
          <button
            style={{ color: "#5C2E0B" }}
            onClick={() => setEditando(true)}
            title="Editar borrador"
            aria-label="Editar"
          >
            <FaRegEdit size={18} />
          </button>

          {/* like / dislike */}
          <button
            style={{ color: "#0f5132" }}
            onClick={() => onFeedback && onFeedback("up")}
            title="Respuesta útil"
            aria-label="Respuesta útil"
          >
            <FaRegThumbsUp size={18} />
          </button>
          <button
            style={{ color: "#842029" }}
            onClick={() => onFeedback && onFeedback("down")}
            title="Respuesta no útil"
            aria-label="Respuesta no útil"
          >
            <FaRegThumbsDown size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   💬 Mensaje del USUARIO (burbuja marrón)
============================================================ */
function MensajeUsuarioBubble({ texto }) {
  return (
    <div className="flex justify-end w-full">
      <div
        className="rounded-[1.5rem] shadow px-4 py-3 text-white text-[16px] leading-relaxed font-medium max-w-[88%]"
        style={{ background: "#5C2E0B" }}
      >
        {texto}
      </div>
    </div>
  );
}

/* ============================================================
   📱 Hook: detectar si estamos en móvil
============================================================ */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    IS_BROWSER ? window.matchMedia("(max-width: 640px)").matches : false
  );

  useEffect(() => {
    if (!IS_BROWSER) return;
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

/* ============================================================
   🧠 Util: último mensaje relevante del hilo
============================================================ */
function obtenerUltimoMensaje(mensajes = []) {
  if (!mensajes?.length) return "";
  const asis = [...mensajes]
    .reverse()
    .find((m) => m?.role === "assistant" && m?.content?.trim());
  if (asis?.content) return asis.content.trim();
  return (
    [...mensajes].reverse().find((m) => m?.content?.trim())?.content?.trim() ||
    ""
  );
}

/* ============================================================
   🎛️ Controles TTS comunes (Leer / Repetir / Bucle / Stop / Mute)
============================================================ */
function TTSControls({ mensajes, ttsPrefs }) {
  const [muted, setMuted] = useState(() => getTTSMuted());
  const [isLoop, setIsLoop] = useState(false);
  const [reading, setReading] = useState(false);

  async function handleLeerUltimo() {
    const texto = obtenerUltimoMensaje(mensajes);
    if (!texto) return;
    setReading(true);
    try {
      await reproducirVoz(toPlain(texto), {
        voz: ttsPrefs.voiceId,
        rate: Math.round(((ttsPrefs?.rate ?? 1) - 1) * 100) || 0,
        pitch: parseInt(ttsPrefs?.pitch ?? 0, 10) || 0,
      });
    } finally {
      // reading indica intento; no el estado real (isSpeaking se consulta aparte si hace falta)
      setReading(false);
    }
  }

  async function handleRepeat() {
    // Reproduce el último 1 vez más (reinicia)
    await replayLast(1, true);
  }

  async function handleToggleLoop() {
    const next = !isLoop;
    setIsLoop(next);
    await loopLast(next);
  }

  function handleStop() {
    stopVoz();
    setIsLoop(false);
  }

  function handleMuteToggle() {
    const next = !muted;
    setTTSMuted(next);
    setMuted(next);
    if (next) {
      // si se mutea, garantizamos detener
      stopVoz();
      setIsLoop(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        className="text-white px-3 py-2 rounded-md active:scale-95"
        style={{ background: "#5C2E0B" }}
        onClick={handleLeerUltimo}
        title="Leer el último mensaje del hilo"
        disabled={muted || reading}
      >
        <FaVolumeUp className="inline -mt-1 mr-1" /> Leer
      </button>

      <button
        className="px-3 py-2 rounded-md border active:scale-95"
        style={{ borderColor: "rgba(92,46,11,0.25)", color: "#5C2E0B" }}
        onClick={handleRepeat}
        title="Reiniciar lectura"
        disabled={muted || !isSpeaking()}
      >
        <FaRedoAlt className="inline -mt-1 mr-1" /> Repetir
      </button>

      <button
        className={`px-3 py-2 rounded-md border active:scale-95 ${
          isLoop ? "bg-yellow-100" : ""
        }`}
        style={{ borderColor: "rgba(92,46,11,0.25)", color: "#5C2E0B" }}
        onClick={handleToggleLoop}
        title="Bucle infinito del último"
        disabled={muted}
      >
        <FaInfinity className="inline -mt-1 mr-1" /> {isLoop ? "Bucle ON" : "Bucle OFF"}
      </button>

      <button
        className="px-3 py-2 rounded-md border active:scale-95"
        style={{ borderColor: "rgba(92,46,11,0.25)", color: "#5C2E0B" }}
        onClick={handleStop}
        title="Detener voz"
      >
        <FaStop className="inline -mt-1 mr-1" /> Detener
      </button>

      <button
        className="px-3 py-2 rounded-md border active:scale-95"
        style={{ borderColor: "rgba(92,46,11,0.25)", color: "#5C2E0B" }}
        onClick={handleMuteToggle}
        title={muted ? "Quitar silencio" : "Silenciar voz"}
      >
        {muted ? (
          <>
            <FaBell className="inline -mt-1 mr-1" /> Sonido ON
          </>
        ) : (
          <>
            <FaBellSlash className="inline -mt-1 mr-1" /> Silenciar
          </>
        )}
      </button>
    </div>
  );
}

/* ============================================================
   🪟 ChatWindow (no remonta) + a11y + controles TTS
============================================================ */
function ChatWindow({
  isOpen,
  isMobile,
  pro,
  feedRef,
  mensajes,
  cargando,
  input,
  setInput,
  handleKeyDown,
  enviarMensaje,
  setMensajes,
  setIsOpen,
  ttsPrefs,
  showTtsCfg,
  setShowTtsCfg,
  setTtsPrefs,
}) {
  if (!isOpen) return null;
  const headerBg = "#5C2E0B";
  const headerColor = "#fff";

  // Panel compacto de configuración TTS
  const PanelTTS = (
    <>
      <button
        className="rounded-full w-10 h-10 text-white active:scale-95 transition-transform"
        style={{ background: "#5C2E0B" }}
        title="Configurar voz"
        onClick={() => setShowTtsCfg((v) => !v)}
      >
        ⚙️
      </button>

      {showTtsCfg && (
        <div
          className="w-full mt-2 p-3 rounded-lg border text-[14px]"
          style={{ borderColor: "rgba(92,46,11,0.25)", color: "#5C2E0B" }}
        >
          <label className="block mb-2 font-semibold">Voz</label>
          <select
            className="w-full border rounded px-2 py-1 mb-3"
            style={{ borderColor: "rgba(92,46,11,0.3)", color: "#5C2E0B" }}
            value={ttsPrefs.voiceId}
            onChange={(e) =>
              setTtsPrefs((p) => ({ ...p, voiceId: e.target.value }))
            }
          >
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>

          <label className="block mb-1 font-semibold">
            Velocidad: {(ttsPrefs.rate * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value={ttsPrefs.rate}
            onChange={(e) =>
              setTtsPrefs((p) => ({ ...p, rate: parseFloat(e.target.value) }))
            }
            className="w-full mb-3"
          />

          <label className="block mb-1 font-semibold">
            Tono: {ttsPrefs.pitch > 0 ? `+${ttsPrefs.pitch}` : ttsPrefs.pitch} st
          </label>
          <input
            type="range"
            min="-6"
            max="6"
            step="1"
            value={ttsPrefs.pitch}
            onChange={(e) =>
              setTtsPrefs((p) => ({
                ...p,
                pitch: parseInt(e.target.value, 10),
              }))
            }
            className="w-full"
          />
        </div>
      )}
    </>
  );

  const containerCommonProps = {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "Chat con LitisBot",
  };

  /* ============ MODO MÓVIL (fullscreen) ============ */
  if (isMobile) {
    return (
      <div
        {...containerCommonProps}
        className="fixed inset-0 z-[9998] flex flex-col bg-white"
        style={{ backgroundColor: "#ffffff", color: "#5C2E0B" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 shadow-md"
          style={{ background: headerBg, color: headerColor }}
        >
          <div className="flex items-center gap-2 text-white font-semibold text-[15px] leading-tight">
            <div
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden"
              style={{ color: "#5C2E0B", fontWeight: "bold", fontSize: "11px" }}
            >
              <img src={litisLogo} alt="LitisBot" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col leading-tight">
              <span>LitisBot</span>
              <span className="text-[11px] font-normal opacity-80">
                {pro ? "Acceso Pro" : "Asistencia básica"}
              </span>
            </div>
          </div>

          <button
            className="text-white font-bold text-xl leading-none px-2"
            onClick={() => {
              stopVoz(); // al cerrar, no dejamos audio colgado
              setIsOpen(false);
            }}
            aria-label="Cerrar chat"
            title="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Feed */}
        <div
          ref={feedRef}
          className="flex-1 min-h-0 w-full overflow-y-auto no-scrollbar px-3 py-3"
          style={{ backgroundColor: "#ffffff" }}
        >
          <div className="flex flex-col gap-4">
            {mensajes.map((m, idx) =>
              m.role === "assistant" ? (
                <div key={idx} className="flex w-full justify-start text-[#5C2E0B]">
                  <MensajeBotBubble
                    msg={m}
                    ttsPrefs={ttsPrefs}
                    onCopy={() => {}}
                    onEdit={(nuevo) =>
                      setMensajes((prev) => {
                        const cl = [...prev];
                        cl[idx] = { ...cl[idx], content: nuevo };
                        return cl;
                      })
                    }
                    onFeedback={(tipo) => console.log("feedback:", tipo)}
                  />
                </div>
              ) : (
                <MensajeUsuarioBubble key={idx} texto={m.content} />
              )
            )}

            {cargando && (
              <div className="flex w-full justify-start">
                <div
                  className="rounded-[1.5rem] shadow text-[15px] max-w-[80%] px-4 py-3"
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(92,46,11,0.15)",
                    color: "#5C2E0B",
                  }}
                >
                  Procesando…
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controles TTS */}
        <div className="px-3 pb-2">
          <TTSControls mensajes={mensajes} ttsPrefs={ttsPrefs} />
        </div>

        {/* Input */}
        <ChatInputBar
          PanelTTS={PanelTTS}
          input={input}
          setInput={setInput}
          cargando={cargando}
          handleKeyDown={handleKeyDown}
          enviarMensaje={enviarMensaje}
        />
      </div>
    );
  }

  /* ============ MODO DESKTOP (card flotante) ============ */
  return (
    <div
      {...containerCommonProps}
      className="fixed z-[9998] flex flex-col rounded-[1rem] shadow-2xl border overflow-hidden bg-white"
      style={{
        borderColor: "rgba(92,46,11,0.3)",
        backgroundColor: "#ffffff",
        color: "#5C2E0B",
        bottom: "96px",
        right: "24px",
        width: "460px",
        maxHeight: "80vh",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: headerBg, color: headerColor }}
      >
        <div className="flex items-center gap-2 text-white font-semibold text-[15px] leading-tight">
          <div
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden"
            style={{ color: "#5C2E0B", fontWeight: "bold", fontSize: "11px" }}
          >
            <img src={litisLogo} alt="LitisBot" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col leading-tight">
            <span>LitisBot</span>
            <span className="text-[11px] font-normal opacity-80">
              {pro ? "Acceso Pro • Estrategia legal avanzada" : "Asistencia básica"}
            </span>
          </div>
        </div>

        <button
          className="text-white font-bold text-xl leading-none px-2"
          onClick={() => {
            stopVoz();
            setIsOpen(false);
          }}
          aria-label="Cerrar chat"
          title="Cerrar"
        >
          ×
        </button>
      </div>

      {/* Feed */}
      <div
        ref={feedRef}
        className="flex-1 min-h-0 w-full overflow-y-auto no-scrollbar px-4 py-4"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="flex flex-col gap-4">
          {mensajes.map((m, idx) =>
            m.role === "assistant" ? (
              <div key={idx} className="flex w-full justify-start text-[#5C2E0B]">
                <MensajeBotBubble
                  msg={m}
                  ttsPrefs={ttsPrefs}
                  onCopy={() => {}}
                  onEdit={(nuevo) =>
                    setMensajes((prev) => {
                      const cl = [...prev];
                      cl[idx] = { ...cl[idx], content: nuevo };
                      return cl;
                    })
                  }
                  onFeedback={(tipo) => console.log("feedback:", tipo)}
                />
              </div>
            ) : (
              <MensajeUsuarioBubble key={idx} texto={m.content} />
            )
          )}

          {cargando && (
            <div className="flex w-full justify-start">
              <div
                className="rounded-[1.5rem] shadow text-[15px] max-w-[80%] px-4 py-3"
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid rgba(92,46,11,0.15)",
                  color: "#5C2E0B",
                }}
              >
                Procesando…
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controles TTS */}
      <div className="px-4 pb-2">
        <TTSControls mensajes={mensajes} ttsPrefs={ttsPrefs} />
      </div>

      {/* Footer */}
      <ChatInputBar
        PanelTTS={PanelTTS}
        input={input}
        setInput={setInput}
        cargando={cargando}
        handleKeyDown={handleKeyDown}
        enviarMensaje={enviarMensaje}
        pro={pro}
      />
    </div>
  );
}

/* ============================================================
   ✍️ Barra de redacción
============================================================ */
function ChatInputBar({
  PanelTTS,
  input,
  setInput,
  cargando,
  handleKeyDown,
  enviarMensaje,
  pro,
}) {
  return (
    <div
      className="flex flex-col gap-2 px-4 py-3 border-t"
      style={{
        borderColor: "rgba(92,46,11,0.2)",
        backgroundColor: "#ffffff",
        flexShrink: 0,
      }}
    >
      <div className="flex items-center gap-2">{PanelTTS}</div>

      <div className="flex items-end gap-3">
        <button
          className="flex items-center justify-center rounded-full w-10 h-10 text-white active:scale-95 transition-transform"
          style={{ background: "#5C2E0B" }}
          title="Adjuntar archivo"
        >
          <FaPaperclip size={18} />
        </button>

        <textarea
          className="flex-1 bg-transparent outline-none border rounded-lg text-[15px] leading-relaxed text-[#5C2E0B] max-h-[160px] overflow-y-auto px-3 py-2"
          style={{
            borderColor: "rgba(92,46,11,0.2)",
            minHeight: "48px",
            backgroundColor: "#ffffff",
          }}
          placeholder={
            pro
              ? "Formula tu consulta jurídica avanzada…"
              : "Escribe tu consulta legal…"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
        />

        <button
          className="flex items-center justify-center rounded-full w-10 h-10 text-white active:scale-95 transition-transform"
          style={{ background: "#5C2E0B" }}
          title="Dictado por voz"
        >
          <FaMicrophone size={18} />
        </button>

        <button
          className={`flex items-center justify-center rounded-full w-10 h-10 text-white active:scale-95 transition-transform ${
            !input.trim() || cargando ? "opacity-50 cursor-not-allowed" : ""
          }`}
          style={{ background: "#5C2E0B" }}
          disabled={!input.trim() || cargando}
          onClick={enviarMensaje}
          title="Enviar"
        >
          <FaPaperPlane size={18} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   🌐 Componente principal flotante LitisBotBubbleChat
   - Drag universal por Pointer Events (móvil/desktop)
   - Sin listeners de mouse sueltos
   - Stop voz al desmontar o cerrar
============================================================ */
export default function LitisBotBubbleChat({ usuarioId, pro }) {
  const isMobile = useIsMobile();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);

  // TTS prefs con persistencia
  const [showTtsCfg, setShowTtsCfg] = useState(false);
  const [ttsPrefs, setTtsPrefs] = useState(
    () => loadTtsPrefs() || { voiceId: "es-ES-AlvaroNeural", rate: 1.0, pitch: 0 }
  );
  useEffect(() => saveTtsPrefs(ttsPrefs), [ttsPrefs]);

  // Carga conversación previa (session)
  const [mensajes, setMensajes] = useState(() => {
    const prev = loadChatSession();
    return Array.isArray(prev) && prev.length
      ? prev
      : [{ role: "assistant", content: "Hola, soy LitisBot. ¿En qué puedo ayudarte hoy? 👋" }];
  });

  // Persistir hilo en sessionStorage
  useEffect(() => {
    saveChatSession(mensajes);
  }, [mensajes]);

  // Stop voz al desmontar
  useEffect(() => {
    return () => stopVoz();
  }, []);

  const feedRef = useRef(null);
  const rafRef = useRef(0);
  const scrollToBottom = useCallback(() => {
    if (!feedRef.current) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    });
  }, []);
  useEffect(() => {
    scrollToBottom();
    return () => cancelAnimationFrame(rafRef.current);
  }, [mensajes, isOpen, scrollToBottom]);

  // ---- Drag universal (mouse + táctil) con Pointer Events ----
  const BUBBLE_SIZE = 60;
  const MARGIN = 12;

  const POS_KEY = "litis_bubble_pos_v1";
  const loadPos = () => {
    try {
      return JSON.parse(localStorage.getItem(POS_KEY) || "null");
    } catch {
      return null;
    }
  };
  const savePos = (p) => {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(p));
    } catch {}
  };

  // Estado de posición (left/top). Si no hay, usamos bottom/right por defecto.
  const [pos, setPos] = useState(() => loadPos() || { x: null, y: null });

  const drag = useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const onPointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    drag.current.active = true;
    drag.current.moved = false;
    drag.current.startX = e.clientX;
    drag.current.startY = e.clientY;
    drag.current.originX = rect.left;
    drag.current.originY = rect.top;
    e.preventDefault(); // evita scroll durante el arrastre
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.current.moved = true;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const newX = clamp(drag.current.originX + dx, MARGIN, vw - BUBBLE_SIZE - MARGIN);
    const newY = clamp(drag.current.originY + dy, MARGIN, vh - BUBBLE_SIZE - MARGIN);

    setPos({ x: newX, y: newY });
  }, []);

  const onPointerUp = useCallback(() => {
    if (!drag.current.active) return;
    if (!drag.current.moved) {
      // tap → abrir chat
      setIsOpen(true);
    } else {
      // drag → persistir posición
      savePos(pos);
    }
    drag.current.active = false;
    drag.current.moved = false;
  }, [pos, setIsOpen]);

  // Placeholder de "pensando…" con índice seguro
  const placeholderIndexRef = useRef(-1);

  // Enviar mensaje
  async function enviarMensaje() {
    if (!input?.trim() || cargando) return;

    const pregunta = input.trim();
    setInput("");
    setCargando(true);

    setMensajes((prev) => {
      const next = [...prev, { role: "user", content: pregunta }];
      placeholderIndexRef.current = next.length;
      next.push({ role: "assistant", content: "Espera un momento…" });
      return next;
    });

    try {
      const data = await enviarMensajeIA({
        prompt: pregunta,
        usuario: usuarioId || "invitado-burbuja",
        expedienteId: "burbuja",
        idioma: "es-PE",
        pais: "Perú",
      });

      setMensajes((prev) => {
        const next = [...prev];
        const idx = placeholderIndexRef.current;
        if (idx >= 0 && idx < next.length && next[idx]?.content === "Espera un momento…") {
          next.splice(idx, 1); // quitamos placeholder en la posición correcta
        }
        next.push({
          role: "assistant",
          content:
            data?.respuesta || data?.text || "No pude generar respuesta. ¿Intentamos de nuevo?",
        });
        placeholderIndexRef.current = -1;
        return next;
      });
    } catch (err) {
      console.error("❌ Error burbuja:", err);
      setMensajes((prev) => {
        const next = [...prev];
        const idx = placeholderIndexRef.current;
        if (idx >= 0 && idx < next.length && next[idx]?.content === "Espera un momento…") {
          next.splice(idx, 1);
        }
        next.push({
          role: "assistant",
          content:
            "Hubo un problema procesando tu consulta. Verifica tu conexión y vuelve a intentarlo.",
        });
        placeholderIndexRef.current = -1;
        return next;
      });
    } finally {
      setCargando(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  }

  // Estilos de posición del FAB
  const bubbleStyle =
    pos.x !== null && pos.y !== null
      ? { left: pos.x, top: pos.y }
      : { bottom: 24, right: 24 };

  return (
    <>
      <ChatWindow
        isOpen={isOpen}
        isMobile={isMobile}
        pro={pro}
        feedRef={feedRef}
        mensajes={mensajes}
        cargando={cargando}
        input={input}
        setInput={setInput}
        handleKeyDown={handleKeyDown}
        enviarMensaje={enviarMensaje}
        setMensajes={setMensajes}
        setIsOpen={setIsOpen}
        ttsPrefs={ttsPrefs}
        showTtsCfg={showTtsCfg}
        setShowTtsCfg={setShowTtsCfg}
        setTtsPrefs={setTtsPrefs}
      />

      {/* FAB (draggable con Pointer Events, móvil/desktop) */}
      <div
        className="fixed z-[9999] flex items-center justify-center rounded-full shadow-xl border bg-white select-none"
        role="button"
        aria-label="Abrir LitisBot"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          borderColor: "rgba(92,46,11,0.3)",
          width: 60,
          height: 60,
          position: "fixed",
          ...bubbleStyle,
          touchAction: "none", // IMPORTANTÍSIMO para arrastre táctil sin scroll
          cursor: "pointer",
        }}
      >
        <img
          src={litisLogo}
          alt="LitisBot"
          className="w-11 h-11 object-contain pointer-events-none"
          draggable={false}
        />
      </div>
    </>
  );
}
