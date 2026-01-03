// src/pages/Jurisprudencia.jsx
// ============================================================
// 🦉 BúhoLex | Página de Jurisprudencia (PRO)
// - Conecta: buscador externo + repositorio interno
// - Lector global (ReaderModal) para resultados de Google CSE
// - Modal PRO (repositorio interno) para fichas completas
// - Sincroniza con LitisBot (sessionStorage)
// - Flujo: Buscar → Leer aquí mismo → Analizar con IA
// ============================================================

import React, { useCallback, useState } from "react";

// 🔹 Buscador externo (Google CSE / /api/research/search)
import JurisprudenciaSearch from "@/components/JurisprudenciaSearch";

// 🔹 Repositorio interno (Mongo)
import JurisprudenciaInterna from "@/components/JurisprudenciaInterna";

// 🔹 Modal PRO (repositorio interno)
import JurisprudenciaVisorModal from "@/components/jurisprudencia/JurisprudenciaVisorModal";

// 🔹 Lector global reutilizado (Noticias + Jurisprudencia)
import ReaderModal from "@/components/common/ReaderModal.jsx";

// 🔹 Hook que guarda selección en sessionStorage (para LitisBot)
import useSyncJurisprudenciaSelection from "@/hooks/useSyncJurisprudenciaSelection";

export default function Jurisprudencia() {
  /* --------------------------- Visor interno --------------------------- */
  const [visorOpen, setVisorOpen] = useState(false);
  const [visorDoc, setVisorDoc] = useState(null);

  /* ------------------------ Lector buscador global -------------------- */
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerItem, setReaderItem] = useState(null);

  /* ---------------------- LitisBot (contexto) ------------------------- */
  const { jurisSeleccionada, setJurisSeleccionada } =
    useSyncJurisprudenciaSelection();

  /* ====================================================================
   Abre visor PRO (repositorio interno)
   - SOLO carga el detalle en el visor
   - LitisBot se sincroniza ÚNICAMENTE desde handlePreguntarConJuris
   ==================================================================== */
  const handleAbrirVisor = useCallback(async (doc) => {
    if (!doc) return;

    const id = doc._id || doc.id;
    if (!id) return;

    // 1) Abrimos el visor con skeleton
    setVisorOpen(true);
    setVisorDoc({ loading: true });

    try {
      // 2) Fetch detalle real desde backend interno
      const resp = await fetch(`/api/jurisprudencia/${id}`);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();

      if (data?.item) {
        // 🔍 Solo rellenamos el visor
        setVisorDoc(data.item);

        console.log("📘 [Jurisprudencia] Detalle cargado en visor:", data.item);
      } else {
        throw new Error("Detalle vacío");
      }
    } catch (err) {
      console.error("[Jurisprudencia] Error cargando detalle:", err);
      setVisorDoc({
        error: true,
        mensaje: "No se pudo cargar el detalle de la resolución.",
      });
    }
  }, []); // no sincroniza con LitisBot aquí

  const handleCerrarVisor = useCallback(() => {
    setVisorOpen(false);
    setVisorDoc(null);
  }, []);

  /* ====================================================================
     Lector global (resultados externos de Google CSE)
     ==================================================================== */
  const handleAbrirReaderGlobal = useCallback((item) => {
    if (!item) return;

    // Marcamos que este ítem viene del buscador global de jurisprudencia
    const enriched = {
      ...item,
      isJuris: true, // flag para ReaderModal (usa imagen/fallback de jurisprudencia)
    };

    setReaderItem(enriched);
    setReaderOpen(true);

    console.log("🌐 [Jurisprudencia] Lector global abierto:", enriched);
  }, []);

  const handleCerrarReaderGlobal = useCallback(() => {
    setReaderOpen(false);
    setReaderItem(null);
  }, []);

  /* ====================================================================
     Consultar con IA (desde lista interna o modal interno)
     - Acepta promptInicial opcional (chips de acciones rápidas)
     ==================================================================== */
  const handlePreguntarConJuris = useCallback(
    async (doc, promptInicial) => {
      if (!doc) return;

      const id = doc._id || doc.id;
      if (!id) {
        // Fallback: al menos guardamos la ficha básica con el prompt
        setJurisSeleccionada({
          ...doc,
          litisPrompt: promptInicial || "",
        });
        console.warn(
          "[Jurisprudencia] No se encontró id en el documento, se envía ficha básica a LitisBot."
        );
        return;
      }

      try {
        // 1) Llamamos al endpoint de contexto enriquecido
        const resp = await fetch(`/api/jurisprudencia/${id}/context`);
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }

        const data = await resp.json();

        if (!data?.ok || !data?.context) {
          throw new Error("Respuesta sin contexto válido");
        }

        // 2) Enriquecemos la sentencia con el contexto para LitisBot
        const enriched = {
          ...doc,
          litisSource: "jurisprudencia_interna",
          litisContext: data.context, // texto listo para IA
          litisMeta: data.meta || {}, // info estructurada
          litisContextId: data.id || id,
          litisPrompt: promptInicial || "", // prompt sugerido para el chat
        };

        // 3) Guardamos en hook global (y sessionStorage)
        setJurisSeleccionada(enriched);

        console.log(
          "🤖 [Jurisprudencia] Contexto de sentencia interna enviado a LitisBot:",
          enriched
        );
      } catch (err) {
        console.error(
          "[Jurisprudencia] Error obteniendo contexto para LitisBot, usando ficha básica:",
          err
        );

        // Fallback: aunque falle /context, seguimos permitiendo el análisis
        setJurisSeleccionada({
          ...doc,
          litisPrompt: promptInicial || "",
        });
      }
    },
    [setJurisSeleccionada]
  );

  /* ====================================================================
     Favoritos (callback simple desde el visor)
     - Fase actual: solo log + TODO para conectar con API/dashboard
     ==================================================================== */
  const handleFavoriteChange = useCallback((id, isFavorite, rawDoc) => {
    if (!id) return;

    console.log(
      "⭐ [Jurisprudencia] Cambio de favorito desde visor:",
      id,
      "→",
      isFavorite,
      rawDoc
    );

    // TODO Fase G:
    // - Llamar a API tipo:
    //   await fetch(`/api/jurisprudencia/${id}/favorite`, {
    //     method: isFavorite ? "POST" : "DELETE",
    //   });
    // - Actualizar algún estado local o cache de favoritos
  }, []);

  /* ====================================================================
     RENDER
     ==================================================================== */
  return (
    <>
      <main className="max-w-6xl mx-auto px-4 py-10 sm:py-12">
        {/* Título */}
        <h1 className="text-3xl font-bold mb-3 text-center text-neutral-900">
          Jurisprudencia
        </h1>

        <p className="text-sm text-gray-500 text-center mb-10 max-w-3xl mx-auto">
          Explora sentencias relevantes tanto del repositorio interno
          automatizado como de fuentes externas especializadas. Primero puedes
          leerlas aquí mismo con el lector de BúhoLex y, si lo deseas, luego
          abrir la fuente oficial o consultarlas con LitisBot para obtener un
          análisis jurídico personalizado.
        </p>

        {/* -------------------------------------------------------------- */}
        {/* 🔎 Buscador externo (Google CSE / /api/research/search)        */}
        {/* -------------------------------------------------------------- */}
        <section className="mb-12">
          <JurisprudenciaSearch
            variant="full"
            onOpenResult={handleAbrirReaderGlobal}
          />
        </section>

        {/* -------------------------------------------------------------- */}
        {/* 🗃 Repositorio interno (MongoDB)                                */}
        {/* -------------------------------------------------------------- */}
        <section>
          <JurisprudenciaInterna
            onVer={handleAbrirVisor} // clic en tarjeta interna → visor PRO
            onPreguntarConJuris={handlePreguntarConJuris}
            showSearchButton={true}
          />
        </section>

        {/* -------------------------------------------------------------- */}
        {/* 🪟 Modal PRO (detalle completo, repositorio interno)           */}
        {/* -------------------------------------------------------------- */}
        <JurisprudenciaVisorModal
          open={visorOpen}
          doc={visorDoc}
          onClose={handleCerrarVisor}
          onPreguntarConJuris={handlePreguntarConJuris}
          onFavoriteChange={handleFavoriteChange}
        />

        {/* -------------------------------------------------------------- */}
        {/* 📖 Lector global (ReaderModal reutilizado de Noticias)         */}
        {/* -------------------------------------------------------------- */}
        <ReaderModal
          open={readerOpen}
          item={readerItem}
          onClose={handleCerrarReaderGlobal}
          // Futuro: onPreguntar para mandar el enlace externo a LitisBot
        />
      </main>
    </>
  );
}
