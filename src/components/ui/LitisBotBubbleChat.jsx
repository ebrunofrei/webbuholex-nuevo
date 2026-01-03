// src/components/LitisBotBubbleChat.jsx
/* eslint-disable react/no-danger */
import React,
{
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";

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
  FaSlidersH,
} from "react-icons/fa";

import litisLogo from "@/assets/litisbot-logo.png";
import { enviarMensajeIA } from "@/services/chatClient.js";
import { useNavigate } from "react-router-dom";

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
import LitisBotToolsPanel from "@/components/ui/LitisBotToolsPanel.jsx";
import { applyRatioEngine } from "@/services/ratioEngine";

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

const MAX_ADJUNTOS_FREE = 3;
const MAX_ADJUNTOS_PRO = 10;
const MAX_ADJUNTO_MB = 25; // igual que en ChatBase


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

function isSocialIntentFront(texto = "") {
  const t = String(texto || "").toLowerCase().trim();
  if (!t) return false;

  const identidad =
    /\b(c[oó]mo\s+te\s+llamas|qui[eé]n\s+eres|tu\s+nombre|te\s+puedo\s+llamar|est[aá]\s+bien\s+si\s+te\s+llamo)\b/i.test(texto);

  const saludo =
    /\b(hola|buenas|buenos\s+d[ií]as|buenas\s+tardes|buenas\s+noches|hey|saludos)\b/i.test(texto);

  const smalltalk =
    /\b(gracias|ok|vale|perfecto|listo|genial|excelente|de\s+acuerdo|todo\s+bien|c[oó]mo\s+est[aá]s)\b/i.test(texto);

  const legalSignals =
    /(\bescrito\b|\bdemanda\b|\bapelaci[oó]n\b|\brecurso\b|\bdenuncia\b|\bquerella\b|\bcontrato\b|\bsentencia\b|\bresoluci[oó]n\b|\bagravio\b|\bexpediente\b|\bmedios?\s+probatorios\b|\bcasaci[oó]n\b|\bacuerdo\s+plenario\b|\bprecedente\b)/i.test(
      texto
    );

  const wc = t.split(/\s+/).filter(Boolean).length;
  const isShort = wc <= 12;

  if (legalSignals) return false;
  if (identidad) return true;
  if (isShort && (saludo || smalltalk)) return true;

  return false;
}

function stripMarkdownSyntax(text = "") {
  if (typeof text !== "string") return "";

  let t = text.replace(/\r\n/g, "\n");

  // 1) Quitar headings tipo #, ##, ### al inicio de línea (dejando solo el texto)
  t = t.replace(/^\s{0,3}#{1,6}\s*/gm, "");

  // 2) Quitar separadores horizontales --- *** ___
  t = t.replace(/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/gm, "");

  // 3) Quitar citas tipo "> "
  t = t.replace(/^\s*>\s?/gm, "");

  // 4) Quitar fences ``` pero conservar el contenido interno
  t = t.replace(/```([\s\S]*?)```/g, "$1");
  // y los backticks inline `texto`
  t = t.replace(/`([^`]+)`/g, "$1");

  // 5) Convertir bullets "- " o "* " en "• "
  t = t.replace(/^\s*[-*]\s+/gm, "• ");

  // 6) Compactar saltos de línea excesivos
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

/* ============================================================
   💬 Mensaje del ASISTENTE (burbuja blanca)
============================================================ */
function MensajeBotBubble({
  msg,
  onCopy,
  onEdit,
  onFeedback,
  ttsPrefs,
  onExport,
}) {
  const [editando, setEditando] = useState(false);
  const [editValue, setEditValue] = useState(msg.content || "");
  const [leyendo, setLeyendo] = useState(false);

  async function handleSpeak() {
    if (leyendo) return;
    setLeyendo(true);
    try {
      const plain = toPlain(msg.content || "");
      await reproducirVoz(plain, {
        voz: ttsPrefs?.voiceId || "es-ES-AlvaroNeural",
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
          className="leading-relaxed whitespace-pre-wrap break-words text-[17px] md:text-[18px]"
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
          <button
            style={{ color: "#5C2E0B" }}
            onClick={handleCopiar}
            title="Copiar para Word / PDF"
            aria-label="Copiar"
          >
            <FaRegCopy size={18} />
          </button>

          <button
            style={{ color: "#5C2E0B" }}
            onClick={() => setEditando(true)}
            title="Editar borrador"
            aria-label="Editar"
          >
            <FaRegEdit size={18} />
          </button>

          <button
            style={{ color: "#1d4ed8", fontWeight: 600, fontSize: 13 }}
            onClick={() => onExport && onExport(msg, "docx")}
            title="Descargar en Word"
            aria-label="Descargar en Word"
          >
            Word
          </button>

          <button
            style={{ color: "#b91c1c", fontWeight: 600, fontSize: 13 }}
            onClick={() => onExport && onExport(msg, "pdf")}
            title="Descargar en PDF"
            aria-label="Descargar en PDF"
          >
            PDF
          </button>

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
        className="rounded-[1.5rem] shadow px-4 py-3 text-white text-[17px] md:text-[18px] leading-relaxed font-medium max-w-[88%]"
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
    const raw = obtenerUltimoMensaje(mensajes);
    if (!raw) return;

    const sinMarkdown = stripMarkdownSyntax(raw);

    setReading(true);
    try {
      const textoPlano = toPlain(sinMarkdown);
      await reproducirVoz(textoPlano, {
        voz: ttsPrefs.voiceId,
        rate: Math.round(((ttsPrefs?.rate ?? 1) - 1) * 100) || 0,
        pitch: parseInt(ttsPrefs?.pitch ?? 0, 10) || 0,
      });
    } finally {
      setReading(false);
    }
  }

  async function handleRepeat() {
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
        <FaInfinity className="inline -mt-1 mr-1" />{" "}
        {isLoop ? "Bucle ON" : "Bucle OFF"}
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
   🪟 ChatWindow (no remonta) + a11y + controles TTS + PANEL
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
  usuarioId,
  jurisSeleccionada,
  onClearJuris,
  onNuevoChat,
  onOpenFull,
  onClose,
  activeJurisPrompt,
  pdfJurisContext,
  adjuntos,
  onAttachFile,
  onRemoveAdjunto,
  toolsPanel,
  onOpenTools,
}) {
  if (!isOpen) return null;

  const headerBg = "#5C2E0B";
  const headerColor = "#fff";

  const PanelTTS = (
    <>
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

  // Drag & drop y pegado de archivos para el chat
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      if (!onAttachFile) return;
      const file = e.dataTransfer?.files?.[0];
      if (file) onAttachFile(file);
    },
    [onAttachFile]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handlePaste = useCallback(
    (e) => {
      if (!onAttachFile) return;
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            onAttachFile(file);
            break;
          }
        }
      }
    },
    [onAttachFile]
  );

  const containerCommonProps = {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "Chat con LitisBot",
    onDrop: handleDrop,
    onDragOver: handleDragOver,
    onPaste: handlePaste,
  };

  /* ============ MODO MÓVIL (fullscreen) ============ */
  if (isMobile) {
    return (
      <>
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
                style={{
                  color: "#5C2E0B",
                  fontWeight: "bold",
                  fontSize: "11px",
                }}
              >
                <img
                  src={litisLogo}
                  alt="LitisBot"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span>LitisBot</span>
                <span className="text-[11px] font-normal opacity-80">
                  {pro ? "Acceso Pro" : "Asistencia básica"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                className="text-white text-lg px-2"
                onClick={onOpenTools}
                aria-label="Abrir panel de herramientas"
                title="Panel de herramientas"
              >
                <FaSlidersH />
              </button>

              <button
                className="text-white font-bold text-xl leading-none px-2"
                onClick={() => {
                  stopVoz();
                  onClose ? onClose() : setIsOpen(false);
                }}
                aria-label="Cerrar chat"
                title="Cerrar"
              >
                ×
              </button>
            </div>
          </div>

          {/* Contenido: feed + TTS + input */}
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Feed */}
            <div
              ref={feedRef}
              className="flex-1 min-h-0 w-full overflow-y-auto no-scrollbar px-3 py-3"
              style={{ backgroundColor: "#ffffff" }}
            >
              <div className="flex flex-col gap-4">
                {jurisSeleccionada && (
                  <div className="mb-1 rounded-lg border border-amber-200 bg-[#fff7ec] px-3 py-2.5 text-[11px] text-amber-900">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-800 mb-0.5">
                          Estás trabajando con:
                        </p>
                        <p className="text-[11px] font-semibold text-amber-900 line-clamp-2">
                          {jurisSeleccionada.titulo ||
                            jurisSeleccionada.nombre ||
                            jurisSeleccionada.sumilla ||
                            "Resolución sin título"}
                        </p>
                        {(jurisSeleccionada.numeroExpediente ||
                          jurisSeleccionada.expediente) && (
                          <p className="text-[10px] text-amber-800 mt-0.5">
                            Exp.{" "}
                            {jurisSeleccionada.numeroExpediente ||
                              jurisSeleccionada.expediente}
                          </p>
                        )}
                      </div>

                      {onClearJuris && (
                        <button
                          type="button"
                          onClick={onClearJuris}
                          className="ml-2 inline-flex items-center rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-50"
                        >
                          Cambiar
                        </button>
                      )}
                    </div>

                    {activeJurisPrompt ? (
                      <p className="mt-1 text-[10px] text-amber-800">
                        Sugerencia IA:{" "}
                        <span className="font-medium">
                          {activeJurisPrompt.length > 120
                            ? activeJurisPrompt.slice(0, 117) + "…"
                            : activeJurisPrompt}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] text-amber-800">
                        Todo lo que preguntes ahora se analizará tomando en
                        cuenta esta sentencia. Si quieres cambiar de caso, toca
                        en “Cambiar”.
                      </p>
                    )}
                  </div>
                )}

                {mensajes.map((m, idx) => {
                  // mensaje especial de PDF
                  if (m.tipo === "pdf") {
                    return (
                      <div key={idx} className="flex justify-end w-full">
                        <div
                          className="rounded-xl px-3 py-2 shadow text-white text-[14px] flex items-center gap-2"
                          style={{ background: "#5C2E0B" }}
                        >
                          <span role="img" aria-label="PDF">
                            📄
                          </span>
                          <span className="truncate max-w-[220px]">
                            {m.filename}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  if (m.role === "assistant") {
                    return (
                      <div
                        key={idx}
                        className="flex w-full justify-start text-[#5C2E0B]"
                      >
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
                          onExport={handleExportMensaje}
                        />
                      </div>
                    );
                  }

                  return <MensajeUsuarioBubble key={idx} texto={m.content} />;
                })}

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

            <div className="px-3 pb-2">
              <TTSControls mensajes={mensajes} ttsPrefs={ttsPrefs} />
            </div>

            <ChatInputBar
              PanelTTS={PanelTTS}
              input={input}
              setInput={setInput}
              cargando={cargando}
              handleKeyDown={handleKeyDown}
              enviarMensaje={enviarMensaje}
              pro={pro}
              onAttachFile={onAttachFile}
              pdfJurisContext={pdfJurisContext}
              onRemoveAdjunto={onRemoveAdjunto}
              adjuntos={adjuntos}
            />
          </div>
        </div>

        {toolsPanel}
      </>
    );
  }

  // Inferir tipo de documento a partir del contenido del mensaje
  function inferTipoDocumentoFromContent(html) {
    const t = prepararTextoParaCopia(html || "").toUpperCase();

    if (t.includes("DEMANDA") && t.includes("PETITORIO")) {
      return "Demanda";
    }
    if (
      t.includes("RECURSO DE APELACION") ||
      t.includes("RECURSO DE APELACIÓN")
    ) {
      return "Recurso_Apelacion";
    }
    if (
      t.includes("RECURSO DE CASACION") ||
      t.includes("RECURSO DE CASACIÓN")
    ) {
      return "Recurso_Casacion";
    }
    if (t.includes("CONTESTACION") || t.includes("CONTESTACIÓN")) {
      return "Contestacion_Demanda";
    }
    if (t.includes("INFORME")) {
      return "Informe";
    }

    return "Borrador_LitisBot";
  }

  async function handleExportMensaje(msg, formato) {
    try {
      const textoPlano = prepararTextoParaCopia(msg.content || "");
      const tipoDocumento = inferTipoDocumentoFromContent(msg.content || "");

      const expediente =
        (jurisSeleccionada &&
          (jurisSeleccionada.numeroExpediente ||
            jurisSeleccionada.expediente)) ||
        "";

      const etiqueta =
        (jurisSeleccionada &&
          (jurisSeleccionada.especialidad ||
            jurisSeleccionada.materia ||
            jurisSeleccionada.organo)) ||
        "";

      const resp = await fetch(`/api/export/${formato}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: textoPlano,
          tipoDocumento,
          expediente,
          etiqueta,
        }),
      });

      const data = await resp.json();
      if (data?.ok && data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        console.error("Respuesta inesperada al exportar", data);
      }
    } catch (err) {
      console.error("Error exportando borrador:", err);
    }
  }

  /* ============ MODO DESKTOP (card flotante) ============ */
  return (
    <>
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
              style={{
                color: "#5C2E0B",
                fontWeight: "bold",
                fontSize: "11px",
              }}
            >
              <img
                src={litisLogo}
                alt="LitisBot"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span>LitisBot</span>
              <span className="text-[11px] font-normal opacity-80">
                {pro
                  ? "Acceso Pro • Estrategia legal avanzada"
                  : "Asistencia básica"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="text-white text-lg px-2"
              onClick={onOpenTools}
              aria-label="Abrir panel de herramientas"
              title="Panel de herramientas"
            >
              <FaSlidersH />
            </button>

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
        </div>

        {/* Feed */}
        <div
          ref={feedRef}
          className="flex-1 min-h-0 w-full overflow-y-auto no-scrollbar px-4 py-4"
          style={{ backgroundColor: "#ffffff" }}
        >
          <div className="flex flex-col gap-4">
            {jurisSeleccionada && (
              <div className="mb-1 rounded-lg border border-amber-200 bg-[#fff7ec] px-3 py-2.5 text-[11px] text-amber-900">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-800 mb-0.5">
                      Estás trabajando con:
                    </p>
                    <p className="text-[11px] font-semibold text-amber-900 line-clamp-2">
                      {jurisSeleccionada.titulo ||
                        jurisSeleccionada.nombre ||
                        jurisSeleccionada.sumilla ||
                        "Resolución sin título"}
                    </p>
                    {(jurisSeleccionada.numeroExpediente ||
                      jurisSeleccionada.expediente) && (
                      <p className="text-[10px] text-amber-800 mt-0.5">
                        Exp.{" "}
                        {jurisSeleccionada.numeroExpediente ||
                          jurisSeleccionada.expediente}
                      </p>
                    )}
                  </div>

                  {onClearJuris && (
                    <button
                      type="button"
                      onClick={onClearJuris}
                      className="ml-2 inline-flex items-center rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-50"
                    >
                      Cambiar
                    </button>
                  )}
                </div>

                {activeJurisPrompt && (
                  <p className="mt-1 text-[10px] text-amber-800">
                    Sugerencia IA:{" "}
                    <span className="font-medium">
                      {activeJurisPrompt.length > 140
                        ? activeJurisPrompt.slice(0, 137) + "…"
                        : activeJurisPrompt}
                    </span>
                  </p>
                )}

                {!activeJurisPrompt && (
                  <p className="mt-1 text-[10px] text-amber-800">
                    Todo lo que preguntes ahora se analizará tomando en cuenta
                    esta sentencia. Si quieres cambiar de caso, usa “Cambiar” o
                    selecciona otra resolución.
                  </p>
                )}
              </div>
            )}

            {mensajes.map((m, idx) => {
              // Mensaje especial: PDF enviado por el usuario
              if (m.tipo === "pdf") {
                return (
                  <div key={idx} className="flex justify-end w-full">
                    <div
                      className="rounded-xl px-3 py-2 shadow text-white text-[14px] flex items-center gap-2"
                      style={{ background: "#5C2E0B" }}
                    >
                      <span role="img" aria-label="PDF">
                        📄
                      </span>
                      <span className="truncate max-w-[240px]">
                        {m.filename}
                      </span>
                    </div>
                  </div>
                );
              }

              // Mensaje del asistente
              if (m.role === "assistant") {
                return (
                  <div
                    key={idx}
                    className="flex w-full justify-start text-[#5C2E0B]"
                  >
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
                      onExport={handleExportMensaje}
                    />
                  </div>
                );
              }

              // Mensaje normal del usuario (texto)
              return <MensajeUsuarioBubble key={idx} texto={m.content} />;
            })}

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

        <div className="px-4 pb-2">
          <TTSControls mensajes={mensajes} ttsPrefs={ttsPrefs} />
        </div>

        <ChatInputBar
          PanelTTS={PanelTTS}
          input={input}
          setInput={setInput}
          cargando={cargando}
          handleKeyDown={handleKeyDown}
          enviarMensaje={enviarMensaje}
          pro={pro}
          onAttachFile={onAttachFile}
          pdfJurisContext={pdfJurisContext}
          onRemoveAdjunto={onRemoveAdjunto}
          adjuntos={adjuntos}
        />
      </div>

      {toolsPanel}
    </>
  );
}

/* ============================================================ 
   ✍️ Barra de redacción (chip arriba, texto abajo, botones fijos)
============================================================ */
function ChatInputBar({
  PanelTTS,
  input,
  setInput,
  cargando,
  handleKeyDown,
  enviarMensaje,
  pro,
  onAttachFile,
  pdfJurisContext,
  onRemoveAdjunto,
  adjuntos = [],
}) {
  const fileInputRef = useRef(null);

  const texto = input || "";
  const hasText = texto.trim().length > 0;

  const hasAdjuntos = Array.isArray(adjuntos) && adjuntos.length > 0;

  const maxAdjuntos = pro ? MAX_ADJUNTOS_PRO : MAX_ADJUNTOS_FREE;
  const maxBytes = MAX_ADJUNTO_MB * 1024 * 1024;
  const canSend = hasText || hasAdjuntos;

  const handleAttachClick = () => {
    if (!fileInputRef.current || cargando || !onAttachFile) return;
    // importante: limpiar value para permitir adjuntar el mismo archivo otra vez
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    if (!onAttachFile) return;

    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // cuántos puedo agregar todavía según plan
    const restantes = Math.max(maxAdjuntos - adjuntos.length, 0);
    if (restantes <= 0) {
      // aquí luego puedes disparar un toast “Límite de adjuntos alcanzado”
      return;
    }

    const seleccionados = files.slice(0, restantes);

    seleccionados.forEach((file) => {
      if (file.size > maxBytes) {
        // aquí también puedes poner un toast si quieres
        console.warn(
          `[LitisBotBubble] "${file.name}" supera ${MAX_ADJUNTO_MB} MB y se ignora`
        );
        return;
      }
      onAttachFile(file); // 👈 siempre AÑADE, nunca reemplaza
    });
  };

  const handleChangeInput = (e) => {
    setInput(e.target.value);
  };

  const handleEnviarClick = () => {
    if (!canSend || cargando) return;
    enviarMensaje();
  };

  return (
    <div
      className="flex flex-col gap-2 px-4 py-3 border-t"
      style={{
        borderColor: "rgba(92,46,11,0.2)",
        backgroundColor: "#ffffff",
        flexShrink: 0,
      }}
    >
      {/* Panel de configuración TTS */}
      <div className="flex items-center gap-2">{PanelTTS}</div>

      <div className="flex items-end gap-3">
        {/* Botón Adjuntar */}
        <button
          type="button"
          className="flex-shrink-0 flex items-center justify-center rounded-full w-10 h-10 text-white active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "#5C2E0B" }}
          title="Adjuntar archivo"
          onClick={handleAttachClick}
          disabled={cargando || !onAttachFile || adjuntos.length >= maxAdjuntos}
        >
          <FaPaperclip size={18} />
        </button>

        {/* Input file real (oculto) */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={handleFileChange}
        />

        {/* Caja de texto + chips de adjuntos */}
        <div
          className="flex-1 min-w-0 rounded-2xl px-3 py-2 flex flex-col gap-1"
          style={{
            border: "1px solid rgba(92,46,11,0.2)",
            backgroundColor: "#ffffff",
          }}
        >
          {/* Chips de adjuntos */}
          {hasAdjuntos && (
            <div className="flex flex-wrap gap-1 mb-1">
              {adjuntos.map((file, idx) => {
                const name = file?.name || `Archivo ${idx + 1}`;
                const mime = file?.type || "";
                const isPdfChip =
                  mime === "application/pdf" || /\.pdf$/i.test(name);

                const handleRemoveClick = () => {
                  if (!onRemoveAdjunto || cargando) return;
                  onRemoveAdjunto(idx);
                };

                return (
                  <div
                    key={`${name}-${idx}`}
                    className="
                      inline-flex items-center gap-2 px-2 py-1 rounded-xl
                      max-w-[70%] overflow-hidden
                    "
                    style={{ backgroundColor: "#f5f5f5" }}
                  >
                    <div
                      className="flex items-center justify-center w-7 h-7 rounded-lg text-[10px] font-bold text-white flex-shrink-0"
                      style={{
                        backgroundColor: isPdfChip ? "#F97373" : "#6B7280",
                      }}
                    >
                      {isPdfChip ? "PDF" : "FILE"}
                    </div>

                    <span
                      className="text-[13px] text-gray-800 truncate max-w-full"
                      title={name}
                    >
                      {name}
                    </span>

                    {/* X solo cuando no estamos enviando */}
                    {onRemoveAdjunto && !cargando && (
                      <button
                        type="button"
                        onClick={handleRemoveClick}
                        className="text-[11px] text-gray-500 hover:text-gray-800 flex-shrink-0"
                        aria-label="Quitar este archivo adjunto"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Textarea */}
          <textarea
            className="
              w-full bg-transparent outline-none border-none resize-none
              text-[16px] md:text-[17px] leading-relaxed text-[#5C2E0B]
              max-h-[96px] overflow-y-auto
            "
            style={{ minHeight: "40px" }}
            placeholder={
              pro
                ? "Define tu objetivo procesal, adjunta pruebas o pega links."
                : "Escribe tu consulta legal…"
            }
            value={input}
            onChange={handleChangeInput}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        </div>

        {/* Micrófono (a futuro, aún sin conectar) */}
        <button
          type="button"
          className="flex-shrink-0 flex items-center justify-center rounded-full w-10 h-10 text-white active:scale-95 transition-transform"
          style={{ background: "#5C2E0B" }}
          title="Dictado por voz"
        >
          <FaMicrophone size={18} />
        </button>

        {/* Enviar */}
        <button
          type="button"
          className={`flex-shrink-0 flex items-center justify-center rounded-full w-10 h-10 text-white active:scale-95 transition-transform ${
            !canSend || cargando ? "opacity-50 cursor-not-allowed" : ""
          }`}
          style={{ background: "#5C2E0B" }}
          disabled={!canSend || cargando}
          onClick={handleEnviarClick}
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
   - Stop voz al desmontar o cerrar
============================================================ */
export default function LitisBotBubbleChat({
  modoEscritorio = false,
  usuarioId,
  pro = false,
  jurisSeleccionada,
  onClearJuris,
  user,
}) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(modoEscritorio ? true : false);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const [pdfJurisContext, setPdfJurisContext] = useState(null);
  const [adjuntos, setAdjuntos] = useState([]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const [showTtsCfg, setShowTtsCfg] = useState(false);
  const [ttsPrefs, setTtsPrefs] = useState(
    () =>
      loadTtsPrefs() || {
        voiceId: "es-ES-AlvaroNeural",
        rate: 1.0,
        pitch: 0,
      }
  );

  useEffect(() => {
    saveTtsPrefs(ttsPrefs);
  }, [ttsPrefs]);

  const [mensajes, setMensajes] = useState(() => {
    const prev = loadChatSession();
    if (Array.isArray(prev) && prev.length > 0) return prev;
    return [
      {
        role: "assistant",
        content: "Hola 👋 ¿Cómo vamos?"
      },
    ];
  });

  const activeJurisPrompt = useMemo(() => {
    if (!jurisSeleccionada) return "";
    const raw =
      jurisSeleccionada.litisPrompt || jurisSeleccionada.promptInicial || "";
    if (!raw || typeof raw !== "string") return "";
    return raw.trim();
  }, [jurisSeleccionada]);

  useEffect(() => {
    saveChatSession(mensajes);
  }, [mensajes]);

  useEffect(() => {
    if (!IS_BROWSER) return;

    if (!jurisSeleccionada) {
      try {
        window.sessionStorage.removeItem("litis:lastJurisSeleccionada");
      } catch {
        /* ignore */
      }
      return;
    }

    try {
      const copia = { ...jurisSeleccionada };
      window.sessionStorage.setItem(
        "litis:lastJurisSeleccionada",
        JSON.stringify(copia)
      );
    } catch (e) {
      console.warn("[LitisBotBubble] No se pudo guardar jurisSeleccionada:", e);
    }
  }, [jurisSeleccionada]);

  useEffect(() => {
    return () => {
      stopVoz();
    };
  }, []);

  async function handleAttachFile(file) {
    if (!file) return;

    setAdjuntos((prev) => [...prev, file]);

    setPdfJurisContext((prev) => ({
      ...(prev || {}),
      filename: file.name,
    }));
  }

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

  const lastPromptRef = useRef(null);

  useEffect(() => {
    if (!activeJurisPrompt) {
      lastPromptRef.current = null;
      return;
    }
    if (lastPromptRef.current === activeJurisPrompt) return;

    setInput((prev) => {
      if (prev && prev.trim() !== "") {
        lastPromptRef.current = activeJurisPrompt;
        return prev;
      }
      lastPromptRef.current = activeJurisPrompt;
      return activeJurisPrompt;
    });
  }, [activeJurisPrompt, setInput]);

  const lastJurisIdRef = useRef(null);
  const checkedReloadRef = useRef(false);

  useEffect(() => {
    const doc = jurisSeleccionada;

    if (!doc) {
      lastJurisIdRef.current = null;
      return;
    }

    if (IS_BROWSER && !checkedReloadRef.current) {
      checkedReloadRef.current = true;

      try {
        const navEntries = performance.getEntriesByType("navigation");
        const navType = navEntries && navEntries[0] && navEntries[0].type;

        if (navType === "reload") {
          const initialId =
            doc._id ||
            doc.id ||
            doc.numeroExpediente ||
            doc.jurisprudenciaId ||
            null;

          lastJurisIdRef.current = initialId;
          return;
        }
      } catch {
        /* ignore */
      }
    }

    const currentId =
      doc._id ||
      doc.id ||
      doc.numeroExpediente ||
      doc.jurisprudenciaId ||
      null;

    if (!currentId) {
      if (!lastJurisIdRef.current) {
        lastJurisIdRef.current = "__no_id__";
        setIsOpen(true);
      }
      return;
    }

    if (lastJurisIdRef.current === currentId) return;

    lastJurisIdRef.current = currentId;
    setIsOpen(true);
  }, [jurisSeleccionada, setIsOpen]);

  const BUBBLE_SIZE = 60;
  const MARGIN = 12;
  const POS_KEY = "litis_bubble_pos_v1";

  const loadPos = () => {
    if (!IS_BROWSER) return null;
    try {
      return JSON.parse(window.localStorage.getItem(POS_KEY) || "null");
    } catch {
      return null;
    }
  };

  const savePos = (p) => {
    if (!IS_BROWSER) return;
    try {
      window.localStorage.setItem(POS_KEY, JSON.stringify(p));
    } catch {}
  };

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
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.current.moved = true;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const newX = clamp(
      drag.current.originX + dx,
      MARGIN,
      vw - BUBBLE_SIZE - MARGIN
    );
    const newY = clamp(
      drag.current.originY + dy,
      MARGIN,
      vh - BUBBLE_SIZE - MARGIN
    );

    setPos({ x: newX, y: newY });
  }, []);

  const onPointerUp = useCallback(() => {
    if (!drag.current.active) return;
    if (!drag.current.moved) {
      setIsOpen(true);
    } else {
      savePos(pos);
    }
    drag.current.active = false;
    drag.current.moved = false;
  }, [pos]);

  const placeholderIndexRef = useRef(-1);

  function buildJurisPlainText(doc) {
    if (!doc) return "";

    const partes = [];

    if (doc.titulo || doc.nombre) {
      partes.push(`TÍTULO: ${doc.titulo || doc.nombre}`);
    }

    if (doc.numeroExpediente || doc.numero) {
      partes.push(`EXPEDIENTE: ${doc.numeroExpediente || doc.numero}`);
    }

    if (doc.sala || doc.organo || doc.salaSuprema) {
      partes.push(
        `ÓRGANO / SALA: ${doc.sala || doc.organo || doc.salaSuprema}`
      );
    }

    if (doc.especialidad || doc.materia) {
      partes.push(
        `ESPECIALIDAD / MATERIA: ${doc.especialidad || doc.materia}`
      );
    }

    if (doc.fechaResolucion || doc.fecha) {
      partes.push(`FECHA: ${doc.fechaResolucion || doc.fecha}`);
    }

    if (doc.fuente) {
      partes.push(`FUENTE: ${doc.fuente}`);
    }

    if (doc.sumilla) {
      partes.push(`SUMILLA:\n${doc.sumilla}`);
    }

    if (doc.resumen) {
      partes.push(`RESUMEN:\n${doc.resumen}`);
    }

    if (doc.litisContext) {
      partes.push(`CONTEXTO SELECCIONADO PARA ANÁLISIS:\n${doc.litisContext}`);
    }

    if (doc.litisMeta && typeof doc.litisMeta === "object") {
      const metaLines = [];
      for (const [k, v] of Object.entries(doc.litisMeta)) {
        if (v == null || v === "") continue;
        metaLines.push(`${k}: ${v}`);
      }
      if (metaLines.length) {
        partes.push(
          `METADATOS DE LA RESOLUCIÓN:\n${metaLines.join("\n")}`
        );
      }
    }

    return partes.join("\n\n").trim();
  }

  // Enviar mensaje desde la burbuja
  // - Si se pasa `textoForzado`, se usa ese (acciones rápidas IA)
  // - Si no, se usa el contenido del input
  async function enviarMensaje(textoForzado) {
    if (cargando) return;

    // 1️⃣ Resolver texto a enviar
    const texto =
      typeof textoForzado === "string" && textoForzado.trim().length > 0
        ? textoForzado.trim()
        : (input || "").trim();

    if (!texto) return;

    // 2️⃣ Detectar SI YA HAY un PDF adjunto en este momento
    const pdfAdjunto = adjuntos.find(
      (f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name || "")
    );

    // 3️⃣ Limpiar SIEMPRE el input visual, venga de donde venga el texto
    setInput("");

    // 4️⃣ Marcar estado de carga
    setCargando(true);

    // 5️⃣ Mensajes: texto del user + (opcional) mensaje-PDF + placeholder
    setMensajes((prev) => {
      const next = [...prev];

      // Mensaje de texto del usuario
      next.push({ role: "user", content: texto });

      // mensaje de "archivo enviado" (para el historial)
      if (pdfAdjunto) {
        next.push({
          role: "user",
          tipo: "pdf",
          filename: pdfAdjunto.name,
          url: null,
        });
      }

      // placeholder "Espera un momento…"
      placeholderIndexRef.current = next.length;
      next.push({
        role: "assistant",
        content: "Espera un momento…",
        _placeholder: true,
      });

      return next;
    });

    try {
      // 6️⃣ Resolver la sentencia a usar: prop → sessionStorage
      let docJuris = jurisSeleccionada || null;

      if (!docJuris && IS_BROWSER) {
        try {
          const raw = window.sessionStorage.getItem(
            "litis:lastJurisSeleccionada"
          );
          if (raw) {
            docJuris = JSON.parse(raw);
          }
        } catch (e) {
          console.warn(
            "[LitisBotBubble] No se pudo leer juris de sessionStorage:",
            e
          );
        }
      }

      console.log(
        "[LitisBotBubble] docJuris usado en enviarMensaje:",
        docJuris
      );

      // 7️⃣ Procesamiento PDF antes de construir el payload IA
      let pdfCtx = pdfJurisContext;

      // Si hay PDF adjunto y todavía NO se ha procesado → procesarlo ahora
      if (pdfAdjunto && !pdfCtx?.jurisTextoBase) {
        try {
          const fd = new FormData();
          fd.append("file", pdfAdjunto);

          const resp = await fetch("/api/pdf/juris-context", {
            method: "POST",
            body: fd,
          });

          if (!resp.ok) {
            throw new Error("Servidor devolvió " + resp.status);
          }

          const data = await resp.json();

          if (!data?.ok || !data.jurisTextoBase) {
            throw new Error("respuesta inválida");
          }

          pdfCtx = {
            jurisTextoBase: data.jurisTextoBase,
            meta: data.meta,
            filename: pdfAdjunto.name,
          };

          setPdfJurisContext(pdfCtx);
        } catch (err) {
          console.error("❌ Error procesando PDF:", err);

          // limpiar placeholder y mostrar error
          setMensajes((prev) => {
            const next = [...prev];
            const idx = placeholderIndexRef.current;

            if (
              idx >= 0 &&
              idx < next.length &&
              next[idx]?._placeholder &&
              next[idx]?.content === "Espera un momento…"
            ) {
              next.splice(idx, 1);
            }

            next.push({
              role: "assistant",
              content:
                "No pude procesar el PDF en este momento (error interno del servidor). Intenta nuevamente más tarde.",
            });

            placeholderIndexRef.current = -1;
            return next;
          });

          setCargando(false);
          return;
        }
      }

      // 8️⃣ IDs y contexto de la jurisprudencia (interna + PDF usuario)
      const jurisId =
        docJuris?.id || docJuris?._id || docJuris?.jurisprudenciaId || null;

      const expedienteId =
        docJuris?.numeroExpediente ||
        pdfCtx?.meta?.numeroExpediente ||
        jurisId ||
        `juris-${Date.now()}`;

      // Texto base para ratioEngine
      let jurisTextoBase = "";

      if (pdfCtx?.jurisTextoBase) {
        jurisTextoBase = pdfCtx.jurisTextoBase;
      } else if (docJuris && typeof docJuris === "object") {
        jurisTextoBase = buildJurisPlainText(docJuris);
      }

      const hasJurisSource = !!jurisTextoBase || !!jurisId;

      // 9️⃣ Payload a IA
      const payload = {
        prompt: texto,
        usuarioId: usuarioId || "invitado-burbuja",
        expedienteId: expedienteId || null,
        idioma: "es-PE",
        pais: "Perú",
        modo: hasJurisSource ? "jurisprudencia" : "general",
        materia:
          docJuris?.especialidad ||
          docJuris?.materia ||
          pdfCtx?.meta?.especialidad ||
          "general",
        ratioEngine: hasJurisSource,
      };

      if (jurisId) {
        payload.jurisprudenciaId = String(jurisId);
      }
      if (jurisTextoBase) {
        payload.jurisTextoBase = jurisTextoBase;
      }

      if (pdfCtx?.jurisTextoBase) {
        payload.origenJuris = "pdfUsuario";
      } else if (docJuris) {
        payload.origenJuris = "repositorioInterno";
      }

      if (docJuris?.litisContext) {
        payload.jurisContext = docJuris.litisContext;
      }
      if (docJuris?.litisMeta) {
        payload.jurisMeta = docJuris.litisMeta;
      }
      if (docJuris?.litisSource) {
        payload.jurisSource = docJuris.litisSource;
      }
      if (docJuris?.litisContextId) {
        payload.jurisContextId = docJuris.litisContextId;
      }

      console.log(
        "[LitisBotBubble] Payload a /ia/chat:",
        JSON.stringify(payload, null, 2)
      );

      // 🔟 Llamar a IA
      const data = await enviarMensajeIA(payload);

      const respuestaTexto =
        (data?.respuesta || data?.text || "").toString().trim() ||
        "No pude generar respuesta. ¿Intentamos de nuevo?";

      // Reemplazar placeholder por respuesta real
      setMensajes((prev) => {
        const next = [...prev];
        const idx = placeholderIndexRef.current;

        if (
          idx >= 0 &&
          idx < next.length &&
          next[idx]?._placeholder &&
          next[idx]?.content === "Espera un momento…"
        ) {
          next.splice(idx, 1);
        }

        next.push({ role: "assistant", content: respuestaTexto });
        placeholderIndexRef.current = -1;
        return next;
      });

      if (onClearJuris) {
        onClearJuris();
      }
    } catch (err) {
      console.error("❌ Error burbuja LitisBot:", err);

      setMensajes((prev) => {
        const next = [...prev];
        const idx = placeholderIndexRef.current;

        if (
          idx >= 0 &&
          idx < next.length &&
          next[idx]?._placeholder &&
          next[idx]?.content === "Espera un momento…"
        ) {
          next.splice(idx, 1);
        }

        next.push({
          role: "assistant",
          content:
            "Ocurrió un error al procesar tu consulta. Por favor, intenta nuevamente.",
        });

        placeholderIndexRef.current = -1;
        return next;
      });
    } finally {
      // El PDF ya "viajó": sacamos el chip del input, pero
      // mantenemos pdfJurisContext para contexto en siguientes preguntas
      setAdjuntos([]);
      setCargando(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  }

    function handleNuevoChat() {
    const nuevoChatId = `chat-${Date.now()}`;

    const nuevoChat = {
      id: nuevoChatId,
      nombre: "Nuevo chat",   // nombre temporal
      tipo: "chat",
      creadoEn: Date.now(),
    };

    // Guardar en el historial de casos/chats
    setCasos(prev => [nuevoChat, ...prev]);

    // Crear historial vacío
    setHistorialPorChat(prev => ({
      ...prev,
      [nuevoChatId]: [],
    }));

    // Activar este chat
    setChatIdActivo(nuevoChatId);
    setModoVista("chat");

    // Saludo dinámico
    const saludo = buildWelcomeMessage(user);

    setHistorialPorChat(prev => ({
      ...prev,
      [nuevoChatId]: [
        {
          role: "assistant",
          content: saludo,
          meta: { system: true },
        },
      ],
    }));
  }

  const bubbleStyle =
    pos.x !== null && pos.y !== null
      ? { left: pos.x, top: pos.y }
      : { bottom: 24, right: 24 };

    const handleOpenFull = useCallback(() => {
    if (!IS_BROWSER) return;

    if (isMobile) {
      // En móvil: seguimos usando el modal flotante, no cambiamos de ruta
      setIsOpen(true);
      return;
    }

    // En escritorio: entramos al modo estudio dentro de la Oficina Virtual
    navigate("/oficinavirtual/chat-pro");
  }, [isMobile, navigate, setIsOpen]);

  const toolsPanel = (
    <LitisBotToolsPanel
      open={toolsOpen}
      onClose={() => setToolsOpen(false)}
      isPro={pro}
      usuarioId={usuarioId || "Invitado"}
      hasJuris={!!jurisSeleccionada}
      onNuevoChat={handleNuevoChat}
      onToggleTtsCfg={() => setShowTtsCfg((v) => !v)}
      onOpenFull={handleOpenFull}
    />
  );

  const handleRemoveAdjunto = useCallback((index) => {
    setAdjuntos((prev) => {
      const toRemove = prev[index];
      const next = prev.filter((_, i) => i !== index);

      const isPdfRemoved =
        toRemove &&
        (toRemove.type === "application/pdf" ||
          /\.pdf$/i.test(toRemove.name || ""));

      if (isPdfRemoved) {
        setPdfJurisContext(null);
      }

      return next;
    });
  }, []);

  const handleOpenTools = useCallback(() => {
    setToolsOpen(true);
  }, []);

  return (
    <>
      <ChatWindow
        isOpen={isOpen}
        onClose={handleClose}
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
        usuarioId={usuarioId}
        jurisSeleccionada={jurisSeleccionada}
        onClearJuris={onClearJuris}
        onNuevoChat={handleNuevoChat}
        onOpenFull={handleOpenFull}
        activeJurisPrompt={activeJurisPrompt}
        pdfJurisContext={pdfJurisContext}
        adjuntos={adjuntos}
        onAttachFile={handleAttachFile}
        onRemoveAdjunto={handleRemoveAdjunto}
        toolsPanel={toolsPanel}
        onOpenTools={handleOpenTools}
      />

      <div
        className="fixed z-[9999] flex items-center justify-center rounded-full shadow-xl border select-none litis-bubble-pulse"
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
          touchAction: "none",
          cursor: "pointer",
        }}
      >
        <img
          src={litisLogo}
          alt="LitisBot"
          className="W-11 h-11 object-contain pointer-events-none"
          draggable={false}
        />
      </div>
    </>
  );
}
