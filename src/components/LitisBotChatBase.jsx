import React, { useState, useRef, useEffect } from "react";
import {
  FaMicrophone, FaVolumeUp, FaPaperclip,
  FaRegCopy, FaRegEdit, FaRegThumbsUp, FaRegThumbsDown
} from "react-icons/fa";
import { MdSend } from "react-icons/md";
import HerramientaTercioPena from "./Herramientas/HerramientaTercioPena";
import HerramientaLiquidacionLaboral from "./Herramientas/HerramientaLiquidacionLaboral";
import { buscarNormas } from "@/services/firebaseNormasService"; // Asegúrate de la ruta
import LitisBotChatBaseMemoria from './LitisBotChatBaseMemoria';
import LitisBotChatBasePro from "@/components/LitisBotChatBasePro";

// ---------- HERRAMIENTAS FUNCIONALES -----------
// Puedes separar cada una en su archivo después

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
        encodeURIComponent(texto) + `&langpair=es|${idioma}`
      );
      const data = await res.json();
      const traducido = data?.responseData?.translatedText || "(sin traducción)";
      setResultado(traducido);
    } catch (e) {
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
        onChange={e => setTexto(e.target.value)}
        placeholder="Escribe el texto aquí..."
      />
      <div className="flex items-center gap-2">
        <label>Idioma:</label>
        <select className="border p-1 rounded" value={idioma} onChange={e => setIdioma(e.target.value)}>
          <option value="en">Inglés</option>
          <option value="fr">Francés</option>
          <option value="pt">Portugués</option>
          <option value="it">Italiano</option>
          <option value="de">Alemán</option>
        </select>
        <button className="px-4 py-2 bg-blue-700 text-white rounded" onClick={traducir} disabled={cargando || !texto}>
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
      const result = `Archivo "${file.name}" analizado: [Extracto legal simulado]`;
      setResultado(result);
      setCargando(false);
    }, 1200);
  }

  return (
    <div className="py-2 flex flex-col gap-3">
      <label className="font-bold">Sube un archivo PDF, Word o audio:</label>
      <input type="file" onChange={e => setFile(e.target.files[0])} />
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
    setAgenda(a => [...a, { evento, fecha }]);
    setEvento(""); setFecha("");
  }

  return (
    <div className="py-2 flex flex-col gap-3">
      <label className="font-bold">Nuevo evento o audiencia:</label>
      <input type="text" className="border rounded p-1" placeholder="Descripción del evento" value={evento} onChange={e => setEvento(e.target.value)} />
      <input type="date" className="border rounded p-1" value={fecha} onChange={e => setFecha(e.target.value)} />
      <button className="px-4 py-2 bg-green-700 text-white rounded" onClick={agregarEvento} disabled={!evento || !fecha}>Agregar a agenda</button>
      <ul className="mt-2">
        {agenda.map((e, idx) => (
          <li key={idx} className="text-sm">📅 <b>{e.evento}</b> para el {e.fecha}</li>
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
    setRecords(r => [...r, { texto, fecha }]);
    setTexto(""); setFecha("");
  }

  return (
    <div className="py-2 flex flex-col gap-3">
      <label className="font-bold">Nuevo recordatorio:</label>
      <input type="text" className="border rounded p-1" placeholder="¿Qué debes recordar?" value={texto} onChange={e => setTexto(e.target.value)} />
      <input type="datetime-local" className="border rounded p-1" value={fecha} onChange={e => setFecha(e.target.value)} />
      <button className="px-4 py-2 bg-orange-600 text-white rounded" onClick={agregarRecordatorio} disabled={!texto || !fecha}>Agregar recordatorio</button>
      <ul className="mt-2">
        {records.map((r, idx) => (
          <li key={idx} className="text-sm">⏰ <b>{r.texto}</b> para {r.fecha}</li>
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
    "Alega siempre con fundamento legal y preciso."
  ];

  function guardarNota() {
    if (!nota) return;
    setNotas(n => [...n, nota]);
    setNota("");
  }

  return (
    <div className="py-2 flex flex-col gap-3">
      <div className="font-bold mb-2">Guía rápida para audiencia:</div>
      <ul className="list-disc ml-5 text-sm text-gray-700">
        {TIPS.map(tip => <li key={tip}>{tip}</li>)}
      </ul>
      <textarea className="border rounded p-2 mt-3" rows={2} placeholder="Agrega una nota rápida sobre tu audiencia" value={nota} onChange={e => setNota(e.target.value)} />
      <button className="px-4 py-2 bg-purple-700 text-white rounded" onClick={guardarNota} disabled={!nota}>Guardar nota</button>
      <ul className="mt-2">
        {notas.map((n, idx) => <li key={idx} className="text-sm">📝 {n}</li>)}
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
        encodeURIComponent(texto) + `&langpair=es|${idioma}`
      );
      const data = await res.json();
      const traducido = data?.responseData?.translatedText || "(sin traducción)";
      setResultado(traducido);
    } catch (e) {
      setResultado("Error de traducción");
    }
    setCargando(false);
  }

  return (
    <div className="py-2 flex flex-col gap-3">
      <label className="font-bold">Texto a traducir:</label>
      <textarea className="border rounded p-1" rows={2} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Escribe el texto aquí..." />
      <div className="flex items-center gap-2">
        <label>Idioma:</label>
        <select className="border p-1 rounded" value={idioma} onChange={e => setIdioma(e.target.value)}>
          <option value="en">Inglés</option>
          <option value="fr">Francés</option>
          <option value="pt">Portugués</option>
          <option value="it">Italiano</option>
          <option value="de">Alemán</option>
        </select>
        <button className="px-4 py-2 bg-blue-700 text-white rounded" onClick={traducir} disabled={cargando || !texto}>
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

// --------- MODAL DE HERRAMIENTAS ---------
function ModalHerramientas({ onClose, herramienta, setHerramienta, pro, error, setError }) {
 const HERRAMIENTAS = [
  { label: "Multilingüe", key: "multilingue", pro: false, desc: "Haz tus consultas legales en cualquier idioma." },
  { label: "Modo Audiencia", key: "audiencia", pro: true, desc: "Guía de objeciones, alegatos y tips de litigio para audiencias (PRO)." },
  { label: "Analizar Archivo", key: "analizador", pro: true, desc: "Sube archivos PDF, Word o audio para análisis legal (PRO)." },
  { label: "Traducir", key: "traducir", pro: false, desc: "Traduce textos o documentos legales." },
  { label: "Agenda", key: "agenda", pro: true, desc: "Gestiona tus plazos, audiencias y recordatorios (PRO)." },
  { label: "Recordatorios", key: "recordatorios", pro: true, desc: "Configura alertas importantes para tu práctica legal (PRO)." },
  { label: "Tercio de la Pena", key: "tercio_pena", pro: false, desc: "Calcula el tercio de la pena impuesta según el Código Penal." },
  { label: "Liquidación Laboral", key: "liquidacion_laboral", pro: false, desc: "Calcula CTS, vacaciones, gratificaciones y beneficios sociales." }
];

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
      case "tercio_pena": return <HerramientaTercioPena />;
      case "liquidacion_laboral": return <HerramientaLiquidacionLaboral />;
      default:
        return null;
    }
  }

  function handleClick(key, proRequired) {
    if (proRequired && !pro) {
      setError && setError("Hazte PRO para usar esta herramienta");
      setTimeout(() => setError && setError(""), 2000);
      return;
    }
    setHerramienta(key);
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center px-3">
      <div className="bg-white rounded-2xl shadow-lg p-7 min-w-[350px] max-w-md w-full relative border-2 border-yellow-600">
        <button onClick={onClose} className="absolute right-3 top-2 text-yellow-700 text-2xl font-bold">×</button>
        <h2 className="font-bold text-2xl mb-4 text-yellow-700 flex items-center gap-2">
          Herramientas LitisBot
        </h2>
        {!herramienta ? (
          <div className="flex flex-col gap-2">
            {HERRAMIENTAS.map(h => (
              <button
                key={h.key}
                className={`flex flex-col text-left px-4 py-2 rounded-xl border border-yellow-200 transition
                ${(!h.pro || pro) ? "bg-yellow-50 hover:bg-yellow-100 text-yellow-900" : "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"}`}
                onClick={() => handleClick(h.key, h.pro)}
                disabled={h.pro && !pro}
                title={h.desc}
              >
                <span className="font-bold">{h.label} {h.pro && <span className="ml-1 text-xs bg-yellow-200 px-2 py-0.5 rounded">PRO</span>}</span>
                <span className="text-xs">{h.desc}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <button onClick={() => setHerramienta(null)} className="text-xs text-yellow-700 underline mb-2">← Volver a herramientas</button>
            {renderHerramienta()}
          </>
        )}
        {error && <div className="mt-2 text-red-700 text-sm">{error}</div>}
      </div>
    </div>
  );
}

// MENSAJE BURBUJA
function MensajeBot({ msg, onCopy, onEdit, onFeedback }) {
  const [editando, setEditando] = useState(false);
  const [editValue, setEditValue] = useState(msg.content);
  const [leyendo, setLeyendo] = useState(false);

  function handleSpeak() {
    setLeyendo(true);
    const plain = msg.content.replace(/<[^>]+>/g, " ");
    const speech = new window.SpeechSynthesisUtterance(plain);
    speech.lang = "es-PE";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(speech);
    speech.onend = () => setLeyendo(false);
  }

  function handleGuardar() {
    setEditando(false);
    onEdit && onEdit(editValue);
  }
  return (
    <div className="relative group">
      {!editando ? (
        <div className="flex items-center gap-2">
          <div
            className="flex-1"
            dangerouslySetInnerHTML={{ __html: msg.content }}
            style={{ fontSize: 21, color: "#6b2f12" }}
          />
          <button style={{ background: "#5C2E0B", color: "#fff", minWidth: 36, minHeight: 36 }}
            className="p-1 rounded-full flex items-center justify-center hover:bg-yellow-600"
            onClick={handleSpeak} title="Leer este mensaje en voz alta" disabled={leyendo}>
            <FaVolumeUp size={18} />
          </button>
          <button className="ml-1 hover:text-yellow-800" onClick={() => onCopy(msg.content)} title="Copiar"><FaRegCopy /></button>
          <button className="ml-1 hover:text-yellow-800" onClick={() => setEditando(true)} title="Editar"><FaRegEdit /></button>
          <button className="ml-1 hover:text-green-700" onClick={() => onFeedback("up")} title="Me gusta"><FaRegThumbsUp /></button>
          <button className="ml-1 hover:text-red-700" onClick={() => onFeedback("down")} title="No me gusta"><FaRegThumbsDown /></button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input value={editValue} onChange={e => setEditValue(e.target.value)}
            className="border border-yellow-300 px-2 py-1 rounded"
            style={{ fontSize: 20, color: "#6b2f12" }} />
          <button onClick={handleGuardar} className="text-green-700">Guardar</button>
          <button onClick={() => setEditando(false)} className="text-red-700">Cancelar</button>
        </div>
      )}
    </div>
  );
}

// -------------- MENSAJE INICIAL --------------
const INIT_MSG = {
  general: {
    role: "system",
    content: "🦉 Bienvenido a LitisBot. Consulta tus dudas legales y recibe respuestas rápidas y confiables."
  },
  pro: {
    role: "system",
    content: "🦉 Bienvenido al Asistente Legal LitisBot PRO. Analiza expedientes, agenda plazos y recibe ayuda jurídica con herramientas avanzadas."
  }
};

// -------------- COMPONENTE PRINCIPAL --------------
export default function LitisBotChatBase({ user = {}, pro = false }) {
  const [mensajes, setMensajes] = useState([
    {
      role: "system",
      content: pro
        ? "🦉 Bienvenido al Asistente Legal LitisBot PRO. Analiza expedientes, agenda plazos y recibe ayuda jurídica con herramientas avanzadas."
        : "🦉 Bienvenido a LitisBot. Consulta tus dudas legales y recibe respuestas rápidas y confiables.",
    },
  ]);
  const [input, setInput] = useState("");
  const [grabando, setGrabando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [showModalHerramientas, setShowModalHerramientas] = useState(false);
  const [herramienta, setHerramienta] = useState(null);
  const [error, setError] = useState("");

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        6 * 28
      )}px`;
    }
  }, [input]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim()) return;
    const msg = input.trim();
    setMensajes((m) => [...m, { role: "user", content: msg }]);
    setInput("");
    setCargando(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/ia-litisbotchat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: msg,
            historial: [],
            userId: user?.uid || "invitado",
          }),
        }
      );
      const data = await res.json();
      setMensajes((m) => [
        ...m,
        { role: "assistant", content: data.respuesta || "⚠️ Sin respuesta." },
      ]);
    } catch {
      setMensajes((m) => [
        ...m,
        { role: "assistant", content: "❌ Error de conexión con el asistente." },
      ]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col items-center w-full h-full px-2 sm:px-4 py-4">
      <div className="w-full max-w-4xl flex flex-col gap-3 overflow-y-auto flex-grow mb-3">
        {mensajes.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`p-4 rounded-3xl shadow max-w-[85%] break-words text-lg ${
                m.role === "user"
                  ? "bg-brown-700 text-white"
                  : "bg-yellow-100 text-brown-800"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {cargando && (
          <div className="text-yellow-800">
            ⏳ Consultando en bases legales...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="w-full max-w-4xl flex items-end gap-2 bg-white shadow-lg border-2 border-yellow-400 rounded-3xl p-2 sm:p-3"
      >
        <label className="cursor-pointer p-2 rounded-full bg-yellow-700 hover:bg-yellow-800 text-white">
          <FaPaperclip size={20} />
          <input type="file" className="hidden" />
        </label>

        <textarea
          ref={textareaRef}
          className="flex-1 resize-none text-brown-800 text-base sm:text-lg px-3 py-2 rounded-xl border-none focus:outline-none"
          rows={1}
          placeholder="Escribe tu pregunta legal…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <button
          type="button"
          className="p-2 rounded-full bg-yellow-700 hover:bg-yellow-800 text-white"
          onClick={() => setShowModalHerramientas(true)}
          title="Herramientas"
        >
          ⚙️
        </button>

        <button
          type="button"
          className="p-2 rounded-full bg-yellow-700 hover:bg-yellow-800 text-white"
          onClick={() => {
            setGrabando(true);
            setTimeout(() => {
              setInput((i) => i + " (audio simulado)");
              setGrabando(false);
            }, 1000);
          }}
          disabled={grabando}
        >
          <FaMicrophone size={20} />
        </button>

        <button
          type="submit"
          className="p-2 rounded-full bg-yellow-700 hover:bg-yellow-800 text-white"
          disabled={!input.trim() || cargando}
        >
          <MdSend size={24} />
        </button>
      </form>

      {showModalHerramientas && (
        <ModalHerramientas
          onClose={() => {
            setShowModalHerramientas(false);
            setHerramienta(null);
            setError("");
          }}
          herramienta={herramienta}
          setHerramienta={setHerramienta}
          pro={pro}
          error={error}
          setError={setError}
        />
      )}
    </div>
  );
}