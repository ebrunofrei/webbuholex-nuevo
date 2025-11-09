// src/features/noticias/useNoticiasGenerales.js
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

/** Punto base para /api/news (solo generales/live) */
const NEWS_BASE =
    (import.meta.env.VITE_NEWS_API_BASE_URL || import.meta.env.VITE_API_BASE || API_BASE)
        .replace(/\/$/, "");

/** Ventanas de “densidad” por tema (reintentos con distintos sinceDays) */
const RETRIES_BY_TEMA = {
  economia: [3, 7],
  tecnologia: [3, 7],
  default: [3, 5],
};

const makeKey = ({ tema, q, providersKey, sinceDays, page, limit, lang, vista }) =>
  [
    "general",
    vista || "home",
    tema || "actualidad",
    (q || "").trim(),
    providersKey || "-",
    sinceDays || "",
    page || 1,
    limit || 20,
    lang || "es",
  ].join("::");

/** Hook para consumir /api/news con heurística y memo de dependencias */
export function useNoticiasGenerales({
  tema,
  q,
  providers,
  page = 1,
  limit = 20,
  lang = "es",
  vista = "home",
}) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState({ loading: false, error: null, page, hasMore: false });
  const acRef = useRef(null);

  const windows = RETRIES_BY_TEMA[tema] || RETRIES_BY_TEMA.default;
  const providersKey = useMemo(
    () => (Array.isArray(providers) ? providers.slice().sort().join("|") : ""),
    [providers]
  );

  const load = useCallback(
    async ({ noCache = false } = {}) => {
      acRef.current?.abort?.();
      const ac = new AbortController();
      acRef.current = ac;

      setState((s) => ({ ...s, loading: true, error: null }));

      let data = null;
      for (let i = 0; i < windows.length; i++) {
        const sinceDays = windows[i];

        const url = new URL(`${API_BASE}/api/news`);
        if (tema) url.searchParams.set("tema", tema);
        if (q) url.searchParams.set("q", q);
        if (providersKey) url.searchParams.set("providers", providersKey.replaceAll("|", ","));
        url.searchParams.set("sinceDays", String(sinceDays));
        url.searchParams.set("page", String(page));
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("lang", lang || "es");
        if (noCache && i === 0) url.searchParams.set("_", String(Date.now()));

        const res = await fetch(url.toString(), { signal: ac.signal });
        const d = await res.json().catch(() => ({}));
        const MIN_DENSITY = 8;

        if (Array.isArray(d?.items) && (d.items.length >= MIN_DENSITY || i === windows.length - 1)) {
          data = d;
          break;
        }
      }

      if (!ac.signal.aborted) {
        if (data?.ok) {
          setItems(Array.isArray(data.items) ? data.items : []);
          const total = Number(data.total || 0);
          const curPage = Number(data.page || page || 1);
          setState({
            loading: false,
            error: null,
            page: curPage,
            hasMore: curPage * limit < total,
          });
        } else {
          setState((s) => ({ ...s, loading: false, error: data?.error || "FETCH_ERROR" }));
        }
      }
    },
    // NOTA: API_BASE es estable en runtime; no lo agregamos como dep (eslint warning)
    [tema, q, providersKey, page, limit, lang, windows]
  );

  // clave de caché/memo para re-disparar carga (incluye la primera ventana)
  const cacheKey = useMemo(
    () =>
      makeKey({
        tema,
        q,
        providersKey,
        sinceDays: windows[0],
        page,
        limit,
        lang,
        vista,
      }),
    [tema, q, providersKey, page, limit, lang, vista, windows]
  );

  useEffect(() => {
    load({ noCache: true });
    return () => acRef.current?.abort?.();
  }, [cacheKey, load]);

  return { items, ...state, reload: () => load({ noCache: true }) };
}

export default useNoticiasGenerales;
