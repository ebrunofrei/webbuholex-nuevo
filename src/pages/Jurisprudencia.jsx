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

// 🔹 Hook que sincroniza la sentencia seleccionada con sessionStorage
import useSyncJurisprudenciaSelection from "@/hooks/useSyncJurisprudenciaSelection";

export default function Jurisprudencia() {
  /* --------------------------- Estado del visor --------------------------- */
  const [visorOpen, setVisorOpen] = useState(false);
  const [visorDoc, setVisorDoc] = useState(null);

  /* ---------------------- Contexto para LitisBot burbuja ------------------ */
  const { jurisSeleccionada, setJurisSeleccionada } =
    useSyncJurisprudenciaSelection();

  // Abre el visor con el documento seleccionado
  const handleAbrirVisor = useCallback(
    (doc) => {
      if (!doc) return;
      setVisorDoc(doc);
      setVisorOpen(true);

      // sincronizamos también con LitisBot (hook ya guarda en sessionStorage)
      setJurisSeleccionada(doc);

      console.log(
        "[Jurisprudencia] Abrir visor + seleccionar para LitisBot:",
        doc
      );
    },
    [setJurisSeleccionada]
  );

  // Cierra el visor y limpia solo el doc visual (no borramos la selección
  // para que LitisBot siga teniendo contexto aunque cierres el visor)
  const handleCerrarVisor = useCallback(() => {
    setVisorOpen(false);
    setVisorDoc(null);
  }, []);

  // Cuando el usuario hace clic en “Consultar con LitisBot” (desde listado o visor)
  const handlePreguntarConJuris = useCallback(
    (doc) => {
      if (!doc) return;
      setJurisSeleccionada(doc);
      console.log("[Jurisprudencia] handlePreguntarConJuris doc:", doc);
    },
    [setJurisSeleccionada]
  );

  // Limpia selección (estado + sessionStorage vía hook)
  const handleClearJuris = useCallback(() => {
    setJurisSeleccionada(null);
    console.log("[Jurisprudencia] jurisSeleccionada limpia");
  }, [setJurisSeleccionada]);

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
          onPreguntarConJuris={handlePreguntarConJuris}
        />
      </main>

      {/* 🦉 LitisBot flotante conectado a la sentencia seleccionada */}
      <LitisBotBubbleChat
        usuarioId={null} // cuando tengas usuario real, pásalo aquí
        pro={false}
        jurisSeleccionada={jurisSeleccionada}
        onClearJuris={handleClearJuris}
      />
    </>
  );
}
