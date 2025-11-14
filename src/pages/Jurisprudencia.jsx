// src/pages/Jurisprudencia.jsx
// ============================================================
// 🦉 BúhoLex | Página de Jurisprudencia
// - Bloque 1: Buscador externo (Google CSE / /api/research/search)
// - Bloque 2: Repositorio interno (Mongo / IA interna)
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

export default function Jurisprudencia() {
  // ---------- Estado del visor ----------
  const [visorOpen, setVisorOpen] = useState(false);
  const [visorDoc, setVisorDoc] = useState(null);

  // ---------- Contexto para LitisBot ----------
  const [jurisSeleccionada, setJurisSeleccionada] = useState(null);

  // Abre el visor con el documento seleccionado
  const handleAbrirVisor = useCallback((doc) => {
    if (!doc) return;
    setVisorDoc(doc);
    setVisorOpen(true);
  }, []);

  // Cierra el visor y limpia el doc
  const handleCerrarVisor = useCallback(() => {
    setVisorOpen(false);
    setVisorDoc(null);
  }, []);

  // Cuando el usuario hace clic en “Preguntar a LitisBot con esta sentencia”
  const handlePreguntarConJuris = useCallback((doc) => {
    if (!doc) return;
    setJurisSeleccionada(doc);
  }, []);

  const handleClearJuris = useCallback(() => {
    setJurisSeleccionada(null);
  }, []);

  return (
    <>
      <section className="max-w-6xl mx-auto px-4 py-10 sm:py-12">
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
        <div className="mb-10">
          <JurisprudenciaSearch
            variant="full"
            // En el futuro, si este buscador devuelve resultados clicables,
            // podemos reutilizar el mismo handler:
            // onVer={handleAbrirVisor}
          />
        </div>

        {/* 🗃 Bloque 2: Repositorio interno de jurisprudencia */}
        <JurisprudenciaInterna
          onVer={handleAbrirVisor}
          showSearchButton={true}
          onPreguntarConJuris={handlePreguntarConJuris} // 👈 integra con LitisBot
        />

        {/* 🔎 Visor PDF / ficha en modal (controlado por esta página) */}
        <JurisprudenciaVisorModal
          open={visorOpen}
          doc={visorDoc}
          onClose={handleCerrarVisor}
        />
      </section>

      {/* 🦉 LitisBot flotante conectado a la sentencia seleccionada */}
      <LitisBotBubbleChat
        usuarioId={null}          // si luego tienes user real, pásalo aquí
        pro={false}
        jurisSeleccionada={jurisSeleccionada}
        onClearJuris={handleClearJuris}
      />
    </>
  );
}
