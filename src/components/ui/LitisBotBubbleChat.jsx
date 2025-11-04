// src/components/LitisBotBubbleChat.jsx
import { API_BASE } from "@/services/apiBase";
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
} from "react-icons/fa";
import litisLogo from "@/assets/litisbot-logo.png";
import { enviarMensajeIA } from "@/services/chatClient.js";


/* ============================================================
   ⚙️ Preferencias TTS (voz, velocidad, tono) + storage
============================================================ */
const VOICES = [
  { id: "es-ES-AlvaroNeural", label: "Álvaro (varón, ES-ES)" },
  { id: "es-ES-ElviraNeural", label: "Elvira (mujer, ES-ES)" },
  { id: "es-MX-JorgeNeural", label: "Jorge (varón, ES-MX)" },
  { id: "es-MX-DaliaNeural", label: "Dalia (mujer, ES-MX)" },
];

const TTS_STORE_KEY = "ttsPrefs";

function loadTtsPrefs() {
  try {
    const raw = localStorage.getItem(TTS_STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveTtsPrefs(prefs) {
  try {
    localStorage.setItem(TTS_STORE_KEY, JSON.stringify(prefs));
  } catch {}
}

/* ============================================================
   🔊 Texto → voz (POST /api/voz) con preferencias
============================================================ */
async function reproducirVozServidor(textoPlano, opts) {
  try {
    const API_BASE =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

    const clean = (textoPlano || "").trim();
    if (!clean) return;

    // Mezcla de preferencias guardadas + overrides recibidos
    const persisted =
      loadTtsPrefs() || { voiceId: "es-ES-AlvaroNeural", rate: 1.0, pitch: 0 };
    const prefs = { ...persisted, ...(opts || {}) };

    // Back acepta: texto, voz, rate, pitch
    const resp = await fetch(`${API_BASE}/voz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texto: clean,
        voz: prefs.voiceId,
        rate: prefs.rate, // 1.0=100%, 1.15=115% (el back lo normaliza a %)
        pitch: prefs.pitch, // semitonos (-6..+6)
      }),
    });

    if (!resp.ok) {
      console.warn("⚠️ No se pudo generar voz:", resp.status);
      // Si el backend devolvió JSON de error, para debugging:
      try {
        const j = await resp.json();
        console.warn("Detalle TTS:", j);
      } catch {}
      return;
    }

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audio.onended = () => URL.revokeObjectURL(url);
    audio.onerror = () => URL.revokeObjectURL(url);

    await audio.play().catch((e) => {
      // Autoplay bloqueado: el usuario debe interactuar antes
      console.error("🎧 Error al hacer play():", e);
      URL.revokeObjectURL(url);
      alert(
        "Tu navegador bloqueó la reproducción automática. Haz clic nuevamente para escuchar."
      );
    });
  } catch (err) {
    console.error("❌ Error en TTS:", err);
  }
}

/* ============================================================
   Utilidades de formato (copiar limpio para Word)
============================================================ */
function toPlain(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return tmp.textContent || tmp.innerText || html || "";
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
      await reproducirVozServidor(plain, ttsPrefs);
    } catch (err) {
      console.error("🔇 Error en handleSpeak():", err);
    } finally {
      setLeyendo(false);
    }
  }

  function handleGuardar() {
    setEditando(false);
    onEdit && onEdit(editValue);
  }

  async function handleCopiar() {
    try {
      const limpio = prepararTextoParaCopia(msg.content);
      await navigator.clipboard.writeText(limpio);
      onCopy && onCopy(limpio);
    } catch {}
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
          dangerouslySetInnerHTML={{ __html: msg.content }}
        />
      ) : (
        <div className="flex flex-col gap-2 w-full">
          <textarea
            className="w-full border rounded p-2 text-[15px] leading-relaxed"
            style={{
              borderColor: "rgba(92,46,11,0.3)",
              color: "#5C2E0B",
            }}
            rows={4}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
          <div className="flex gap-4 text-[15px]">
            <button
              className="font-semibold"
              style={{ color: "#0f5132" }}
              onClick={handleGuardar}
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
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 640px)").matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
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
   🪟 ChatWindow (no remonta al escribir)
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
  ttsPrefs, // <-- nuevas preferencias para voz
  showTtsCfg,
  setShowTtsCfg,
  setTtsPrefs,
}) {
  if (!isOpen) return null;

  const headerBg = "#5C2E0B";
  const headerColor = "#fff";

  // Panel compacto de configuración TTS (voz / velocidad / tono)
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
              setTtsPrefs((p) => ({ ...p, pitch: parseInt(e.target.value, 10) }))
            }
            className="w-full"
          />
        </div>
      )}
    </>
  );

  /* ============ MODO MÓVIL: fullscreen tipo app de mensajería ============ */
  if (isMobile) {
    return (
      <div
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
            onClick={() => setIsOpen(false)}
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
                    onFeedback={(tipo) => {
                      console.log("feedback:", tipo);
                    }}
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

        {/* Acciones sobre el feed */}
        <div className="px-3 pb-1">
          <button
            className="text-white px-3 py-2 rounded-md"
            style={{ background: "#5C2E0B" }}
            onClick={async () => {
              const texto = obtenerUltimoMensaje(mensajes);
              if (!texto) return;
              const div = document.createElement("div");
              div.innerHTML = texto;
              const plain = div.textContent || div.innerText || texto;
              await reproducirVozServidor(plain, ttsPrefs);
            }}
            title="Leer el último mensaje del hilo"
          >
            🔊 Leer último
          </button>
        </div>

        {/* Input */}
        <div
          className="flex flex-col gap-2 px-3 py-3 border-t"
          style={{ borderColor: "rgba(92,46,11,0.2)", backgroundColor: "#ffffff" }}
        >
          {/* Panel TTS */}
          <div className="flex items-center gap-2">{PanelTTS}</div>

          {/* Barra de redacción */}
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
              style={{ borderColor: "rgba(92,46,11,0.2)", minHeight: "48px", backgroundColor: "#ffffff" }}
              placeholder="Escribe tu consulta legal…"
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
      </div>
    );
  }

  /* ============ MODO DESKTOP: tarjeta flotante elegante ============ */
  return (
    <div
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
      <div className="flex items-center justify-between px-4 py-3" style={{ background: headerBg, color: headerColor }}>
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
          onClick={() => setIsOpen(false)}
          aria-label="Cerrar chat"
          title="Cerrar"
        >
          ×
        </button>
      </div>

      {/* Feed */}
      <div ref={feedRef} className="flex-1 min-h-0 w-full overflow-y-auto no-scrollbar px-4 py-4" style={{ backgroundColor: "#ffffff" }}>
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

      {/* Acciones sobre el feed */}
      <div className="px-4 pb-2">
        <button
          className="text-white px-3 py-2 rounded-md"
          style={{ background: "#5C2E0B" }}
          onClick={async () => {
            const texto = obtenerUltimoMensaje(mensajes);
            if (!texto) return;
            const div = document.createElement("div");
            div.innerHTML = texto;
            const plain = div.textContent || div.innerText || texto;
            await reproducirVozServidor(plain, ttsPrefs);
          }}
          title="Leer el último mensaje del hilo"
        >
          🔊 Leer último
        </button>
      </div>

      {/* Footer */}
      <div
        className="flex flex-col gap-2 px-4 py-3 border-t"
        style={{ borderColor: "rgba(92,46,11,0.2)", backgroundColor: "#ffffff", flexShrink: 0 }}
      >
        {/* Panel TTS */}
        <div className="flex items-center gap-2">{PanelTTS}</div>

        {/* Barra de redacción */}
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
            style={{ borderColor: "rgba(92,46,11,0.2)", minHeight: "48px", backgroundColor: "#ffffff" }}
            placeholder={pro ? "Formula tu consulta jurídica avanzada…" : "Escribe tu consulta legal…"}
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
    </div>
  );
}

/* ============================================================
   🌐 Componente principal flotante LitisBotBubbleChat
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

  const [mensajes, setMensajes] = useState([
    { role: "assistant", content: "Hola, soy LitisBot. ¿En qué puedo ayudarte hoy? 👋" },
  ]);

  const feedRef = useRef(null);
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [mensajes, isOpen]);

  // Drag del botón (desktop)
  const [pos, setPos] = useState({ x: null, y: null });
  const dragRef = useRef(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onMouseDownBubble = useCallback(
    (e) => {
      if (isMobile) return;
      dragging.current = true;
      const rect = dragRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      e.preventDefault();
    },
    [isMobile]
  );

  const onMouseMove = useCallback(
    (e) => {
      if (!dragging.current || isMobile) return;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      setPos({ x: newX, y: newY });
    },
    [isMobile]
  );

  const onMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    if (isMobile) return;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isMobile, onMouseMove, onMouseUp]);

  // Enviar mensaje
  async function enviarMensaje() {
  if (!input?.trim() || cargando) return;

  const pregunta = input.trim();
  setInput("");
  setCargando(true);

  // pinta usuario + placeholder de "pensando"
  setMensajes((prev) => [
    ...prev,
    { role: "user", content: pregunta },
    { role: "assistant", content: "Espera un momento…" },
  ]);

  try {
    // usa el cliente unificado (respeta /chat-api y VITE_CHAT_API_BASE_URL)
    const data = await enviarMensajeIA({
      prompt: pregunta,
      usuario: usuarioId || "invitado-burbuja",
      expedienteId: "burbuja",
      idioma: "es-PE",
      pais: "Perú",
    });

    setMensajes((prev) => {
      const next = [...prev];
      // quita el placeholder si sigue presente
      if (next.at(-1)?.role === "assistant" && next.at(-1)?.content === "Espera un momento…") {
        next.pop();
      }
      next.push({
        role: "assistant",
        content: data?.respuesta || data?.text || "No pude generar respuesta. ¿Intentamos de nuevo?",
      });
      return next;
    });
  } catch (err) {
    console.error("❌ Error burbuja:", err);
    setMensajes((prev) => {
      const next = [...prev];
      if (next.at(-1)?.role === "assistant" && next.at(-1)?.content === "Espera un momento…") {
        next.pop();
      }
      next.push({
        role: "assistant",
        content:
          "Hubo un problema procesando tu consulta. Verifica tu conexión y vuelve a intentarlo.",
      });
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

  const bubbleStyleDesktop =
    pos.x !== null && pos.y !== null ? { left: pos.x, top: pos.y } : { bottom: "24px", right: "24px" };
  const bubbleStyleMobile = { bottom: "96px", right: "16px" };

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

      {/* FAB */}
      <div
        ref={dragRef}
        className="fixed z-[9999] flex items-center justify-center rounded-full shadow-xl border bg-white cursor-pointer select-none active:scale-95 transition-transform animate-[pulse_2s_ease-in-out_infinite]"
        style={{ borderColor: "rgba(92,46,11,0.3)", width: "60px", height: "60px", ...(isMobile ? bubbleStyleMobile : bubbleStyleDesktop) }}
        onMouseDown={onMouseDownBubble}
        onClick={() => setIsOpen(true)}
      >
        <img src={litisLogo} alt="LitisBot" className="w-11 h-11 object-contain" draggable={false} />
      </div>
    </>
  );
}
