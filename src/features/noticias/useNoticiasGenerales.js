// src/features/noticias/useNoticiasGenerales.js
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const RETRIES_BY_TEMA = {
  economia: [3, 7],
  tecnologia: [3, 7],
  default: [3, 5],
};

const makeKey = ({ tema, q, providers, sinceDays, page, limit, lang, vista }) =>
  [
    "general", vista || "home",
    tema || "actualidad",
    q?.trim() || "",
    (providers || []).slice().sort().join("|"),
    sinceDays || "",
    page || 1,
    limit || 20,
    lang || "es",
  ].join("::");

export function useNoticiasGenerales({ tema, q, providers, page=1, limit=20, lang="es", vista="home" }) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState({ loading: false, error: null, page, hasMore: false });
  const acRef = useRef(null);

  const windows = RETRIES_BY_TEMA[tema] || RETRIES_BY_TEMA.default;

  const load = useCallback(async ({ noCache=false } = {}) => {
    if (acRef.current) acRef.current.abort();
    const ac = new AbortController(); acRef.current = ac;

    setState(s => ({ ...s, loading: true, error: null }));
    let data = null;

    for (let i=0; i<windows.length; i++) {
      const sinceDays = windows[i];
      const url = new URL(`${API_BASE}/api/news`);
      if (tema) url.searchParams.set("tema", tema);
      if (q) url.searchParams.set("q", q);
      if (providers?.length) url.searchParams.set("providers", providers.join(","));
      url.searchParams.set("sinceDays", String(sinceDays));
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("lang", lang || "es");
      if (noCache && i === 0) url.searchParams.set("_", Date.now());

      const res = await fetch(url.toString(), { signal: ac.signal });
      const d = await res.json();
      const MIN_DENSITY = 8;

      if (d?.items?.length >= MIN_DENSITY || i === windows.length - 1) {
        data = d; break;
      }
    }

    if (!ac.signal.aborted) {
      if (data?.ok) {
        setItems(data.items || []);
        setState({
          loading: false,
          error: null,
          page: data.page || page,
          hasMore: (data.page || 1) * limit < (data.total || 0),
        });
      } else {
        setState(s => ({ ...s, loading: false, error: data?.error || "FETCH_ERROR" }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tema, q, JSON.stringify(providers||[]), page, limit, lang]);

  const cacheKey = useMemo(() => makeKey({ tema, q, providers, sinceDays: windows[0], page, limit, lang, vista }), [tema, q, providers, page, limit, lang, vista]);

  useEffect(() => { load({ noCache: true }); return () => acRef.current?.abort(); }, [cacheKey, load]);

  return { items, ...state, reload: () => load({ noCache: true }) };
}
