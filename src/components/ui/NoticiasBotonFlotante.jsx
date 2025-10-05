import React, { useEffect, useRef, useState } from "react";
import { Megaphone, X, Globe2 } from "lucide-react";
import { asAbsoluteUrl } from "@/utils/apiUrl";

/* ===================== Config ===================== */
const PAGE_SIZE = 8;
const NEWS_URL = asAbsoluteUrl("/api/noticias");
const CONTENT_URL = asAbsoluteUrl("/api/noticias/contenido");
const TRANSLATE_URL = asAbsoluteUrl("/api/traducir");

/** Tópicos con equivalentes ES/EN para consulta bilingüe */
const TOPICS = [
  { es: "política", en: "politics" },
  { es: "economía", en: "economy" },
  { es: "corrupción", en: "corruption" },
  { es: "ciencia", en: "science" },
  { es: "tecnología", en: "technology" },
  { es: "sociedad", en: "society" },
];

/* ===================== Utils ===================== */
function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return String(h);
}
function detectLang(text = "") {
  const t = text.toLowerCase();
  const es = (t.match(/[áéíóúñ¡¿]| el | la | de | que | los | las | para | con | del /g) || []).length;
  const en = (t.match(/ the | of | and | to | in | is | for | on | with | by /g) || []).length;
  return es >= en ? "es" : "en";
}
/** Acepta forma {items:[...]} o arreglo directo */
function normalize(json) {
  const arr = Array.isArray(json)
    ? json
    : Array.isArray(json?.items)
    ? json.items
    : Array.isArray(json?.result)
    ? json.result
    : Array.isArray(json?.data?.items)
    ? json.data.items
    : [];
  return arr.map((n, i) => ({
    id: n._id || n.id || i,
    titulo: n.titulo || n.title || "Sin título",
    resumen: n.resumen || n.description || n.snippet || "",
    url: n.url || n.link || n.enlace || "",
    imagen: n.imagen || n.image || n.thumbnail || "",
    fecha: n.fecha || n.date || n.publishedAt || "",
    fuente: n.fuente || n.source || n.provider || "",
  }));
}
/** Devuelve el par "es,en" para query; si no está en diccionario, deja literal */
function topicQueryValue(topic) {
  if (!topic) return "";
  const t = TOPICS.find((x) => x.es === topic || x.en === topic);
  return t ? `${t.es},${t.en}` : topic;
}

/* ================== Componente principal ================== */
export default function NoticiasBotonFlotante({
  endpoint = "general", // este componente SOLO usa "general"
  titulo = "Noticias",
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [topic, setTopic] = useState(null);

  const [modal, setModal] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [translating, setTranslating] = useState(false);

  const listRef = useRef(null);
  const observerRef = useRef(null);

  /* =============== Fetch noticias (GENERAL + bilingüe) =============== */
  async function fetchNoticias(nextPage = 1, selectedTopic = topic) {
    setLoading(true);
    try {
      // Construimos el query base obligando tipo=general
      const qsBase = new URLSearchParams({
        tipo: "general",
        page: String(nextPage),
        limit: String(PAGE_SIZE),
      });

      // 1) Intento principal: q=es,en (bilingüe)
      let qs = new URLSearchParams(qsBase);
      if (selectedTopic) qs.set("q", topicQueryValue(selectedTopic));
      let url = `${NEWS_URL}?${qs.toString()}`;
      let res = await fetch(url);
      let json = await res.json();
      let data = normalize(json);

      // 2) Fallback: si el backend usa "tema" en vez de "q"
      if (data.length === 0 && selectedTopic) {
        qs = new URLSearchParams(qsBase);
        qs.set("tema", topicQueryValue(selectedTopic));
        url = `${NEWS_URL}?${qs.toString()}`;
        res = await fetch(url);
        json = await res.json();
        data = normalize(json);
      }

      // 3) Fallback: si sigue vacío y había filtro, prueba SIN filtro (últimas generales)
      if (data.length === 0 && selectedTopic) {
        qs = new URLSearchParams(qsBase);
        url = `${NEWS_URL}?${qs.toString()}`;
        res = await fetch(url);
        json = await res.json();
        data = normalize(json);
      }

      if (nextPage === 1) setItems(data);
      else setItems((prev) => [...prev, ...data]);

      setHasMore(data.length === PAGE_SIZE);
      setPage(nextPage);
    } catch (err) {
      console.error("❌ Error cargando noticias:", err);
      if (nextPage === 1) setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  // Carga inicial al montar o si (por error) pasaran otro endpoint, lo forzamos a general
  useEffect(() => {
    fetchNoticias(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-carga cuando abres el panel si está vacío
  useEffect(() => {
    if (open && items.length === 0 && !loading) fetchNoticias(1, topic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Scroll infinito
  useEffect(() => {
    if (!listRef.current) return;
    const sentinel = document.createElement("div");
    listRef.current.appendChild(sentinel);
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) fetchNoticias(page + 1, topic);
    });
    observerRef.current.observe(sentinel);
    return () => observerRef.current?.disconnect();
  }, [listRef.current, hasMore, loading, page, topic]);

  /* ================== Modal lectura + traducción ================== */
  async function openModal(noticia) {
    if (!noticia) return;
    setLoadingContent(true);
    setTranslating(false);

    const url = noticia.url || "";
    const cacheKey = `news:${hashString(url)}`;
    const cached = sessionStorage.getItem(cacheKey);
    let title = noticia.titulo || "Sin título";
    let body = "";

    try {
      if (cached) {
        const parsed = JSON.parse(cached);
        title = parsed.title || title;
        body = parsed.body || "";
      } else {
        const r = await fetch(`${CONTENT_URL}?url=${encodeURIComponent(url)}`);
        if (!r.ok) throw new Error("No se pudo obtener contenido");
        const j = await r.json();
        title = j.title || title;
        body = j.body || "";
        sessionStorage.setItem(cacheKey, JSON.stringify({ title, body }));
      }

      const lang = detectLang(body);
      let translatedBody = "";
      let showTranslated = false;

      if (lang !== "es") {
        const shortText = body.slice(0, 12000);
        const tKey = `trad:${hashString(shortText)}:es`;
        const tCached = sessionStorage.getItem(tKey);

        setTranslating(true);
        if (tCached) {
          translatedBody = JSON.parse(tCached).text;
        } else {
          const tr = await fetch(TRANSLATE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: shortText, targetLang: "es" }),
          });
          if (tr.ok) {
            const tj = await tr.json();
            translatedBody = tj.translated || "";
            sessionStorage.setItem(tKey, JSON.stringify({ text: translatedBody }));
          }
        }
        setTranslating(false);
        showTranslated = Boolean(translatedBody);
      }

      setModal({ title, body, translatedBody, url, showTranslated, lang });
    } catch (err) {
      console.error("⚠️ Error al abrir noticia:", err);
      setModal({ title, body: "No se pudo extraer contenido", url });
    } finally {
      setLoadingContent(false);
    }
  }

  const closeModal = () => setModal(null);
  const toggleTranslate = () =>
    setModal((m) => (m ? { ...m, showTranslated: !m.showTranslated } : m));

  const aplicarTema = (t) => {
    setTopic(t);
    setItems([]);
    setPage(1);
    setHasMore(true);
    fetchNoticias(1, t);
  };

  /* ================== UI ================== */
  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 rounded-full px-5 py-3 bg-gradient-to-r from-red-700 to-red-500 hover:from-red-600 hover:to-red-400 text-white text-lg font-semibold shadow-lg"
      >
        <Megaphone className="w-6 h-6" />
        <span className="hidden sm:inline">{titulo}</span>
      </button>

      {/* Panel lateral */}
      {open && (
        <div className="fixed inset-0 z-[70] flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside
            className="relative ml-auto w-full sm:w-[520px] h-full bg-white shadow-2xl flex flex-col rounded-t-2xl sm:rounded-none transition-all duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-red-700 to-red-500 text-white px-5 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-none">
              <h3 className="font-bold text-xl">{titulo}</h3>
              <button onClick={() => setOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Temas */}
            <div className="px-4 py-2 border-b bg-white flex flex-wrap gap-2">
              {TOPICS.map((k) => (
                <button
                  key={k.es}
                  onClick={() => aplicarTema(k.es)}
                  className={`text-sm px-3 py-1 rounded-full border transition ${
                    topic === k.es ? "bg-red-600 text-white border-red-600" : "hover:bg-gray-100"
                  }`}
                >
                  {k.es}
                </button>
              ))}
              {topic && (
                <button
                  onClick={() => aplicarTema(null)}
                  className="text-sm px-3 py-1 rounded-full border hover:bg-gray-100"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Lista */}
            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-[17px] leading-relaxed">
              {items.length === 0 && !loading && (
                <p className="text-gray-500 text-center mt-6">Sin resultados.</p>
              )}

              {items.map((n) => (
                <article
                  key={n.id}
                  onClick={() => openModal(n)}
                  className="border rounded-xl overflow-hidden bg-white hover:shadow-lg transition cursor-pointer"
                >
                  {n.imagen && (
                    <div className="relative h-48">
                      <img src={n.imagen} alt={n.titulo} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
                      <span className="absolute bottom-2 left-2 text-white text-xs px-2 py-1 bg-black/40 rounded">
                        {n.fuente || "Fuente"}
                      </span>
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="font-bold text-lg sm:text-xl line-clamp-2">{n.titulo}</h4>
                    {n.resumen && (
                      <p className="text-gray-700 text-base sm:text-lg line-clamp-3 mt-2">{n.resumen}</p>
                    )}
                  </div>
                </article>
              ))}

              {loading && (
                <p className="text-center text-base text-gray-500 py-4">Cargando…</p>
              )}
            </div>

            {/* Aviso Oficina Virtual */}
            <div className="px-4 py-3 text-sm text-gray-600 border-t bg-white">
              ¿Buscas <b>noticias jurídicas</b>? Entra a la{" "}
              <a href="/oficina/noticias" className="text-red-600 underline font-semibold">
                Oficina Virtual
              </a>.
            </div>
          </aside>

          {/* Modal de lectura */}
          {modal && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center px-2 sm:px-4">
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
              <div className="relative bg-white w-full max-w-[95vw] sm:max-w-3xl rounded-xl shadow-2xl max-h-[92vh] flex flex-col">
                {/* Header modal */}
                <div className="sticky top-0 bg-gradient-to-r from-red-700 to-red-500 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
                  <div className="flex-1">
                    <h3 className="font-bold text-2xl sm:text-3xl leading-snug">{modal.title}</h3>
                    {modal.url && (
                      <a
                        href={modal.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm underline text-white/90 hover:text-white"
                      >
                        Ver en el medio original
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {modal.translatedBody && (
                      <button
                        onClick={toggleTranslate}
                        className="flex items-center gap-2 text-sm bg-white/10 px-4 py-2 rounded-lg border border-white/20 hover:bg-white/20 transition"
                      >
                        <Globe2 className="w-4 h-4" />
                        {modal.showTranslated ? "Ver original" : "Ver traducido"}
                      </button>
                    )}
                    <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-full">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Body modal */}
                <div className="flex-1 overflow-y-auto p-6 text-gray-900 leading-relaxed text-lg sm:text-xl whitespace-pre-line">
                  {loadingContent && <p className="text-gray-500 text-base">Cargando contenido…</p>}
                  {!loadingContent && (
                    <>
                      {modal.showTranslated && modal.translatedBody ? (
                        <p>{modal.translatedBody}</p>
                      ) : (
                        <p>{modal.body}</p>
                      )}
                      {translating && <p className="mt-3 text-base text-gray-500">Traduciendo…</p>}
                    </>
                  )}
                </div>

                <p className="text-center text-sm text-gray-500 py-3 border-t">
                  {modal.showTranslated ? "Traducción automática al español" : "Mostrando texto original"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
