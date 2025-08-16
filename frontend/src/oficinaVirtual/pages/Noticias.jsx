import React, { useEffect, useState } from "react";
import { useNoticiasGuardadas } from "@/oficinaVirtual/hooks/useNoticiasGuardadas";
import { useAuth } from "@/context/AuthContext";

const PROXY = "https://buholex-news-proxy-production.up.railway.app/api/noticias-juridicas";
const PAGE_SIZE = 12;

const AREAS = [
  "penal", "civil", "laboral", "constitucional", "familiar", "administrativo"
];
const AREAS_LABEL = {
  penal: "Penal",
  civil: "Civil",
  laboral: "Laboral",
  constitucional: "Constitucional",
  familiar: "Familiar",
  administrativo: "Administrativo",
};
const OTRAS_ESPECIALIDADES = [
  "tributario", "comercial", "procesal", "internacional", "ambiental",
  "minero", "propiedad intelectual", "consumidor", "seguridad social",
  "notarial", "registral", "penitenciario"
];
const TEMAS_AFINES_SUG = [
  "ética judicial",
  "filosofía del derecho",
  "innovación legal",
  "acceso a la justicia",
  "derechos humanos",
  "jurisprudencia",
  "inteligencia artificial",
  "género y derecho",
  "corrupción",
  "compliance"
];

function esReciente(fecha) {
  const hoy = new Date();
  const fNoticia = new Date(fecha);
  const diff = (hoy - fNoticia) / (1000 * 60 * 60 * 24);
  return diff <= 5;
}

export default function NoticiasOficina() {
  const { guardadas, guardarNoticia, quitarNoticia } = useNoticiasGuardadas();
  const [especialidad, setEspecialidad] = useState(AREAS[0]);
  const [otrasOpen, setOtrasOpen] = useState(false);
  const [afinesOpen, setAfinesOpen] = useState(false);
  const [busquedaAfin, setBusquedaAfin] = useState("");
  const [modoAfin, setModoAfin] = useState(false);

  const [noticias, setNoticias] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [soloGuardadas, setSoloGuardadas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Lógica de fetch
  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setPage(1);

    // Por defecto, búsqueda afín o por especialidad
    let query = modoAfin
      ? (busquedaAfin?.trim() || especialidad)
      : `${especialidad}+derecho+site:.pe`;

    fetch(`${PROXY}?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => { if (!cancelado) setNoticias(data || []); })
      .finally(() => { if (!cancelado) setLoading(false); });

    return () => { cancelado = true; };
  }, [especialidad, modoAfin, busquedaAfin]);

  // Filtro local por búsqueda y tags
  let filtradas = noticias
    .filter(n =>
      (soloGuardadas || esReciente(n.fecha)) &&
      (
        n.titulo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        n.resumen?.toLowerCase().includes(busqueda.toLowerCase()) ||
        (n.tagsAI && n.tagsAI.some(tag => tag.toLowerCase().includes(busqueda.toLowerCase())))
      )
    );

  // Paginación
  const total = filtradas.length;
  const paginadas = filtradas.slice(0, page * PAGE_SIZE);

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-6 py-8 min-h-[70vh]">
      <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-2 tracking-tight text-[#b03a1a]">
        Noticias Jurídicas Inteligentes
      </h2>
      {/* Botones de especialidad */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {AREAS.map(area => (
          <button
            key={area}
            onClick={() => { setEspecialidad(area); setModoAfin(false); setOtrasOpen(false); setAfinesOpen(false); }}
            className={`px-4 py-2 rounded-xl font-bold border shadow transition-all
              ${especialidad === area && !modoAfin
                ? "bg-[#b03a1a] text-white border-[#b03a1a] shadow-lg scale-105"
                : "bg-[#fdf5ee] text-[#b03a1a] border-[#b03a1a] hover:bg-[#f3ece9]"}
            `}
          >
            {AREAS_LABEL[area]}
          </button>
        ))}
        <button
          onClick={() => { setOtrasOpen(v => !v); setAfinesOpen(false); setModoAfin(false); }}
          className="px-4 py-2 rounded-xl font-bold border border-yellow-700 bg-yellow-100 text-[#b03a1a] hover:bg-yellow-200 relative"
        >
          Otras especialidades <span className="ml-1 text-xs">▼</span>
        </button>
        <button
          onClick={() => { setAfinesOpen(true); setOtrasOpen(false); setModoAfin(true); setBusquedaAfin(""); }}
          className={`px-4 py-2 rounded-xl font-bold border bg-blue-100 text-[#164a8a] border-blue-700 hover:bg-blue-200 transition
            ${modoAfin ? "shadow-lg" : ""}`}
        >
          Temas afines
        </button>
        <button
          onClick={() => setSoloGuardadas(v => !v)}
          className={`px-4 py-2 rounded-xl font-bold border transition ml-3
            ${soloGuardadas
              ? "bg-blue-700 text-white border-blue-700 shadow"
              : "bg-[#fdf5ee] text-[#164a8a] border-blue-700 hover:bg-[#e5ecfa]"}
          `}
        >
          {soloGuardadas ? "Ver Recientes" : "Ver Guardadas"}
        </button>
      </div>

      {/* Menú de otras especialidades */}
      {otrasOpen && (
        <div className="flex flex-wrap justify-center gap-2 mb-4 animate-fade-in">
          {OTRAS_ESPECIALIDADES.map(area => (
            <button
              key={area}
              onClick={() => {
                setEspecialidad(area);
                setModoAfin(false);
                setOtrasOpen(false);
                setAfinesOpen(false);
              }}
              className={`px-4 py-2 rounded-xl font-semibold border transition
                ${especialidad === area && !modoAfin
                  ? "bg-[#b03a1a] text-white border-[#b03a1a] shadow"
                  : "bg-white text-[#b03a1a] border-[#b03a1a] hover:bg-[#ffe6d6]"}
              `}
            >
              {area.charAt(0).toUpperCase() + area.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Modal/box de Temas afines */}
      {afinesOpen && modoAfin && (
        <div className="flex flex-col items-center gap-3 mb-6 animate-fade-in bg-white/95 px-4 py-6 rounded-xl shadow-lg border border-[#b03a1a]/15 max-w-lg mx-auto">
          <div className="flex justify-between items-center w-full mb-2">
            <span className="font-bold text-lg text-[#164a8a]">Buscar noticias por temas éticos, doctrinales o tecnológicos</span>
            <button onClick={() => { setAfinesOpen(false); setModoAfin(false); }} className="ml-4 text-gray-500 text-xl hover:text-[#b03a1a] font-bold">&times;</button>
          </div>
          <input
            type="text"
            value={busquedaAfin}
            onChange={e => setBusquedaAfin(e.target.value)}
            placeholder="Ej: ética judicial, filosofía, jurisprudencia, AI, género..."
            className="border border-[#164a8a] px-4 py-3 rounded-lg text-lg w-full"
            onKeyDown={e => { if (e.key === "Enter") { setEspecialidad(busquedaAfin || "afines"); setAfinesOpen(false); } }}
          />
          <button
            disabled={!busquedaAfin.trim()}
            onClick={() => {
              setEspecialidad(busquedaAfin || "afines");
              setAfinesOpen(false);
            }}
            className="mt-2 px-6 py-2 rounded-lg bg-[#164a8a] text-white font-bold text-base shadow hover:bg-blue-900 transition disabled:opacity-50"
          >
            Buscar
          </button>
          <div className="flex flex-wrap gap-2 mt-3">
            {TEMAS_AFINES_SUG.map(sug => (
              <button
                key={sug}
                onClick={() => {
                  setBusquedaAfin(sug);
                  setEspecialidad(sug);
                  setAfinesOpen(false);
                }}
                className="px-3 py-1 bg-[#e5ecfa] text-[#164a8a] rounded-full font-semibold hover:bg-[#d6e0f7]"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Barra de búsqueda */}
      <div className="w-full max-w-xl mx-auto mb-8 flex flex-col sm:flex-row gap-4 justify-center">
        <input
          type="search"
          className="border border-[#b03a1a]/40 text-lg px-4 py-3 rounded-xl flex-1 outline-[#b03a1a] font-semibold shadow"
          placeholder="Buscar por palabra clave, interés o resumen..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {/* Noticias en grid responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full text-center text-2xl py-10 text-gray-500">Cargando noticias...</div>
        ) : paginadas.length === 0 ? (
          <div className="col-span-full text-center text-xl py-10 text-[#b03a1a] font-semibold">
            No hay noticias en esta especialidad.<br />
            Prueba con otra área o busca un término más general.
          </div>
        ) : (
          paginadas.map((n, idx) => (
            <div
              key={n.enlace || idx}
              className="bg-white rounded-3xl shadow-2xl border border-[#f1e5dc] p-6 flex flex-col gap-2 hover:shadow-[0_6px_36px_-8px_rgba(176,58,26,0.09)] transition-all min-h-[250px]"
            >
              <div className="flex flex-wrap justify-between items-center text-sm font-medium mb-2">
                <span className="text-[#b03a1a]">{n.fuente || "Google Noticias"} | {n.fecha?.substring(0, 10)}</span>
                <span className="font-bold ml-2 text-green-700">Libre</span>
              </div>
              <a
                href={n.enlace}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg sm:text-xl font-bold mb-1 text-[#b03a1a] hover:underline hover:text-[#a87247] transition line-clamp-3"
              >
                {n.titulo}
              </a>
              <p className="text-base text-gray-700 mb-1 line-clamp-3">{n.resumen}</p>
              <div className="flex flex-wrap gap-2 my-1">
                {n.tagsAI?.map(tag => (
                  <span key={tag} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">{tag}</span>
                ))}
              </div>
              <div className="flex gap-2 mt-2 items-center justify-between">
                {n.id && guardadas.includes(n.id) ? (
                  <button
                    className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-bold shadow hover:bg-blue-800 transition"
                    onClick={() => quitarNoticia(n.id)}
                  >Guardada</button>
                ) : n.id ? (
                  <button
                    className="px-4 py-2 rounded-lg bg-[#b03a1a] text-white text-sm font-bold shadow hover:bg-[#a87247] transition"
                    onClick={() => guardarNoticia(n.id)}
                  >Guardar</button>
                ) : null}
                <a
                  href={n.enlace}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#164a8a] font-semibold hover:underline hover:text-[#b03a1a] ml-auto text-base"
                >
                  Ver más &rarr;
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Paginador */}
      <div className="flex justify-center py-8">
        {paginadas.length < total && (
          <button
            className="px-8 py-3 rounded-xl bg-[#164a8a] text-white font-bold text-lg shadow hover:bg-[#2057a0] transition"
            onClick={() => setPage(p => p + 1)}
          >
            Ver más noticias
          </button>
        )}
      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn .5s cubic-bezier(.36,.07,.19,.97);
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(12px);}
          100% { opacity: 1; transform: none;}
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
