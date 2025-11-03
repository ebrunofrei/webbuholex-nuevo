import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

/* ================== Utils de base ================== */
// Detecta si una URL es localhost
function isLocal(u = "") {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?/i.test(u);
}
// Normaliza una base agregando /api al final si falta
function normalizeApiBase(input = "") {
  const raw = String(input).trim().replace(/\/+$/, "");
  if (!raw) return "";
  let base = raw;
  if (!/\/api$/i.test(base)) base += "/api";
  return base.replace(/\/api(?:\/api)+$/i, "/api");
}

// Lee env (Vite) y calcula base segura
const RAW_ENV = import.meta?.env?.VITE_NEWS_API_BASE_URL || "";
const ENV_BASE = normalizeApiBase(RAW_ENV);

// Regla:
// - PROD: usa ENV si existe y NO es localhost; si no, relativo "/api".
// - DEV: siempre relativo "/api" (usa proxy de Vite).
export const API_BASE = import.meta.env.PROD
  ? (ENV_BASE && !isLocal(ENV_BASE) ? ENV_BASE : "/api")
  : "/api";

// Helpers de URL
const build = (path = "", qsObj) => {
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE}${p}`;
  if (!qsObj) return url;
  const qs = new URLSearchParams(qsObj);
  return `${url}?${qs.toString()}`;
};

// Endpoints preferidos/alternativos
const NEWS_PATH_PRIMARY = "/noticias";
const NEWS_PATH_FALLBACK = "/news";

/* ============== Normalización de payload ============== */
const SHAPES = ["items", "articles", "results", "noticias", "docs"];

function coalesceArray(payload) {
  if (Array.isArray(payload)) return payload;
  for (const k of SHAPES) {
    if (Array.isArray(payload?.[k])) return payload[k];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
}

function normalizeNewsItem(x, idx) {
  const proveedor = x.proveedor || x.source?.name || x.provider || x.feed || "";
  return {
    id: x.id || x._id || x.guid || `news-${idx}`,
    titulo: x.titulo || x.title || x.headline || "",
    resumen: x.resumen || x.description || x.summary || "",
    url: x.url || x.link || x.enlace || "",
    proveedor,
    proveedorLogo: x.proveedorLogo || x.source?.logo || x.logo || "",
    fecha: x.fecha || x.publishedAt || x.date || x.pubDate || null,
    imagenProveedor: x.imagenProveedor || x.providerImage || x.source?.image || "",
    imagenPagina: x.imagenPagina || x.image || x.thumbnail || x.enclosure?.url || "",
    imagen: x.imagen || x.cover || "",
    tipo: x.tipo || x.category || x.section || "",
    especialidad: x.especialidad || x.tag || x.topic || "",
  };
}

function normalizeNewsResponse(payload) {
  const arr = coalesceArray(payload).map(normalizeNewsItem);
  const page = payload?.pagination?.page ?? payload?.page ?? 1;
  const total = payload?.pagination?.total ?? arr.length ?? 0;
  return { items: arr, pagination: { page, total } };
}

/* ================== Contexto ================== */
const NoticiasContext = createContext();

export function useNoticias() {
  return useContext(NoticiasContext);
}

export function NoticiasProvider({ children }) {
  const [showNoticias, setShowNoticias] = useState(false);
  const [noticias, setNoticias] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // (Opcional) estado de filtros para futuras vistas
  const [filtros, setFiltros] = useState({
    tipo: "",          // "juridica" | "general"
    especialidad: "",  // "penal" | "civil" | ...
    q: "",
    lang: "es",
    page: 1,
    limit: 12,
  });

  const fetchNoticias = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Construye QS solo con valores definidos
    const { tipo, especialidad, q, lang, page = 1, limit = 12 } = filtros;
    const qs = {};
    if (tipo) qs.tipo = tipo;
    if (especialidad) qs.especialidad = especialidad;
    if (q) qs.q = q;
    if (lang) qs.lang = lang;
    qs.page = String(page);
    qs.limit = String(limit);

    // Timeout con AbortController (12s)
    const ctrl = new AbortController();
    const to = setTimeout(
      () => ctrl.abort(new DOMException("timeout", "AbortError")),
      12000
    );

    try {
      // 1) Intento principal: /api/noticias
      let res = await fetch(build(NEWS_PATH_PRIMARY, qs), {
        signal: ctrl.signal,
        headers: { Accept: "application/json" },
      });

      // 2) Si el proxy externo usa /api/news, haz fallback transparente
      if (res.status === 404) {
        res = await fetch(build(NEWS_PATH_FALLBACK, qs), {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
        });
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();

      const { items, pagination } = normalizeNewsResponse(raw);
      setNoticias(items);
      setPagination(pagination);
    } catch (err) {
      console.error("Error cargando noticias:", err);
      setError("No se pudieron cargar las noticias.");
      setNoticias([]);
      setPagination({ page: 1, total: 0 });
    } finally {
      clearTimeout(to);
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    fetchNoticias();
  }, [fetchNoticias]);

  const toggleNoticias = () => setShowNoticias((prev) => !prev);

  const value = {
    showNoticias,
    setShowNoticias,
    toggleNoticias,
    noticias,
    setNoticias,
    pagination,
    filtros,
    setFiltros,
    fetchNoticias,
    loading,
    error,
    API_BASE, // por si lo necesitan otros componentes
  };

  return (
    <NoticiasContext.Provider value={value}>
      {children}
    </NoticiasContext.Provider>
  );
}
