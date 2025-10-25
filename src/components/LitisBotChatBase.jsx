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
import { enviarAlChat } from "@/services/chat";

// --- Herramientas integradas en este archivo (mock UI simples).
import HerramientaTercioPena from "./Herramientas/HerramientaTercioPena";
import HerramientaLiquidacionLaboral from "./Herramientas/HerramientaLiquidacionLaboral";

// --- Persistencia local (chat + archivos)
import {
  getMessages,
  saveMessage,
  deleteMessage,
  getFiles,
  saveFile,
  deleteFile,
} from "@/services/chatStorage";
/* ============================================================
   🧠 LitisBot Chat – Utilidades de red unificadas
   Punto central de comunicación con el backend Express
   - buildUrl: resuelve la base URL (local vs producción)
   - enviarALitisbot: envía la pregunta al backend /ia/chat
   - reproducirVozVaronil: pide al backend /voz que genere audio
   =========================================================== */

/**
 * Construye correctamente la URL según el entorno.
 * - En producción usamos VITE_API_BASE_URL (ej. https://web-production-xxxxx.up.railway.app/api)
 * - En local hacemos fallback a http://localhost:3000/api
 *
 * IMPORTANTE:
 *  VITE_API_BASE_URL debe TERMINAR SIN slash final.
 *  Ejemplo correcto:
 *      VITE_API_BASE_URL=https://web-production-7b1c4.up.railway.app/api
 *  y NO:
 *      https://web-production-7b1c4.up.railway.app/api/
 */
export function buildUrl(path = "/ia/chat") {
  const base =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
  return `${base}${path}`;
}

/**
 * 🔊 Reproduce voz varonil con tono "abogado profesional"
 *    usando el endpoint /voz del backend.
 *
 * - NO usamos speechSynthesis del navegador.
 * - El backend devuelve un MP3 ya con la voz correcta.
 * - Esto evita la "segunda voz" y garantiza consistencia.
 */
export async function reproducirVozVaronil(textoPlano) {
  try {
    // Limpieza defensiva: si viene vacío o muy corto, no hablamos.
    const limpio = (textoPlano || "").trim();
    if (!limpio) return;

    const VOZ_URL = buildUrl("/voz");

    // Le mandamos SOLO el texto que debe leerse. Nada de "lee con voz varonil..."
    const resp = await fetch(VOZ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texto: limpio,
      }),
    });

    if (!resp.ok) {
      console.warn(
        "⚠️ No se pudo generar voz en el backend /voz:",
        resp.status,
        await resp.text()
      );
      return;
    }

    // Backend responde audio/mp3 (o similar).
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    // Limpieza de memoria cuando termina
    audio.onended = () => {
      URL.revokeObjectURL(url);
    };
    audio.onerror = (e) => {
      console.error("🔇 Error al reproducir audio:", e);
      URL.revokeObjectURL(url);
    };

    // Intentar reproducir
    audio.play().catch((e) => {
      console.error("🔇 Error al iniciar reproducción:", e);
      URL.revokeObjectURL(url);
    });
  } catch (err) {
    console.error("❌ Error en reproducirVozVaronil():", err);
  }
}

/**
 * 📡 enviarALitisbot(payload, onStreamChunk?)
 *
 * Envía la consulta del usuario al backend Express:
 *   POST /ia/chat
 *
 * Soporta DOS modos de respuesta:
 *   1. Streaming (text/event-stream): el backend manda el texto por partes
 *      - Actualizamos UI parcial usando onStreamChunk(chunk, acumulado)
 *      - Al final devolvemos la respuesta completa y disparamos TTS una sola vez
 *
 *   2. JSON normal:
 *      {
 *        respuesta: "texto final del bot",
 *        sugerencias: [...?]
 *      }
 *      - Disparamos TTS una sola vez con el texto final
 *
 * SIEMPRE devolvemos un objeto:
 *   {
 *     ok: boolean,
 *     respuesta: string,         // texto final ya consolidado
 *     sugerencias: string[]      // si el backend manda sugerencias
 *   }
 */
export async function enviarALitisbot(payload, onStreamChunk) {
  try {
    const IA_URL = buildUrl("/ia/chat");

    const resp = await fetch(IA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Detectar formato de respuesta del backend
    const ctype = resp.headers.get("content-type") || "";

    /* -------------------------------------------------
       CASO 1: STREAMING (Server-Sent Events / text/event-stream)
       ------------------------------------------------- */
    if (resp.body && /event-stream/i.test(ctype)) {
      const reader = resp.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let textoAcumulado = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // chunk "crudo" (pueden venir tokens parciales)
        const chunk = decoder.decode(value, { stream: true });

        // sumar al total
        textoAcumulado += chunk;

        // avisar al frontend para render parcial
        if (onStreamChunk) {
          // onStreamChunk(parcialRecienLlegado, totalHastaAhora)
          onStreamChunk(chunk, textoAcumulado);
        }
      }

      const finalLimpio = (textoAcumulado || "").trim();

      // 🔊 Importante: reproducimos voz SOLO una vez con el final
      if (finalLimpio) {
        reproducirVozVaronil(finalLimpio);
      }

      return {
        ok: true,
        respuesta: finalLimpio || "⚠️ (sin texto recibido)",
        sugerencias: [], // streaming normalmente no trae sugerencias separadas
      };
    }

    /* -------------------------------------------------
       CASO 2: RESPUESTA JSON NORMAL
       ------------------------------------------------- */
    let data = {};
    try {
      data = await resp.json();
    } catch {
      data = {};
    }

    // Manejo de error HTTP
    if (!resp.ok) {
      const mensajeError =
        data?.error ||
        data?.message ||
        `❌ Error HTTP ${resp.status} tratando de procesar tu consulta.`;

      return {
        ok: false,
        respuesta: mensajeError,
        sugerencias: [],
      };
    }

    // Éxito HTTP
    // Estructura esperada:
    // {
    //   respuesta: "texto final del bot",
    //   sugerencias: ["pregunta A", "pregunta B", ...] // opcional
    // }
    const textoFinal =
      data.respuesta ||
      data.text ||
      "⚠️ No se recibió respuesta válida del servidor.";

    const sugerenciasDelBot = Array.isArray(data.sugerencias)
      ? data.sugerencias
      : [];

    const limpio = (textoFinal || "").trim();

    // 🔊 Sólo hablamos UNA VEZ, con el texto final completo
    if (limpio) {
      reproducirVozVaronil(limpio);
    }

    return {
      ok: true,
      respuesta: limpio,
      sugerencias: sugerenciasDelBot,
    };
  } catch (err) {
    console.error("❌ Error al enviar mensaje a LitisBot:", err);

    return {
      ok: false,
      respuesta:
        "❌ Error al procesar la consulta. Verifica tu conexión o inténtalo nuevamente.",
      sugerencias: [],
    };
  }
}

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
          <li key={idx}>
            📅 <b>{e.evento}</b> para el {e.fecha}
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
   Modal de Herramientas
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
   Mensaje burbuja del asistente (wrapper -> usa MensajeBot)
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
   Mensaje inicial (ÚNICA DECLARACIÓN – evita conflictos)
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
   🦉 Componente Principal: LitisBotChatBase
   Controla la interfaz del chat, los estados, archivos adjuntos
   y la comunicación directa con el backend Express (IA jurídica)
============================================================ */
export default function LitisBotChatBase({
  user = {},
  pro = false,
  casoActivo = "default",
  showModal,
  setShowModal,
  expedientes = [],
}) {
  // =================== ESTADOS ===================
  const [adjuntos, setAdjuntos] = useState(() => getFiles(casoActivo) || []);

  const [mensajes, setMensajes] = useState(() => {
    const prev = getMessages(casoActivo);
    if (prev && prev.length) return prev;
    const init = [pro ? INIT_MSG.pro : INIT_MSG.general];
    saveMessage(casoActivo, init[0]); // Guarda mensaje inicial
    return init;
  });

  const [input, setInput] = useState("");
  const [grabando, setGrabando] = useState(false);
  const [herramienta, setHerramienta] = useState(null);
  const [alertaAdjuntos, setAlertaAdjuntos] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // ⚠️ Nueva bandera para evitar envíos dobles / spam de Enter
  const [isSending, setIsSending] = useState(false);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // =================== CONSTANTES ===================
  const MAX_ADJUNTOS = pro ? 10 : 3;
  const MAX_MB = 25;

  // ✅ URL unificada del backend Express (según entorno)
  const IA_URL = buildUrl("/ia/chat");

  /* ------------------------------------------------------------
     ✳️ Justificación técnica:
     buildUrl("/ia/chat") apunta directamente a tu backend Express
     tanto en desarrollo (localhost:3000) como en producción
     (Railway / Vercel). Esto mantiene estable la capa de red.
  ------------------------------------------------------------- */

  // =================== EFECTOS ===================

  // Recargar historial y adjuntos al cambiar de caso
  useEffect(() => {
    const prev = getMessages(casoActivo);
    setMensajes(prev && prev.length ? prev : [pro ? INIT_MSG.pro : INIT_MSG.general]);
    setAdjuntos(getFiles(casoActivo) || []);
  }, [casoActivo, pro]);

  // Scroll automático al final
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  // Expandir textarea dinámicamente
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 6 * 28) + "px";
  }, [input]);

  // Exponer cierre para integraciones externas
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.litisbotCloseTools = () => setShowModal?.(false);
      return () => {
        delete window.litisbotCloseTools;
      };
    }
  }, [setShowModal]);

  // =================== ADJUNTOS ===================
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

  // ============================================================
  // 🧠 CONSULTAS IA – Núcleo de interacción del LitisBot
  // ============================================================
  // Cada función gestiona un contexto distinto (general, jurídico, investigación)
  // y comunica con el backend Express unificado (/api/ia/chat) vía enviarALitisbot().
  // Totalmente compatible con respuestas streaming (SSE) o JSON normal.

  // 🟤 Consulta general (uso cotidiano)
  async function handleConsultaGeneral(pregunta) {
    await procesarConsulta(pregunta, async (onStreamChunk) => {
      return await enviarALitisbot(
        {
          prompt: pregunta.trim(),
          historial: obtenerHistorial(),
          usuarioId: user?.uid || "invitado",
          userEmail: user?.email || "",
          modo: "general",
          materia: "general",
          idioma: "es",
        },
        onStreamChunk
      );
    });
  }

  // ⚖️ Consulta jurídica especializada
  async function handleConsultaLegal({ mensaje, materia = "general" }) {
    await procesarConsulta(mensaje, async (onStreamChunk) => {
      return await enviarALitisbot(
        {
          prompt: mensaje.trim(),
          historial: obtenerHistorial(),
          usuarioId: user?.uid || "invitado",
          userEmail: user?.email || "",
          modo: "juridico",
          materia,
          idioma: "es",
        },
        onStreamChunk
      );
    });
  }

  // 🎓 Consulta académica / investigación jurídica
  async function handleConsultaInvestigacion(pregunta) {
    await procesarConsulta(pregunta, async (onStreamChunk) => {
      return await enviarALitisbot(
        {
          prompt: pregunta.trim(),
          historial: obtenerHistorial(),
          usuarioId: user?.uid || "invitado",
          userEmail: user?.email || "",
          modo: "investigacion",
          materia: "investigacion",
          idioma: "es",
        },
        onStreamChunk
      );
    });
  }

  /* -----------------------------------------------------------
  🧩 Justificación técnica:
  - Pasamos la PREGUNTA explícita a procesarConsulta.
  - Eso evita que procesarConsulta vuelva a leer `input`
    (que ya fue limpiado) o agregue el mensaje two times.
  - Así eliminamos los mensajes duplicados.
  ----------------------------------------------------------- */

  // ============================================================
  // 🧩 HELPERS Y PROCESAMIENTO DE CONSULTAS
  // ============================================================

  // 🧾 Construye el historial en formato OpenAI
  function obtenerHistorial() {
    return mensajes
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role,
        content: m.content || "",
      }));
  }

  // 🧠 Encapsula toda la lógica de procesamiento de la consulta
  async function procesarConsulta(pregunta, fn) {
    const texto = (pregunta || "").trim();
    if (!texto) {
      setError("⚠️ Escribe una consulta antes de enviar.");
      return;
    }

    setCargando(true);
    setIsSending(true);
    setError("");

    // Agregamos SOLO el placeholder del asistente.
    // El mensaje del usuario ya fue agregado en handleSend.
    const tempMsg = { role: "assistant", content: "💬 Analizando tu consulta..." };
    setMensajes((prev) => [...prev, tempMsg]);

    let respuestaAcumulada = "";

    try {
      // Ejecutar función que llama a enviarALitisbot
      // y monitorear chunks de streaming
      const { respuesta } = await fn((chunk) => {
        if (!chunk) return;
        respuestaAcumulada = chunk;
        setMensajes((prev) => {
          const copia = [...prev];
          copia[copia.length - 1] = { role: "assistant", content: chunk };
          return copia;
        });
      });

      const finalText =
        (respuesta || respuestaAcumulada || "⚠️ No se recibió respuesta válida del servidor.")
          .trim();

      const msgFinal = { role: "assistant", content: finalText };

      // Guardar localmente
      saveMessage(casoActivo, msgFinal);

      // Actualizar UI final
      setMensajes((prev) => {
        const copia = [...prev];
        copia[copia.length - 1] = msgFinal;
        return copia;
      });

      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("❌ Error en procesarConsulta:", err);

      let msgError = "❌ Ocurrió un error inesperado al procesar tu consulta.";
      if (err.message?.includes("Falta el prompt")) msgError = "⚠️ La consulta no puede enviarse vacía.";
      else if (err.message?.includes("429")) msgError = "🚫 Has superado el límite de consultas por minuto.";
      else if (err.message?.includes("500")) msgError = "⚙️ Error interno del servidor. Intenta más tarde.";
      else if (err.message?.includes("Failed to fetch")) msgError =
        "🌐 No se pudo conectar al servidor. Verifica tu conexión.";

      setMensajes((prev) => {
        const copia = [...prev];
        copia[copia.length - 1] = { role: "assistant", content: msgError };
        return copia;
      });
    } finally {
      setCargando(false);
      setIsSending(false);
      setInput("");
    }
  }

  // =================== ENVÍO ===================

  async function handleSend(e) {
    e?.preventDefault?.();
    if (isSending) return;

    setAlertaAdjuntos("");

    // Si hay adjuntos, los gestionamos como mensajes "archivo"
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

    // Agregamos el mensaje del usuario SOLO AQUÍ (una sola vez)
    const nuevo = { role: "user", content: pregunta };
    setMensajes((msgs) => [...msgs, nuevo]);
    saveMessage(casoActivo, nuevo);

    // Limpiamos input antes de mandar
    setInput("");

    // Detección automática de modo / materia
    const textoLower = pregunta.toLowerCase();
    const materias = {
      civil: /civil|contrato|obligaci(ón|on)|propiedad|posesi(ón|on)|familia|sucesi(ón|on)/i,
      penal: /penal|delito|crimen|homicidio|robo|violencia|acusaci(ón|on)|condena/i,
      laboral: /laboral|trabajo|sindicato|despido|remuneraci(ón|on)|indemnizaci(ón|on)/i,
      constitucional:
        /constituci(ón|on)|derechos fundamentales|amparo|habeas|tc|tribunal constitucional/i,
      administrativo:
        /administrativo|procedimiento|sancionador|sunat|sunafil|municipalidad/i,
    };

    if (/investigaci(ón|on)|tesis|hipótesis|metodolog/i.test(textoLower)) {
      await handleConsultaInvestigacion(pregunta);
    } else {
      let materiaDetectada = null;
      for (const [materia, regex] of Object.entries(materias)) {
        if (regex.test(textoLower)) {
          materiaDetectada = materia;
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

  // =================== ACCIONES MENSAJES ===================

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
    navigator.clipboard.writeText(String(text || ""));
  }

  function handleEdit(idx, nuevoTexto) {
    setMensajes((ms) => {
      const copia = [...ms];
      copia[idx].content = nuevoTexto;
      // reescribimos en storage:
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

  const closeHerramientas = () => {
    setShowModal?.(false);
    setHerramienta(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if ((input.trim() || adjuntos.length) && !isSending) {
        handleSend(e);
      }
    }
  };

  /* --------------------------- Render ----------------------- */
return (
  <div
    className="flex flex-col w-full items-center bg-white litisbot-fill"
    style={{ minHeight: "100vh" }}
    onPaste={(e) => {
      // permitir pegar archivos directamente
      if (e.clipboardData?.files?.length) {
        handleFileChange({ target: { files: e.clipboardData.files } });
      }
    }}
  >
    {/* ====== FEED DEL CHAT ====== */}
    <div
      id="litisbot-feed"
      className="
        flex flex-col w-full mx-auto bg-white
        overflow-y-auto no-scrollbar
        px-3 sm:px-4
        max-w-full sm:max-w-3xl md:max-w-4xl
        flex-1
      "
      style={{
        // usamos flex-1 para que el feed crezca y la barra quede abajo sticky
        width: "100%",
        minWidth: 0,
        paddingTop: 16,
        paddingBottom: 96, // deja hueco para que la barra no tape los últimos msgs
        borderRadius: 20,
        boxShadow: "0 4px 26px 0 #0001",
        backgroundColor: "#ffffff",
      }}
    >
      <div className="flex flex-col gap-3 w-full">
        {mensajes.map((m, i) => (
          <div
            key={i}
            className={`flex w-full ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`
                rounded-[1.5rem] shadow
                whitespace-pre-wrap break-words leading-relaxed
                text-[16px] sm:text-[15px] md:text-[17px] lg:text-[18px]
                font-medium
                px-4 py-3
                max-w-[92%]          /* móvil: ocupa casi todo el ancho */
                sm:max-w-[85%]       /* tablet */
                md:max-w-[70%]       /* desktop */
                ${
                  m.role === "user"
                    ? "bg-[#5C2E0B] text-white self-end"
                    : "bg-yellow-50 text-[#5C2E0B] self-start border-0"
                }
              `}
              style={{
                border: 0,
              }}
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
            <div
              className="
                px-4 py-3 rounded-[1.5rem] shadow
                bg-yellow-100 text-[#5C2E0B]
                text-[15px] sm:text-[15px] md:text-[17px]
                leading-relaxed max-w-[80%]
              "
            >
              Buscando en bases legales…
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>
    </div>

    {/* ====== BARRA DE ENTRADA STICKY AL FONDO ====== */}
    <form
      onSubmit={handleSend}
      className={`
        w-full mx-auto
        flex items-end gap-2
        rounded-[2rem]
        border-2 border-yellow-300
        shadow-xl
        px-3 py-2 sm:px-4 sm:py-2.5
        max-w-full sm:max-w-3xl md:max-w-4xl
        sticky bottom-0 z-50
        bg-[#fff8e1]
      `}
      style={{
        left: 0,
        right: 0,
      }}
    >
      {/* === Botón Adjuntar === */}
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

      {/* === Previews de adjuntos seguros ===
           Solo mostramos si hay Files/Blobs reales para no romper createObjectURL */}
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
                    className="rounded-xl border-2 border-yellow-300 shadow object-cover"
                    style={{
                      width: 80,
                      height: 60,
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    className="
                      bg-yellow-50 border-2 border-yellow-300 rounded-xl
                      flex flex-col items-center justify-center
                      text-[#5C2E0B] font-semibold shadow text-[12px]
                    "
                    style={{
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

      {/* === Área de texto === */}
      <textarea
        ref={textareaRef}
        className="
          flex-1
          bg-transparent
          outline-none border-none resize-none
          text-[16px] sm:text-[15px] md:text-[17px]
          leading-relaxed text-[#5C2E0B]
          placeholder:text-[#5C2E0B]/60
        "
        placeholder="Escribe o dicta tu pregunta legal…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={grabando}
        rows={1}
        style={{
          minHeight: 40,
          maxHeight: 140,
          overflowY: "auto",
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
        }}
      />

      {/* === Micrófono / Dictado de voz === */}
      <button
        type="button"
        aria-label="Dictar voz"
        className="flex-shrink-0 rounded-full hover:opacity-90 transition"
        style={{
          background: grabando ? "#b71c1c" : "#5C2E0B", // rojo si está grabando
          color: "#fff",
          width: 44,
          height: 44,
          minWidth: 44,
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: grabando ? "not-allowed" : "pointer",
          opacity: grabando ? 0.85 : 1,
        }}
        onClick={handleVoice}
        title={grabando ? "Grabando…" : "Dictar voz"}
        disabled={grabando}
      >
        <FaMicrophone size={18} />
      </button>

      {/* === Enviar === */}
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
          (!input.trim() && adjuntos.length === 0) ||
          cargando ||
          isSending
        }
      >
        <MdSend size={22} />
      </button>
    </form>

    {/* alertas debajo de la barra */}
    {alertaAdjuntos && (
      <div className="text-red-600 text-center w-full pb-2 text-sm max-w-full sm:max-w-3xl md:max-w-4xl">
        {alertaAdjuntos}
      </div>
    )}

    {error && (
      <div className="p-2 mt-2 text-red-700 text-lg max-w-full sm:max-w-3xl md:max-w-4xl">
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
} // 👈👈👈 CIERRE CORRECTO de LitisBotChatBase
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// (esto es lo que faltaba y causa el error de llaves)

/* ============================================================
   MensajeBot (con TTS/copy/edit/feedback)
   Versión prod: usa /voz del backend y NO usa speechSynthesis
   => evita la "doble voz" y fuerza la voz varonil generada server-side
============================================================ */
function MensajeBot({ msg, onCopy, onEdit, onFeedback }) {
  const [editando, setEditando] = useState(false);
  const [editValue, setEditValue] = useState(msg.content);
  const [leyendo, setLeyendo] = useState(false);

  // Base URL del backend (prod usa VITE_API_BASE_URL, local fallback)
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
  const VOZ_URL = `${API_BASE}/voz`;

  async function handleSpeak() {
    try {
      setLeyendo(true);

      // limpiamos HTML antes de mandar al TTS
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = msg.content || "";
      const plainText =
        tempDiv.textContent || tempDiv.innerText || "";

      const resp = await fetch(VOZ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: plainText,
        }),
      });

      if (!resp.ok) {
        console.warn(
          "⚠️ No se pudo generar voz. Status:",
          resp.status,
          await resp.text()
        );
        setLeyendo(false);
        return;
      }

      // MP3 desde backend → reproducir
      const blob = await resp.blob();

      // 👇 ESTA ES LA LÍNEA QUE ROMPÍA EN MODO MOBILE PRE-RENDER:
      // aseguramos que sea un Blob real antes de pasarlo a createObjectURL
      const url = window.URL.createObjectURL(blob);

      const audio = new Audio(url);

      audio.onended = () => {
        setLeyendo(false);
        URL.revokeObjectURL(url);
      };

      audio.onerror = (e) => {
        console.error("🔇 Error al reproducir audio:", e);
        setLeyendo(false);
        URL.revokeObjectURL(url);
      };

      audio
        .play()
        .catch((e) => {
          console.error("🔇 Error al iniciar reproducción:", e);
          setLeyendo(false);
          URL.revokeObjectURL(url);
        });
    } catch (err) {
      console.error("💥 Error en handleSpeak:", err);
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
          {/* Contenido del mensaje del bot */}
          <div
            className="flex-1 leading-relaxed text-[15px] sm:text-[15px] md:text-[17px] lg:text-[18px]"
            style={{ color: "#6b2f12" }}
            dangerouslySetInnerHTML={{ __html: msg.content }}
          />

          {/* Botón leer en voz alta (solo backend TTS) */}
          <button
            aria-label="Leer en voz alta"
            style={{
              background: "#5C2E0B",
              color: "#fff",
              minWidth: 34,
              minHeight: 34,
              opacity: leyendo ? 0.6 : 1,
              cursor: leyendo ? "not-allowed" : "pointer",
            }}
            className="p-1 rounded-full flex items-center justify-center hover:bg-[#8b4e18] transition"
            onClick={handleSpeak}
            disabled={leyendo}
            title={leyendo ? "Reproduciendo..." : "Leer en voz alta"}
          >
            <FaVolumeUp size={16} />
          </button>

          {/* Copiar */}
          <button
            className="ml-1 hover:text-[#8b4e18]"
            onClick={() => onCopy(msg.content)}
            title="Copiar"
            aria-label="Copiar"
          >
            <FaRegCopy />
          </button>

          {/* Editar */}
          <button
            className="ml-1 hover:text-[#8b4e18]"
            onClick={() => setEditando(true)}
            title="Editar"
            aria-label="Editar"
          >
            <FaRegEdit />
          </button>

          {/* Feedback 👍 */}
          <button
            className="ml-1 hover:text-green-700"
            onClick={() => onFeedback("up")}
            title="Me gusta"
            aria-label="Me gusta"
          >
            <FaRegThumbsUp />
          </button>

          {/* Feedback 👎 */}
          <button
            className="ml-1 hover:text-red-700"
            onClick={() => onFeedback("down")}
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
          <button
            onClick={handleGuardar}
            className="text-green-700 font-semibold"
          >
            Guardar
          </button>
          <button
            onClick={() => setEditando(false)}
            className="text-red-700"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
