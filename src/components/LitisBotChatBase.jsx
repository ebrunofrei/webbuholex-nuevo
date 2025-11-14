/* eslint-disable react/no-danger */
// src/components/LitisBotChatBase.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  FaMicrophone,
  FaVolumeUp,
  FaPaperclip,
  FaRegCopy,
  FaRegEdit,
  FaRegThumbsUp,
  FaRegThumbsDown,
} from "react-icons/fa";
import { MdSend } from "react-icons/md";

// IA / backend
import { reproducirVoz, stopVoz } from "@/services/vozService.js"; // ← voz centralizada (parar + reproducir)
import { enviarMensajeIA } from "@/services/chatClient.js";
import { buscarJurisprudencia } from "@/services/researchClient.js";
// Herramientas
import HerramientaTercioPena from "./Herramientas/HerramientaTercioPena";
import HerramientaLiquidacionLaboral from "./Herramientas/HerramientaLiquidacionLaboral";

// Persistencia local
import {
  getMessages,
  saveMessage,
  deleteMessage,
  getFiles,
  saveFile,
  deleteFile,
} from "@/services/chatStorage";

/* ============================================================
   🦉 Mensaje inicial base (tono humano consistente)
============================================================ */
const INIT_MSG = {
  general: {
    role: "assistant",
    content:
      "Hola 👋. Soy LitisBot. Estoy aquí para ayudarte con cualquier duda legal o situación personal que te preocupe. Puedes contarme qué pasó y te explico tus opciones con palabras claras.",
  },
  pro: {
    role: "assistant",
    content:
      "Hola 👋. Soy LitisBot PRO. Puedo ayudarte con estrategia legal práctica, redacción de escritos y próximos pasos procesales. Cuéntame tu caso y avanzamos juntos.",
  },
};

/* ============================================================
   🧽 util formateo / sanitización / portapapeles
============================================================ */
const IS_BROWSER = typeof window !== "undefined";

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

function toPlain(html = "") {
  if (!IS_BROWSER) return String(html || "");
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return tmp.textContent || tmp.innerText || html || "";
}

async function copyToClipboard(text) {
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
   🎙️ Reconocimiento de voz (Web Speech API)
============================================================ */
const SR =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

function createRecognizer({
  lang = "es-PE",
  continuous = true,
  interimResults = true,
} = {}) {
  if (!SR) return null;
  const rec = new SR();
  rec.lang = lang;
  rec.continuous = continuous;
  rec.interimResults = interimResults;
  return rec;
}

/* ============================================================
   💬 BotBubblePremium
============================================================ */
function BotBubblePremium({ msg, onCopy, onEdit, onFeedback }) {
  const [editando, setEditando] = useState(false);
  const [editValue, setEditValue] = useState(msg.content || "");
  const [leyendo, setLeyendo] = useState(false);

  const feedback = msg.feedback;
  const likeActive = feedback === "up";
  const dislikeActive = feedback === "down";

  const baseBtnClass =
    "transition-all duration-150 flex items-center justify-center";

  async function handleSpeak() {
    if (leyendo) return;
    setLeyendo(true);
    try {
      const plain = toPlain(msg.content || "");
      await reproducirVoz(plain, {
        voz: "es-ES-AlvaroNeural",
        rate: 0,
        pitch: 0,
      });
    } catch (err) {
      console.error("Error TTS:", err);
    } finally {
      setLeyendo(false);
    }
  }

  async function handleCopiar() {
    const limpio = prepararTextoParaCopia(msg.content || "");
    const ok = await copyToClipboard(limpio);
    onCopy && onCopy(limpio, ok);
  }

  function handleGuardar() {
    setEditando(false);
    onEdit && onEdit(editValue);
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
      {/* CONTENIDO MENSAJE */}
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

      {/* ACCIONES */}
      {!editando && (
        <div className="flex flex-row flex-wrap items-center gap-4 mt-4 text-[18px]">
          {/* ▶ Voz */}
          <button
            className={`${baseBtnClass} w-9 h-9 rounded-full`}
            style={{
              background: "#5C2E0B",
              color: "#fff",
              opacity: leyendo ? 0.6 : 1,
              cursor: leyendo ? "not-allowed" : "pointer",
              transform: leyendo ? "scale(0.95)" : "scale(1)",
            }}
            aria-label="Leer en voz alta"
            title="Leer en voz alta"
            disabled={leyendo}
            onClick={handleSpeak}
          >
            <FaVolumeUp size={16} />
          </button>

          {/* 📋 Copiar */}
          <button
            className={`${baseBtnClass} text-[#5C2E0B] hover:opacity-70`}
            onClick={handleCopiar}
            title="Copiar para Word / PDF"
            aria-label="Copiar"
          >
            <FaRegCopy size={18} />
          </button>

          {/* ✍ Editar */}
          <button
            className={`${baseBtnClass} text-[#5C2E0B] hover:opacity-70`}
            onClick={() => setEditando(true)}
            title="Editar borrador"
            aria-label="Editar"
          >
            <FaRegEdit size={18} />
          </button>

          {/* 👍 Like */}
          <button
            className={baseBtnClass}
            style={{
              color: "#0f5132",
              backgroundColor: likeActive ? "rgba(15,81,50,0.08)" : "transparent",
              border: likeActive ? "1px solid #0f5132" : "1px solid transparent",
              borderRadius: "9999px",
              width: 36,
              height: 36,
              opacity: dislikeActive ? 0.4 : 1,
              transform: likeActive ? "scale(1.1)" : "scale(1)",
            }}
            title={likeActive ? "Marcado como útil" : "Respuesta útil"}
            aria-label="Respuesta útil"
            onClick={() => {
              if (dislikeActive) return;
              if (!likeActive) onFeedback && onFeedback("up");
            }}
          >
            <FaRegThumbsUp size={18} />
          </button>

          {/* 👎 Dislike */}
          <button
            className={baseBtnClass}
            style={{
              color: "#842029",
              backgroundColor: dislikeActive ? "rgba(132,32,41,0.08)" : "transparent",
              border: dislikeActive ? "1px solid #842029" : "1px solid transparent",
              borderRadius: "9999px",
              width: 36,
              height: 36,
              opacity: likeActive ? 0.4 : 1,
              transform: dislikeActive ? "scale(1.1)" : "scale(1)",
            }}
            title={dislikeActive ? "Marcado como no útil" : "Respuesta no útil"}
            aria-label="Respuesta no útil"
            onClick={() => {
              if (likeActive) return;
              if (!dislikeActive) onFeedback && onFeedback("down");
            }}
          >
            <FaRegThumbsDown size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   💬 UserBubblePremium
============================================================ */
function UserBubblePremium({ html }) {
  return (
    <div className="flex justify-end w-full">
      <div
        className="
          rounded-[1.5rem] shadow px-4 py-3
          text-white text-[16px] leading-relaxed font-medium
          max-w-[88%]
        "
        style={{ background: "#5C2E0B" }}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
      />
    </div>
  );
}

/* ============================================================
   Herramientas (mock) – sin cambios funcionales relevantes
============================================================ */
function HerramientaMultilingue() {
  const [texto, setTexto] = useState("");
  const [idioma, setIdioma] = useState("en");
  const [resultado, setResultado] = useState("");
  const [cargando, setCargando] = useState(false);

  async function traducir() {
    if (!texto) return;
    setCargando(true);
    try {
      const res = await fetch(
        "https://api.mymemory.translated.net/get?q=" +
          encodeURIComponent(texto) +
          `&langpair=es|${idioma}`
      );
      const data = await res.json();
      setResultado(data?.responseData?.translatedText || "(sin traducción)");
    } catch {
      setResultado("Error de traducción");
    }
    setCargando(false);
  }

  return (
    <div className="py-2 flex flex-col gap-3">
      <label className="font-bold">Texto a traducir:</label>
      <textarea
        className="border rounded p-1"
        rows={2}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escribe el texto aquí..."
      />
      <div className="flex items-center gap-2">
        <label>Idioma:</label>
        <select
          className="border p-1 rounded"
          value={idioma}
          onChange={(e) => setIdioma(e.target.value)}
        >
          <option value="en">Inglés</option>
          <option value="fr">Francés</option>
          <option value="pt">Portugués</option>
          <option value="it">Italiano</option>
          <option value="de">Alemán</option>
        </select>
        <button
          className="px-4 py-2 bg-blue-700 text-white rounded"
          onClick={traducir}
          disabled={cargando || !texto}
        >
          {cargando ? "Traduciendo..." : "Traducir"}
        </button>
      </div>
      {resultado && (
        <div className="p-3 bg-gray-100 rounded mt-2">
          <strong>Resultado:</strong> {resultado}
        </div>
      )}
    </div>
  );
}

function HerramientaAnalizador() {
  const [file, setFile] = useState(null);
  const [resultado, setResultado] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleAnalyze() {
    if (!file) return;
    setCargando(true);
    setTimeout(() => {
      setResultado(
        `Archivo "${file.name}" analizado: [Extracto legal simulado]`
      );
      setCargando(false);
    }, 900);
  }

  return (
    <div className="py-2 flex flex-col gap-3">
      <label className="font-bold">Sube un archivo PDF, Word o audio:</label>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded"
        onClick={handleAnalyze}
        disabled={!file || cargando}
      >
        {cargando ? "Analizando..." : "Analizar"}
      </button>
      {resultado && (
        <div className="p-3 bg-gray-100 rounded mt-3">
          <strong>Resultado:</strong> {resultado}
        </div>
      )}
    </div>
  );
}

function HerramientaAgenda() {
  const [evento, setEvento] = useState("");
  const [fecha, setFecha] = useState("");
  const [agenda, setAgenda] = useState([]);

  function agregarEvento() {
    if (!evento || !fecha) return;
    setAgenda((a) => [...a, { evento, fecha }]);
    setEvento("");
    setFecha("");
  }

  return (
    <div className="py-2 flex flex-col gap-3">
      <label className="font-bold">Nuevo evento o audiencia:</label>

      <input
        type="text"
        className="border rounded p-1"
        placeholder="Descripción del evento"
        value={evento}
        onChange={(e) => setEvento(e.target.value)}
      />

      <input
        type="date"
        className="border rounded p-1"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
      />

      <button
        className="px-4 py-2 bg-green-700 text-white rounded"
        onClick={agregarEvento}
        disabled={!evento || !fecha}
      >
        Agregar a agenda
      </button>

      <ul className="mt-2 text-sm">
        {agenda.map((item, idx) => (
          <li key={idx}>
            📅 <b>{item.evento}</b> para el {item.fecha}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HerramientaRecordatorios() {
  const [texto, setTexto] = useState("");
  const [fecha, setFecha] = useState("");
  const [records, setRecords] = useState([]);

  function agregarRecordatorio() {
    if (!texto || !fecha) return;
    setRecords((r) => [...r, { texto, fecha }]);
    setTexto("");
    setFecha("");
  }

  return (
    <div className="py-2 flex flex-col gap-3">
      <label className="font-bold">Nuevo recordatorio:</label>
      <input
        type="text"
        className="border rounded p-1"
        placeholder="¿Qué debes recordar?"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <input
        type="datetime-local"
        className="border rounded p-1"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
      />
      <button
        className="px-4 py-2 bg-orange-600 text-white rounded"
        onClick={agregarRecordatorio}
        disabled={!texto || !fecha}
      >
        Agregar recordatorio
      </button>
      <ul className="mt-2 text-sm">
        {records.map((r, idx) => (
          <li key={idx}>
            ⏰ <b>{r.texto}</b> para {r.fecha}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HerramientaAudiencia() {
  const [nota, setNota] = useState("");
  const [notas, setNotas] = useState([]);
  const TIPS = [
    "Mantén la calma y pide la palabra con respeto.",
    "Presenta objeciones claramente: relevancia, impertinencia, etc.",
    "Anota los plazos y decisiones del juez en tiempo real.",
    "Pide aclaraciones si alguna parte no es precisa.",
    "Alega siempre con fundamento legal y preciso.",
  ];

  function guardarNota() {
    if (!nota) return;
    setNotas((n) => [...n, nota]);
    setNota("");
  }

  return (
    <div className="py-2 flex flex-col gap-3">
      <div className="font-bold mb-2">Guía rápida para audiencia:</div>
      <ul className="list-disc ml-5 text-sm text-gray-700">
        {TIPS.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      <textarea
        className="border rounded p-2 mt-3"
        rows={2}
        placeholder="Agrega una nota rápida sobre tu audiencia"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
      />
      <button
        className="px-4 py-2 bg-purple-700 text-white rounded"
        onClick={guardarNota}
        disabled={!nota}
      >
        Guardar nota
      </button>
      <ul className="mt-2 text-sm">
        {notas.map((n, idx) => (
          <li key={idx}>📝 {n}</li>
        ))}
      </ul>
    </div>
  );
}

function HerramientaTraducir() {
  const [texto, setTexto] = useState("");
  const [idioma, setIdioma] = useState("en");
  const [resultado, setResultado] = useState("");
  const [cargando, setCargando] = useState(false);

  async function traducir() {
    if (!texto) return;
    setCargando(true);
    try {
      const res = await fetch(
        "https://api.mymemory.translated.net/get?q=" +
          encodeURIComponent(texto) +
          `&langpair=es|${idioma}`
      );
      const data = await res.json();
      setResultado(data?.responseData?.translatedText || "(sin traducción)");
    } catch {
      setResultado("Error de traducción");
    }
    setCargando(false);
  }

  return (
    <div className="py-2 flex flex-col gap-3">
      <label className="font-bold">Texto a traducir:</label>
      <textarea
        className="border rounded p-1"
        rows={2}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escribe el texto aquí..."
      />
      <div className="flex items-center gap-2">
        <label>Idioma:</label>
        <select
          className="border p-1 rounded"
          value={idioma}
          onChange={(e) => setIdioma(e.target.value)}
        >
          <option value="en">Inglés</option>
          <option value="fr">Francés</option>
          <option value="pt">Portugués</option>
          <option value="it">Italiano</option>
          <option value="de">Alemán</option>
        </select>
        <button
          className="px-4 py-2 bg-blue-700 text-white rounded"
          onClick={traducir}
          disabled={cargando || !texto}
        >
          {cargando ? "Traduciendo..." : "Traducir"}
        </button>
      </div>
      {resultado && (
        <div className="p-3 bg-gray-100 rounded mt-2">
          <strong>Resultado:</strong> {resultado}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ModalHerramientas
============================================================ */
function ModalHerramientas({
  onClose,
  herramienta,
  setHerramienta,
  pro,
  error,
  setError,
}) {
  const HERRAMIENTAS = [
    { label: "Multilingüe", key: "multilingue", pro: false, desc: "Haz tus consultas legales en cualquier idioma." },
    { label: "Modo Audiencia", key: "audiencia", pro: true, desc: "Guía de objeciones y alegatos en vivo (PRO)." },
    { label: "Analizar Archivo", key: "analizador", pro: true, desc: "Sube PDF, Word o audio para análisis legal (PRO)." },
    { label: "Traducir", key: "traducir", pro: false, desc: "Traduce textos o documentos legales." },
    { label: "Agenda", key: "agenda", pro: true, desc: "Gestiona plazos y audiencias (PRO)." },
    { label: "Recordatorios", key: "recordatorios", pro: true, desc: "Configura alertas importantes (PRO)." },
    { label: "Tercio de la Pena", key: "tercio_pena", pro: false, desc: "Calcula tercios, mitades y cuartos de pena." },
    { label: "Liquidación Laboral", key: "liquidacion_laboral", pro: false, desc: "CTS, vacaciones, gratificaciones y beneficios." },
  ];

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  function renderHerramienta() {
    switch (herramienta) {
      case "multilingue":
        return <HerramientaMultilingue />;
      case "analizador":
        return <HerramientaAnalizador />;
      case "agenda":
        return <HerramientaAgenda />;
      case "recordatorios":
        return <HerramientaRecordatorios />;
      case "audiencia":
        return <HerramientaAudiencia />;
      case "traducir":
        return <HerramientaTraducir />;
      case "tercio_pena":
        return <HerramientaTercioPena onClose={onClose} />;
      case "liquidacion_laboral":
        return <HerramientaLiquidacionLaboral onClose={onClose} />;
      default:
        return null;
    }
  }

  function handleClick(key, proRequired) {
    if (proRequired && !pro) {
      setError && setError("Hazte PRO para usar esta herramienta");
      setTimeout(() => setError && setError(""), 1600);
      return;
    }
    setHerramienta(key);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-3"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-lg p-6 sm:p-7 w-full max-w-md relative border-2 border-yellow-600"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-2 text-yellow-700 text-2xl font-bold"
          aria-label="Cerrar"
          title="Cerrar"
        >
          ×
        </button>

        <h2 className="font-bold text-xl sm:text-2xl mb-4 text-yellow-700">
          Herramientas LitisBot
        </h2>

        {!herramienta ? (
          <div className="flex flex-col gap-2">
            {HERRAMIENTAS.map((h) => (
              <button
                key={h.key}
                className={`flex flex-col text-left px-4 py-2 rounded-xl border transition
                  ${
                    !h.pro || pro
                      ? "border-yellow-200 bg-yellow-50 hover:bg-yellow-100 text-yellow-900"
                      : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                  }`}
                onClick={() => handleClick(h.key, h.pro)}
                disabled={h.pro && !pro}
                title={h.desc}
              >
                <span className="font-bold">
                  {h.label}{" "}
                  {h.pro && (
                    <span className="ml-1 text-xs bg-yellow-200 px-2 py-0.5 rounded">
                      PRO
                    </span>
                  )}
                </span>
                <span className="text-xs">{h.desc}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <button
              onClick={() => setHerramienta(null)}
              className="text-xs text-yellow-700 underline mb-3"
            >
              ← Volver a herramientas
            </button>
            {renderHerramienta()}
          </>
        )}

        {error && <div className="mt-3 text-red-700 text-sm">{error}</div>}
      </div>
    </div>
  );
}

/* ============================================================
   🦉 Componente Principal: LitisBotChatBase
 ============================================================ */
export default function LitisBotChatBase({
  user = {},
  pro = false,
  casoActivo = "default",
  showModal,
  setShowModal,
  expedientes = [],
  jurisSeleccionada = null,
  onClearJuris,
}) {
  // ====== ESTADOS ======
  const [adjuntos, setAdjuntos] = useState(() => getFiles(casoActivo) || []);

  const [mensajes, setMensajes] = useState(() => {
    const prev = getMessages(casoActivo);
    if (prev && prev.length) return prev;
    return []; // bienvenida en effect
  });

  const [input, setInput] = useState("");
  const [herramienta, setHerramienta] = useState(null);

  const [alertaAdjuntos, setAlertaAdjuntos] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // Anti spam doble enter
  const [isSending, setIsSending] = useState(false);

  // Reconocimiento de voz
  const recRef = useRef(null);
  const [grabando, setGrabando] = useState(false);
  const [interim, setInterim] = useState("");

  // Refs
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Constantes
  const MAX_ADJUNTOS = pro ? 10 : 3;
  const MAX_MB = 25;

  // ====== EFECTOS ======
  useEffect(() => {
    // al cambiar de expediente
    const prev = getMessages(casoActivo);
    if (prev && prev.length) {
      setMensajes(prev);
    } else {
      const bienvenida = pro ? INIT_MSG.pro : INIT_MSG.general;
      setMensajes([bienvenida]);
      saveMessage(casoActivo, bienvenida);
    }
    setAdjuntos(getFiles(casoActivo) || []);
  }, [casoActivo, pro]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 6 * 28) + "px";
  }, [input]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.litisbotCloseTools = () => setShowModal?.(false);
      return () => {
        delete window.litisbotCloseTools;
      };
    }
  }, [setShowModal]);

  // ====== RECONOCEDOR DE VOZ ======
  function ensureRecognizer() {
    if (!recRef.current) {
      recRef.current = createRecognizer({
        lang: "es-PE",
        continuous: true,
        interimResults: true,
      });
      if (!recRef.current) return null;

      recRef.current.onstart = () => setGrabando(true);

      recRef.current.onresult = (e) => {
        let finalChunk = "";
        let interimChunk = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const txt = e.results[i][0]?.transcript || "";
          if (e.results[i].isFinal) finalChunk += txt;
          else interimChunk += txt;
        }
        if (finalChunk) {
          setInput((prev) =>
            prev ? (prev + " " + finalChunk).trim() : finalChunk.trim()
          );
        }
        setInterim(interimChunk);
      };

      recRef.current.onerror = (ev) => {
        console.warn("SpeechRecognition error:", ev.error);
        setError(
          ev.error === "not-allowed"
            ? "Permiso del micrófono denegado. Habilítalo en el navegador."
            : ev.error === "no-speech"
            ? "No se detectó voz. Vuelve a intentarlo."
            : "Error del reconocimiento de voz."
        );
      };

      recRef.current.onend = () => {
        setGrabando(false);
        setInterim("");
      };
    }
    return recRef.current;
  }

  function startDictado() {
    // coherencia con BubbleChat: si el bot estaba leyendo, lo detenemos
    try {
      stopVoz();
    } catch {}
    const rec = ensureRecognizer();
    if (!rec) {
      setError("Este navegador no soporta dictado por voz.");
      return;
    }
    try {
      rec.start();
    } catch {
      // start puede lanzar si ya está corriendo
    }
  }

  function stopDictado() {
    const rec = recRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {}
    }
  }

  function toggleDictado() {
    if (grabando) stopDictado();
    else startDictado();
  }

  // cleanup: detener dictado al desmontar
  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort?.();
      } catch {}
    };
  }, []);

  // ====== ADJUNTOS ======
  function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    const nuevos = [];
    for (const f of files) {
      if (adjuntos.length + nuevos.length >= MAX_ADJUNTOS) break;
      if (f.size > MAX_MB * 1024 * 1024) {
        setAlertaAdjuntos(`"${f.name}" supera ${MAX_MB} MB y no se adjuntará.`);
        continue;
      }
      nuevos.push(f);
      saveFile(casoActivo, { name: f.name, type: f.type, size: f.size });
    }
    if (nuevos.length) setAdjuntos((prev) => [...prev, ...nuevos]);
  }
  function handleRemoveAdjunto(idx) {
    setAdjuntos((prev) => {
      const copia = [...prev];
      copia.splice(idx, 1);
      deleteFile(casoActivo, idx);
      return copia;
    });
  }

  // ====== HISTORIAL PARA IA ======
  function obtenerHistorial() {
    return mensajes
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content || "" }));
  }

  // ====== PROCESADOR GENÉRICO ======
  async function procesarConsulta(pregunta, construirPayload) {
    const texto = (pregunta || "").trim();
    if (!texto) {
      setError("⚠️ Escribe una consulta antes de enviar.");
      return;
    }

    setCargando(true);
    setIsSending(true);
    setError("");

    // placeholder
    setMensajes((prev) => [
      ...prev,
      { role: "assistant", content: "💬 Analizando tu consulta..." },
    ]);

    const controller = new AbortController();

    try {
      const payload = construirPayload(texto);
      const resp = await enviarMensajeIA(payload, controller.signal);

      const finalText =
        (resp?.respuesta || resp?.text || resp?.message || "").trim() ||
        "⚠️ No se recibió respuesta válida del servidor.";

      const msgFinal = { role: "assistant", content: finalText };
      saveMessage(casoActivo, msgFinal);

      setMensajes((prev) => {
        const copia = [...prev];
        // sustituye el último (placeholder)
        for (let i = copia.length - 1; i >= 0; i--) {
          if (
            copia[i].role === "assistant" &&
            copia[i].content.includes("Analizando")
          ) {
            copia[i] = msgFinal;
            return copia;
          }
        }
        // si no encontró placeholder, añade
        copia.push(msgFinal);
        return copia;
      });
    } catch (err) {
      console.error("❌ Error en procesarConsulta:", err);
      let msgError = "❌ Ocurrió un error inesperado al procesar tu consulta.";
      if (err?.name === "AbortError") msgError = "⏹️ Consulta cancelada.";
      else if (err.message?.includes("Falta el prompt"))
        msgError = "⚠️ La consulta no puede enviarse vacía.";
      else if (err.message?.includes("429"))
        msgError = "🚫 Límite de consultas por minuto alcanzado.";
      else if (err.message?.includes("500"))
        msgError = "⚙️ Error interno del servidor. Intenta más tarde.";
      else if (err.message?.includes("Failed to fetch"))
        msgError = "🌐 No se pudo conectar al servidor.";

      setMensajes((prev) => {
        const copia = [...prev];
        for (let i = copia.length - 1; i >= 0; i--) {
          if (
            copia[i].role === "assistant" &&
            copia[i].content.includes("Analizando")
          ) {
            copia[i] = { role: "assistant", content: msgError };
            return copia;
          }
        }
        copia.push({ role: "assistant", content: msgError });
        return copia;
      });
    } finally {
      setCargando(false);
      setIsSending(false);
      setInput("");
    }
  }

    // ====== INTENTOS IA SEGÚN CONTEXTO ======
    async function handleConsultaGeneral(pregunta) {
      await procesarConsulta(pregunta, (texto) => {
        const payload = {
          prompt: texto,
          historial: obtenerHistorial(),
          usuarioId: user?.uid || "invitado",
          userEmail: user?.email || "",
          modo: "general",
          materia: "general",
          idioma: "es",
        };

        // 👇 Si hay jurisprudencia seleccionada, se envía su ID al backend
        if (jurisSeleccionada?._id) {
          payload.jurisprudenciaId = jurisSeleccionada._id;
        }

        return payload;
      });
    }

    async function handleConsultaLegal({ mensaje, materia = "general" }) {
      await procesarConsulta(mensaje, (texto) => {
        const payload = {
          prompt: texto,
          historial: obtenerHistorial(),
          usuarioId: user?.uid || "invitado",
          userEmail: user?.email || "",
          modo: "juridico",
          materia,
          idioma: "es",
        };

        // 👇 Igual: manda la sentencia activa si existe
        if (jurisSeleccionada?._id) {
          payload.jurisprudenciaId = jurisSeleccionada._id;
        }

        return payload;
      });
    }

  async function handleConsultaInvestigacion(pregunta) {
  const texto = (pregunta || "").trim();
  if (!texto) {
    setError("⚠️ Escribe una consulta antes de enviar.");
    return;
  }

  setCargando(true);
  setIsSending(true);
  setError("");

  // placeholder visible
  setMensajes((prev) => [
    ...prev,
    { role: "assistant", content: "🔎 Buscando jurisprudencia y material relevante…" },
  ]);

  try {
    const data = await buscarJurisprudencia({ q: texto, num: 3, lang: "es" });

    // Estructuras tolerantes: usa lo que haya
    const answer = data?.answer || data?.respuesta || "";
    const items  = data?.items || data?.results || data?.citas || [];

    // Render HTML compacto con citas
    const htmlFuentes = Array.isArray(items) && items.length
      ? `<hr/><div style="margin-top:8px">
           <b>📚 Fuentes:</b>
           <ol style="margin:6px 0 0 18px">
             ${items
               .map((it) => {
                 const t = (it.title || it.titulo || it.name || "Recurso").toString();
                 const l = (it.link || it.url || "").toString();
                 const s = (it.snippet || it.descripcion || it.extract || "").toString();
                 return `<li style="margin-bottom:6px">
                          <a href="${l}" target="_blank" rel="noopener noreferrer">${t}</a>
                          ${s ? `<div style="color:#555">${s}</div>` : ""}
                         </li>`;
               })
               .join("")}
           </ol>
         </div>`
      : "";

    const htmlFinal =
      (answer && sanitizeHtml(answer)) ||
      "No se encontró una síntesis directa. Revisa las fuentes sugeridas más abajo.";


    const msgFinal = {
      role: "assistant",
      content: `${htmlFinal}${htmlFuentes}`,
    };

    saveMessage(casoActivo, msgFinal);
    setMensajes((prev) => {
      const copia = [...prev];
      for (let i = copia.length - 1; i >= 0; i--) {
        if (
          copia[i].role === "assistant" &&
          /Buscando jurisprudencia/i.test(copia[i].content)
        ) {
          copia[i] = msgFinal;
          return copia;
        }
      }
      copia.push(msgFinal);
      return copia;
    });
  } catch (err) {
    console.error("❌ Research error:", err);
    const msgErr = {
      role: "assistant",
      content:
        "❌ No pude cargar la jurisprudencia ahora mismo. Inténtalo de nuevo en unos minutos.",
    };
    saveMessage(casoActivo, msgErr);
    setMensajes((prev) => {
      const copia = [...prev];
      for (let i = copia.length - 1; i >= 0; i--) {
        if (
          copia[i].role === "assistant" &&
          /Buscando jurisprudencia/i.test(copia[i].content)
        ) {
          copia[i] = msgErr;
          return copia;
        }
      }
      copia.push(msgErr);
      return copia;
    });
  } finally {
    setCargando(false);
    setIsSending(false);
    setInput("");
  }
}

  // ====== ENVÍO MENSAJE DEL USUARIO ======
  async function handleSend(e) {
    e?.preventDefault?.();
    if (isSending) return;

    setAlertaAdjuntos("");

    // adjuntos
    if (adjuntos.length > 0) {
      const msgsParaGuardar = [];
      const msgsParaUI = [];

      adjuntos.forEach((file) => {
        const mu = {
          role: "user",
          content: `📎 Archivo subido: <b>${file.name}</b>`,
          tipo: "archivo",
        };
        const ma = {
          role: "assistant",
          content: `📑 Archivo recibido: <b>${file.name}</b>.<br/><b>Analizando…</b>`,
          tipo: "archivo",
        };
        msgsParaGuardar.push(mu, ma);
        msgsParaUI.push(mu, ma);
      });

      msgsParaGuardar.forEach((m) => saveMessage(casoActivo, m));
      setMensajes((msgs) => [...msgs, ...msgsParaUI]);

      setAdjuntos([]);
      setInput("");
      return;
    }

    const pregunta = input.trim();
    if (!pregunta) return;

    const nuevo = { role: "user", content: pregunta };
    setMensajes((msgs) => [...msgs, nuevo]);
    saveMessage(casoActivo, nuevo);
    setInput("");

    // detección de materia
    const textoLower = pregunta.toLowerCase();
    const gatillosInvestigacion = /(jurisprudenc|casaci|precedent|ejecutori|tribunal constitucional|tc|r\.n\.|exp\.)/i;
    if (gatillosInvestigacion.test(textoLower)) {
      await handleConsultaInvestigacion(pregunta);
      return;
    }
    const materias = {
      civil:
        /civil|contrato|obligaci(ón|on)|propiedad|posesi(ón|on)|familia|sucesi(ón|on)/i,
      penal:
        /penal|delito|crimen|homicidio|robo|violencia|acusaci(ón|on)|condena/i,
      laboral:
        /laboral|trabajo|sindicato|despido|remuneraci(ón|on)|indemnizaci(ón|on)/i,
      constitucional:
        /constituci(ón|on)|derechos fundamentales|amparo|habeas|tc|tribunal constitucional/i,
      administrativo:
        /administrativo|procedimiento|sancionador|sunat|sunafil|municipalidad/i,
    };

    if (/investigaci(ón|on)|tesis|hipótesis|metodolog/i.test(textoLower)) {
      await handleConsultaInvestigacion(pregunta);
    } else {
      let materiaDetectada = null;
      for (const [mat, regex] of Object.entries(materias)) {
        if (regex.test(textoLower)) {
          materiaDetectada = mat;
          break;
        }
      }
      if (materiaDetectada) {
        await handleConsultaLegal({ mensaje: pregunta, materia: materiaDetectada });
      } else {
        await handleConsultaGeneral(pregunta);
      }
    }
  }

  // ====== ACCIONES SOBRE MENSAJES ======
  function handleCopy(text) {
    const limpio = prepararTextoParaCopia(text || "");
    copyToClipboard(limpio);
  }

  function handleEdit(idx, nuevoTexto) {
    setMensajes((ms) => {
      const copia = [...ms];
      copia[idx].content = nuevoTexto;
      deleteMessage(casoActivo, idx);
      saveMessage(casoActivo, copia[idx]);
      return copia;
    });
  }

  function handleFeedback(idx, type) {
    setMensajes((ms) =>
      ms.map((m, i) => (i === idx ? { ...m, feedback: type } : m))
    );
  }

  function closeHerramientas() {
    setShowModal?.(false);
    setHerramienta(null);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if ((input.trim() || adjuntos.length) && !isSending) {
        handleSend(e);
      }
    }
  }

  /* ================== RENDER ================== */
  return (
    <div
      className="flex flex-col w-full items-center bg-white text-[#5C2E0B]"
      style={{
        minHeight: "100dvh",
        maxHeight: "100dvh",
        width: "100%",
        overflow: "hidden",
      }}
      onPaste={(e) => {
        if (e.clipboardData?.files?.length) {
          handleFileChange({ target: { files: e.clipboardData.files } });
        }
      }}
    >
      {/* ===== FEED MENSAJES ===== */}
      <div
        id="litisbot-feed"
        className="
          flex flex-col w-full mx-auto
          overflow-y-auto no-scrollbar
          px-3 sm:px-4
          max-w-full sm:max-w-3xl md:max-w-4xl
          flex-1
        "
        style={{
          flexGrow: 1,
          minHeight: 0,
          width: "100%",
          paddingTop: 16,
          paddingBottom: 96,
          backgroundColor: "#ffffff",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div className="flex flex-col gap-4 w-full">
          {mensajes.map((m, i) => {
            if (m.role === "assistant") {
              return (
                <div
                  key={i}
                  className="flex w-full justify-start text-[#5C2E0B]"
                >
                  <BotBubblePremium
                    msg={m}
                    feedback={m.feedback}
                    onCopy={() => handleCopy(m.content)}
                    onEdit={(nuevo) => handleEdit(i, nuevo)}
                    onFeedback={(type) => handleFeedback(i, type)}
                  />
                </div>
              );
            } else {
              return <UserBubblePremium key={i} html={m.content} />;
            }
          })}

          {cargando && (
            <div className="flex w-full justify-start text-[#5C2E0B]">
              <div
                className="
                  rounded-[1.5rem] shadow text-[15px] max-w-[80%]
                  px-4 py-3
                "
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

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ===== BARRA DE ENTRADA STICKY ===== */}
      <form
        onSubmit={handleSend}
        className="
          w-full mx-auto
          flex items-end gap-3
          px-4 py-4
          max-w-full sm:max-w-3xl md:max-w-4xl
          sticky bottom-0 z-50
          bg-white
          border-t
        "
        style={{
          borderColor: "rgba(92,46,11,0.3)",
          left: 0,
          right: 0,
        }}
      >
        {/* Botón Adjuntar */}
        <label
          className={`
            cursor-pointer flex-shrink-0
            rounded-full hover:opacity-90 transition
            ${
              adjuntos.length >= MAX_ADJUNTOS
                ? "opacity-40 pointer-events-none"
                : ""
            }
          `}
          style={{
            background: "#5C2E0B",
            color: "#fff",
            width: 44,
            height: 44,
            minWidth: 44,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={`Adjuntar (máx. ${MAX_ADJUNTOS}, hasta ${MAX_MB} MB c/u)`}
          aria-label="Adjuntar archivo"
        >
          <FaPaperclip size={20} />
          <input
            type="file"
            className="hidden"
            multiple
            onChange={handleFileChange}
            disabled={adjuntos.length >= MAX_ADJUNTOS}
          />
        </label>

        {/* Previews adjuntos */}
        {adjuntos.some((a) => a instanceof File || a instanceof Blob) && (
          <div
            className="
              flex gap-2 py-1
              overflow-x-auto no-scrollbar
              max-w-[40%] sm:max-w-[50%]
            "
            style={{ minHeight: 60 }}
          >
            {adjuntos.map((adj, idx) => {
              const isBlob = adj instanceof File || adj instanceof Blob;

              return (
                <div key={idx} className="relative flex-shrink-0">
                  {isBlob && adj.type?.startsWith?.("image/") ? (
                    <img
                      src={URL.createObjectURL(adj)}
                      alt={adj.name || `archivo-${idx}`}
                      className="rounded-xl border-2 border-[#5C2E0B]/30 shadow object-cover"
                      style={{
                        width: 80,
                        height: 60,
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      className="
                        bg-white border-2 rounded-xl
                        flex flex-col items-center justify-center
                        text-[#5C2E0B] font-semibold shadow text-[12px]
                      "
                      style={{
                        borderColor: "rgba(92,46,11,0.3)",
                        width: 90,
                        height: 60,
                        padding: 4,
                      }}
                    >
                      <div style={{ fontSize: 22, marginBottom: 2 }}>
                        {String(adj.name || "")
                          .toLowerCase()
                          .endsWith(".pdf")
                          ? "📄"
                          : /\.(doc|docx)$/i.test(String(adj.name || ""))
                          ? "📝"
                          : /\.(xls|xlsx)$/i.test(String(adj.name || ""))
                          ? "📊"
                          : "📎"}
                      </div>
                      <div
                        className="truncate w-full text-center"
                        title={adj.name || "archivo"}
                      >
                        {adj.name || "archivo"}
                      </div>
                    </div>
                  )}

                  {/* Quitar adjunto */}
                  <button
                    type="button"
                    aria-label="Quitar archivo"
                    className="
                      absolute -top-1 -right-1
                      bg-black/70 text-white rounded-full
                      w-5 h-5 flex items-center justify-center
                      text-[12px] leading-none
                    "
                    onClick={() => handleRemoveAdjunto(idx)}
                    title="Eliminar archivo"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Área de texto */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            className="
              w-full
              outline-none resize-none
              text-[16px] sm:text-[15px] md:text-[17px]
              leading-relaxed text-[#5C2E0B]
              placeholder:text-[#5C2E0B]/60
              border rounded-lg px-3 py-2
              max-h-[160px] overflow-y-auto
            "
            style={{
              minHeight: 48,
              backgroundColor: "#ffffff",
              borderColor: "rgba(92,46,11,0.2)",
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
            }}
            placeholder="Escribe o dicta tu pregunta legal…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          {/* Texto provisional del dictado */}
          {grabando && interim && (
            <div className="w-full text-sm text-[#5C2E0B]/70 mt-1 px-1">
              <em>[{interim}]</em>
            </div>
          )}
        </div>

        {/* Micrófono (start/stop) */}
        <button
          type="button"
          aria-label={grabando ? "Detener dictado" : "Dictar voz"}
          className="flex-shrink-0 rounded-full hover:opacity-90 transition"
          style={{
            background: grabando ? "#b71c1c" : "#5C2E0B",
            color: "#fff",
            width: 44,
            height: 44,
            minWidth: 44,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => (grabando ? stopDictado() : startDictado())}
          title={grabando ? "Detener dictado" : "Dictar voz"}
        >
          <FaMicrophone size={18} />
        </button>

        {/* Enviar */}
        <button
          type="submit"
          aria-label="Enviar"
          title="Enviar"
          className={`
            flex-shrink-0 rounded-full hover:opacity-90 transition
            ${
              (!input.trim() && adjuntos.length === 0) || isSending
                ? "opacity-50 cursor-not-allowed"
                : ""
            }
          `}
          style={{
            background: "#5C2E0B",
            color: "#fff",
            width: 48,
            height: 48,
            minWidth: 48,
            minHeight: 48,
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          disabled={
            (!input.trim() && adjuntos.length === 0) || cargando || isSending
          }
        >
          <MdSend size={22} />
        </button>
      </form>

      {/* Alertas/errores debajo */}
      {alertaAdjuntos && (
        <div className="text-red-600 text-center w-full pb-2 text-sm max-w-full sm:max-w-3xl md:max-w-4xl">
          {alertaAdjuntos}
        </div>
      )}

      {error && (
        <div className="p-2 text-red-700 text-lg max-w-full sm:max-w-3xl md:max-w-4xl">
          {error}
        </div>
      )}

      {/* MODAL HERRAMIENTAS */}
      {showModal && (
        <ModalHerramientas
          onClose={closeHerramientas}
          herramienta={herramienta}
          setHerramienta={setHerramienta}
          pro={pro}
          error={error}
          setError={setError}
        />
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @media (max-width: 1024px) {
          .litisbot-fill {
            max-width: 100vw !important;
            padding-left: 8px;
            padding-right: 8px;
          }
        }
      `}</style>
    </div>
  );
}
