// ============================================================
// 🦉 useNoticiasFeed (estado separado por tipo + abort + paginación)
// - tipo: "juridica" | "general"
// - chip: "todas" o slug (especialidad para juridica, tema para general)
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getNoticiasRobust,
  getEspecialidades,
  getTemas,
} from "@/services/noticiasClienteService.js";

const LIMIT = 12;

export default function useNoticiasFeed(tipoInicial = "juridica") {
  const [tipo, setTipo] = useState(tipoInicial);     // pestaña
  const [chip, setChip] = useState("todas");         // slug activo
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [chips, setChips] = useState([]);

  // Abort en cambios rápidos
  const reqRef = useRef(null);
  const abortActive = () => { try { reqRef.current?.abort?.(); } catch {} reqRef.current = null; };

  // Carga chips al montar (ambos tipos, cachea adentro del service)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [esp, tem] = await Promise.all([
        getEspecialidades({ tipo: "juridica", lang: "es" }).catch(() => []),
        getTemas({ lang: "es" }).catch(() => []),
      ]);
      if (!mounted) return;
      setChips(tipo === "juridica" ? esp : tem);
    })();
    return () => { mounted = false; };
  // solo al inicio
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando cambia tipo → setear chips correctos
  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = tipo === "juridica"
        ? await getEspecialidades({ tipo: "juridica", lang: "es" }).catch(() => [])
        : await getTemas({ lang: "es" }).catch(() => []);
      if (!mounted) return;
      setChips(list);
      // resetear estado del feed al cambiar pestaña
      setChip("todas");
      setItems([]);
      setPage(1);
      setHasMore(true);
    })();
    return () => { mounted = false; };
  }, [tipo]);

  // Cargar una página (respeta tipo y chip)
  const loadPage = useCallback(async (nextPage = 1) => {
    if (loading || (!hasMore && nextPage !== 1)) return;

    setLoading(true);
    abortActive();
    const ctrl = new AbortController();
    reqRef.current = ctrl;

    const common = {
      tipo,
      page: nextPage,
      limit: LIMIT,
      lang: "es",
      providers: "all",       // el service ya traduce "all"→undefined
      signal: ctrl.signal,
    };

    // ⚖️ parámetros correctos para cada tipo
    const params =
      tipo === "juridica"
        ? { ...common, especialidad: chip !== "todas" ? chip : undefined, tema: undefined, q: undefined }
        : { ...common, tema: chip !== "todas" ? chip : undefined, q: undefined, especialidad: undefined };

    try {
      const { items: nuevos, pagination } = await getNoticiasRobust(params);
      setItems((prev) => (nextPage === 1 ? nuevos : [...prev, ...nuevos]));
      setPage(nextPage);
      // hasMore: si trajo menos que el límite, se acabó
      const more = !!pagination?.hasMore && nuevos.length === LIMIT;
      setHasMore(more);
    } catch (e) {
      if (e.name !== "AbortError") setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [tipo, chip, loading, hasMore]);

  // Recargar al cambiar chip
  useEffect(() => {
    // reset y página 1
    setItems([]);
    setPage(1);
    setHasMore(true);
    loadPage(1);
    return abortActive;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chip, tipo]);

  const onSelectChip = (k) => setChip(k || "todas");
  const onChangeTipo = (t) => setTipo(t);

  return {
    tipo, setTipo: onChangeTipo,
    chip, setChip: onSelectChip,
    chips,
    items, page, hasMore, loading,
    loadMore: () => loadPage(page + 1),
    reload: () => loadPage(1),
  };
}
