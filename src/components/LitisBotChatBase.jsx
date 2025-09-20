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

// Herramientas (mock/simples). Mantengo tu estructura y rutas.
import HerramientaTercioPena from "./Herramientas/HerramientaTercioPena";
import HerramientaLiquidacionLaboral from "./Herramientas/HerramientaLiquidacionLaboral";

/* ============================================================
   Utilidades
============================================================ */
const buildIaUrl = () => {
  const raw = (import.meta.env.VITE_API_URL || "").trim();
  if (!raw) return "/api/ia-litisbotchat"; // fallback local

  // Si ya viene con /api/... o es ruta absoluta completa
  if (/^https?:\/\//i.test(raw)) {
    if (/\/api\/.+/i.test(raw)) return raw.replace(/\/+$/, "");
    return raw.replace(/\/+$/, "") + "/api/ia-litisbotchat";
  }

  // Rutas relativas
  if (raw.startsWith("/api/")) return raw;
  return raw.replace(/\/+$/, "") + "/api/ia-litisbotchat";
};

/* ============================================================
   Herramientas funcionales (mock)
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
      setResultado(`Archivo "${file.name}" analizado: [Extracto legal simulado]`);
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
        {agenda.map((e, idx) => (
          <li key={idx}>📅 <b>{e.evento}</b> para el {e.fecha}</li>
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
          <li key={idx}>⏰ <b>{r.texto}</b> para {r.fecha}</li>
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
   Modal de Herramientas (overlay + fullscreen en móvil)
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
    { label: "Modo Audiencia", key: "audiencia", pro: true, desc: "Guía de objeciones, alegatos y tips de litigio para audiencias (PRO)." },
    { label: "Analizar Archivo", key: "analizador", pro: true, desc: "Sube archivos PDF, Word o audio para análisis legal (PRO)." },
    { label: "Traducir", key: "traducir", pro: false, desc: "Traduce textos o documentos legales." },
    { label: "Agenda", key: "agenda", pro: true, desc: "Gestiona plazos, audiencias y recordatorios (PRO)." },
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
  className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
  onClick={(e) => {
    if (e.target === e.currentTarget) onClose?.();
  }}
  style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
>
      {/* En móvil ocupa toda la pantalla; en >=sm actúa como modal */}
      <div
        className={`
          bg-white shadow-lg relative border-2 border-yellow-600
          w-full h-full rounded-none p-5
          sm:h-auto sm:max-w-md sm:rounded-2xl sm:p-6
        `}
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
   Mensaje burbuja del asistente (con TTS/copy/edit/feedback)
============================================================ */
function MensajeBurbuja({ msg, onCopy, onEdit, onFeedback }) {
  return (
    <MensajeBot
      msg={msg}
      onCopy={onCopy}
      onEdit={onEdit}
      onFeedback={onFeedback}
    />
  );
}

/* ============================================================
   Mensaje inicial
============================================================ */
const INIT_MSG = {
  general: {
    role: "system",
    content:
      "🦉 Bienvenido a LitisBot. Consulta tus dudas legales y recibe respuestas rápidas y confiables.",
  },
  pro: {
    role: "system",
    content:
      "🦉 Bienvenido al Asistente Legal LitisBot PRO. Analiza expedientes, agenda plazos y recibe ayuda jurídica con herramientas avanzadas.",
  },
};

/* ============================================================
   Componente Principal (100% responsive)
============================================================ */
export default function LitisBotChatBase({
  user = {},
  pro = false,
  showModal,
  setShowModal,
  expedientes = [],
}) {
  const [adjuntos, setAdjuntos] = useState([]);
  const [mensajes, setMensajes] = useState([pro ? INIT_MSG.pro : INIT_MSG.general]);
  const [input, setInput] = useState("");
  const [grabando, setGrabando] = useState(false);
  const [herramienta, setHerramienta] = useState(null);
  const [alertaAdjuntos, setAlertaAdjuntos] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  const MAX_ADJUNTOS = pro ? 10 : 3;
  const MAX_MB = 25;
  const IA_URL = buildIaUrl();

  // Scroll al final
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  // Auto-expand textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 6 * 28) + "px"; // max 6 líneas
  }, [input]);

  // Exponer cierre (si otras partes quieren cerrar el modal)
  useEffect(() => {
    window.litisbotCloseTools = () => setShowModal?.(false);
    return () => {
      if (window.litisbotCloseTools) delete window.litisbotCloseTools;
    };
  }, [setShowModal]);

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
    }
    if (nuevos.length) setAdjuntos((prev) => [...prev, ...nuevos]);
  }
  function handleRemoveAdjunto(idx) {
    setAdjuntos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleConsultaLegal(mensaje) {
    setCargando(true);
    let respuesta = "";
    try {
      const historial = mensajes
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(IA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: mensaje,
          historial,
          userId: user?.uid || "invitado",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      respuesta = data?.respuesta || "⚠️ No se recibió una respuesta del asistente legal.";
    } catch (err) {
      console.error("❌ Error al consultar LitisBot:", err);
      respuesta =
        "❌ Hubo un error consultando al asistente legal. Intenta nuevamente más tarde.";
    } finally {
      setMensajes((msgs) => [...msgs, { role: "assistant", content: respuesta }]);
      setCargando(false);
    }
  }

  async function handleSend(e) {
    e?.preventDefault?.();
    setAlertaAdjuntos("");

    // Si hay adjuntos, simula recepción y limpia
    if (adjuntos.length > 0) {
      setMensajes((msgs) => [
        ...msgs,
        ...adjuntos.map((file) => ({
          role: "user",
          content: `📎 Archivo subido: <b>${file.name}</b>`,
          tipo: "archivo",
        })),
        ...adjuntos.map((file) => ({
          role: "assistant",
          content: `📑 Archivo recibido: <b>${file.name}</b>.<br/><b>Analizando…</b>`,
          tipo: "archivo",
        })),
      ]);
      setAdjuntos([]);
      setInput("");
      return;
    }

    if (!input.trim()) return;
    setMensajes((msgs) => [...msgs, { role: "user", content: input }]);
    const pregunta = input;
    setInput("");
    await handleConsultaLegal(pregunta);
  }

  // Enter = enviar / Shift+Enter = salto de línea
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  const handleVoice = () => {
    if (grabando) return;
    setGrabando(true);
    setInput((prev) => (prev ? prev + " " : "") + "[dictado de voz…]");
    setTimeout(() => {
      setGrabando(false);
      setInput((prev) => prev + " (audio convertido a texto)");
    }, 1000);
  };

  function handleCopy(text) {
    navigator.clipboard.writeText(String(text || "").replace(/<[^>]+>/g, " "));
  }
  function handleEdit(idx, nuevoTexto) {
    setMensajes((ms) => ms.map((m, i) => (i === idx ? { ...m, content: nuevoTexto } : m)));
  }
  function handleFeedback(idx, type) {
    setMensajes((ms) => ms.map((m, i) => (i === idx ? { ...m, feedback: type } : m)));
  }

  const closeHerramientas = () => {
    setShowModal && setShowModal(false);
    setHerramienta(null);
  };

  return (
    <div
      className="flex flex-col w-full bg-white h-screen"
      onPaste={(e) => {
        if (e.clipboardData?.files?.length) {
          handleFileChange({ target: { files: e.clipboardData.files } });
        }
      }}
    >
      {/* Área del chat */}
      <div
        className={`
          flex-1 overflow-y-auto no-scrollbar
          px-2 sm:px-4 md:px-6
          pt-3 pb-2
          max-w-[100vw]
        `}
        style={{ scrollPaddingBottom: 88 }}
      >
        <div className="flex flex-col gap-2 w-full">
          {mensajes.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} w-full`}>
              <div
                className={`
                  px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-3.5
                  rounded-[1.5rem] shadow max-w-[95%] sm:max-w-[86%] lg:max-w-[70%] break-words
                  ${m.role === "user" ? "text-white self-end" : "bg-yellow-50 text-[#5C2E0B] self-start"}
                  text-sm md:text-[15px] lg:text-[17px] leading-relaxed
                `}
                style={{ background: m.role === "user" ? "#5C2E0B" : undefined, border: 0 }}
              >
                {m.role === "assistant" ? (
                  <MensajeBurbuja
                    msg={m}
                    onCopy={handleCopy}
                    onEdit={(nuevo) => handleEdit(i, nuevo)}
                    onFeedback={(type) => handleFeedback(i, type)}
                  />
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: m.content }} />
                )}
              </div>
            </div>
          ))}

          {cargando && (
            <div className="flex justify-start w-full">
              <div className="px-4 py-2.5 rounded-[1.5rem] shadow bg-yellow-100 text-[#5C2E0B] text-sm md:text-[15px]">
                Buscando en bases legales…
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Barra de entrada */}
      <form
        onSubmit={handleSend}
        className={`
          w-full mx-auto flex items-end gap-2 bg-white shadow-[0_-6px_18px_rgba(0,0,0,0.06)]
          border-t border-yellow-200
          px-2.5 sm:px-4 py-2 sm:py-2.5
          sticky bottom-0 z-[60]
          pb-[env(safe-area-inset-bottom)]
        `}
      >
        {/* Adjuntar */}
        <label
          className={`cursor-pointer flex-shrink-0 p-2 rounded-full hover:opacity-90 transition
            ${adjuntos.length >= MAX_ADJUNTOS ? "opacity-40 pointer-events-none" : ""}`}
          style={{ background: "#5C2E0B", color: "#fff" }}
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

        {/* Previews (scroll horizontal en móvil) */}
        {adjuntos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 max-w-[40vw] sm:max-w-[50%]">
            {adjuntos.map((adj, idx) => (
              <div key={idx} className="relative flex-shrink-0">
                {adj.type?.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(adj)}
                    alt={adj.name}
                    className="rounded-xl border-2 border-yellow-300 shadow object-cover"
                    style={{ width: 96, height: 70 }}
                  />
                ) : (
                  <div
                    className="bg-yellow-50 border-2 border-yellow-300 rounded-xl flex flex-col items-center justify-center text-[#5C2E0B] font-semibold shadow"
                    style={{ width: 116, height: 70, fontSize: 13, padding: 6 }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 2 }}>
                      {adj.name.toLowerCase().endsWith(".pdf")
                        ? "📄"
                        : /\.(doc|docx)$/i.test(adj.name)
                        ? "📝"
                        : /\.(xls|xlsx)$/i.test(adj.name)
                        ? "📊"
                        : "📎"}
                    </div>
                    <div className="truncate w-full text-center" title={adj.name}>
                      {adj.name}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  aria-label="Quitar archivo"
                  className="absolute -top-1 -right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center"
                  onClick={() => handleRemoveAdjunto(idx)}
                  title="Eliminar archivo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Entrada */}
        <textarea
          ref={textareaRef}
          className="flex-1 bg-white outline-none px-2 sm:px-3 py-2 border border-yellow-300 rounded-xl resize-none
                     text-sm md:text-[15px] leading-5"
          placeholder="Escribe o pega tu pregunta legal aquí…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={grabando}
          rows={1}
          style={{ minHeight: 40, maxHeight: 168, overflowY: "auto" }}
        />

        {/* Micrófono */}
        <button
          type="button"
          aria-label="Dictar voz"
          className="p-2 rounded-full flex items-center justify-center hover:opacity-90 transition flex-shrink-0"
          style={{ background: "#5C2E0B", color: "#fff", minWidth: 38, minHeight: 38 }}
          onClick={handleVoice}
          disabled={grabando}
          title="Dictar voz"
        >
          <FaMicrophone size={18} />
        </button>

        {/* Enviar */}
        <button
          type="submit"
          aria-label="Enviar"
          title="Enviar"
          className={`p-2 rounded-full flex items-center justify-center hover:opacity-90 transition flex-shrink-0
            ${!input.trim() && adjuntos.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
          style={{ background: "#5C2E0B", color: "#fff", minWidth: 44, minHeight: 44, fontWeight: "bold" }}
          disabled={(!input.trim() && adjuntos.length === 0) || cargando}
        >
          <MdSend size={22} />
        </button>
      </form>

      {alertaAdjuntos && <div className="text-red-600 text-center w-full pb-2 text-sm">{alertaAdjuntos}</div>}
      {error && <div className="p-2 mt-2 text-red-700 text-base">{error}</div>}

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
      `}</style>
    </div>
  );
}

/* ============================================================
   MensajeBot
============================================================ */
function MensajeBot({ msg, onCopy, onEdit, onFeedback }) {
  const [editando, setEditando] = useState(false);
  const [editValue, setEditValue] = useState(msg.content);
  const [leyendo, setLeyendo] = useState(false);

  function handleSpeak() {
    try {
      setLeyendo(true);
      const plain = (msg.content || "").replace(/<[^>]+>/g, " ");
      const speech = new window.SpeechSynthesisUtterance(plain);
      speech.lang = "es-PE";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(speech);
      speech.onend = () => setLeyendo(false);
    } catch {
      setLeyendo(false);
    }
  }

  function handleGuardar() {
    setEditando(false);
    onEdit && onEdit(editValue);
  }

  return (
    <div className="relative group">
      {!editando ? (
        <div className="flex items-start gap-2">
          <div
            className="flex-1 leading-relaxed text-sm md:text-[15px] lg:text-[17px]"
            style={{ color: "#6b2f12" }}
            dangerouslySetInnerHTML={{ __html: msg.content }}
          />
          <button
            aria-label="Leer en voz alta"
            style={{ background: "#5C2E0B", color: "#fff", minWidth: 34, minHeight: 34 }}
            className="p-1 rounded-full flex items-center justify-center hover:bg-[#8b4e18] transition"
            onClick={handleSpeak}
            disabled={leyendo}
            title="Leer en voz alta"
          >
            <FaVolumeUp size={16} />
          </button>

          <button
            className="ml-1 hover:text-[#8b4e18]"
            onClick={() => onCopy(msg.content)}
            title="Copiar"
            aria-label="Copiar"
          >
            <FaRegCopy />
          </button>
          <button
            className="ml-1 hover:text-[#8b4e18]"
            onClick={() => setEditando(true)}
            title="Editar"
            aria-label="Editar"
          >
            <FaRegEdit />
          </button>
          <button
            className="ml-1 hover:text-green-700"
            onClick={() => onFeedback?.("up")}
            title="Me gusta"
            aria-label="Me gusta"
          >
            <FaRegThumbsUp />
          </button>
          <button
            className="ml-1 hover:text-red-700"
            onClick={() => onFeedback?.("down")}
            title="No me gusta"
            aria-label="No me gusta"
          >
            <FaRegThumbsDown />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="border border-yellow-300 px-2 py-1 rounded flex-1"
          />
          <button onClick={handleGuardar} className="text-green-700 font-semibold">
            Guardar
          </button>
          <button onClick={() => setEditando(false)} className="text-red-700">
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
