// src/pages/Jurisprudencia.jsx
// ============================================================
// 🦉 BúhoLex | Página de Jurisprudencia
// - Buscador externo (Google CSE / /api/research/search)
// - Repositorio interno (Mongo / IA local)
// - Visor modal centralizado (PDF + ficha completa)
// - Integra LitisBot burbuja con la sentencia seleccionada
// ============================================================

import React, { useCallback, useState } from "react";

// 🔹 Buscador externo (Google CSE / /api/research/search)
import JurisprudenciaSearch from "@/components/JurisprudenciaSearch";

// 🔹 Repositorio interno (Mongo / IA local)
import JurisprudenciaInterna from "@/components/JurisprudenciaInterna";

// 🔹 Visor de PDF / detalle
import JurisprudenciaVisorModal from "@/components/jurisprudencia/JurisprudenciaVisorModal";

// 🔹 Chat flotante
import LitisBotBubbleChat from "@/components/ui/LitisBotBubbleChat";

const IS_BROWSER = typeof window !== "undefined";

export default function Jurisprudencia() {
  /* --------------------------- Estado del visor --------------------------- */
  const [visorOpen, setVisorOpen] = useState(false);
  const [visorDoc, setVisorDoc] = useState(null);

  /* ---------------------- Contexto para LitisBot burbuja ------------------ */
  const [jurisSeleccionada, setJurisSeleccionada] = useState(null);

  // Abre el visor con el documento seleccionado
  const handleAbrirVisor = useCallback((doc) => {
    if (!doc) return;
    setVisorDoc(doc);
    setVisorOpen(true);

    // sincronizamos también con LitisBot (estado + sessionStorage)
    setJurisSeleccionada(doc);
    if (IS_BROWSER) {
      try {
        window.sessionStorage.setItem(
          "litis:lastJurisSeleccionada",
          JSON.stringify(doc)
        );
      } catch (e) {
        console.warn(
          "[Jurisprudencia] No se pudo guardar juris en sessionStorage (visor):",
          e
        );
      }
    }

    console.log("[Jurisprudencia] Abrir visor + seleccionar para LitisBot:", doc);
  }, []);

  // Cierra el visor y limpia el documento
  const handleCerrarVisor = useCallback(() => {
    setVisorOpen(false);
    setVisorDoc(null);
  }, []);

  // Cuando el usuario hace clic en “Preguntar a LitisBot con esta sentencia”
  const handlePreguntarConJuris = useCallback((doc) => {
    if (!doc) return;

    setJurisSeleccionada(doc);

    if (IS_BROWSER) {
      try {
        window.sessionStorage.setItem(
          "litis:lastJurisSeleccionada",
          JSON.stringify(doc)
        );
      } catch (e) {
        console.warn(
          "[Jurisprudencia] No se pudo guardar juris en sessionStorage:",
          e
        );
      }
    }

    console.log("[Jurisprudencia] handlePreguntarConJuris doc:", doc);
  }, []);

  // Limpia selección (estado + sessionStorage)
  const handleClearJuris = useCallback(() => {
    setJurisSeleccionada(null);

    if (IS_BROWSER) {
      try {
        window.sessionStorage.removeItem("litis:lastJurisSeleccionada");
      } catch (e) {
        console.warn(
          "[Jurisprudencia] No se pudo limpiar juris de sessionStorage:",
          e
        );
      }
    }

    console.log("[Jurisprudencia] jurisSeleccionada limpia");
  }, []);

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 py-10 sm:py-12">
        {/* Título general de la página */}
        <h1 className="text-3xl font-bold mb-3 text-center text-neutral-900">
          Jurisprudencia
        </h1>

        <p className="text-sm text-gray-500 text-center mb-8 max-w-3xl mx-auto">
          Consulta jurisprudencia relevante tanto en nuestro repositorio interno
          como en motores externos especializados. Esta sección será la base del
          banco de sentencias que utilizará LitisBot para responder con soporte
          jurisprudencial.
        </p>

        {/* 🧠 Bloque 1: Buscador online (Google CSE / /api/research/search) */}
        <section className="mb-10">
          <JurisprudenciaSearch
            variant="full"
            // En el futuro, si este buscador devuelve resultados clicables,
            // podemos reutilizar el mismo handler:
            // onVer={handleAbrirVisor}
          />
        </section>

        {/* 🗃 Bloque 2: Repositorio interno de jurisprudencia */}
        <section>
          <JurisprudenciaInterna
            onVer={handleAbrirVisor}
            showSearchButton={true}
            // 👇 Integra con LitisBot: pasa el doc al estado / sessionStorage
            onPreguntarConJuris={handlePreguntarConJuris}
          />
        </section>

        {/* 🔎 Visor PDF / ficha en modal (controlado por esta página) */}
        <JurisprudenciaVisorModal
          open={visorOpen}
          doc={visorDoc}
          onClose={handleCerrarVisor}
        />
      </main>

      {/* 🦉 LitisBot flotante conectado a la sentencia seleccionada */}
      <LitisBotBubbleChat
        usuarioId={null}          // cuando tengas usuario real, pásalo aquí
        pro={false}
        jurisSeleccionada={jurisSeleccionada}
        onClearJuris={handleClearJuris}
      />
    </>
  );
}

