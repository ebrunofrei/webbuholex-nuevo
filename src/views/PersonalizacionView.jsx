// src/pages/PersonalizacionView.jsx
import React from "react";
import SelectorPlantillaOficina from "@components/SelectorPlantillaOficina";
import PanelPersonalizacion from "../oficinaVirtual/components/PanelPersonalizacion";
import PublicarOficinaBtn from "@components/PublicarOficinaBtn";

const PersonalizacionView = () => {
  return (
    <main className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-[#b03a1a] mb-6">
        Personaliza tu Oficina Virtual
      </h1>

      {/* 1. Plantillas prediseñadas */}
      <section className="mb-8">
        <SelectorPlantillaOficina />
      </section>

      {/* 2. Panel de personalización */}
      <section className="mb-8">
        <PanelPersonalizacion />
      </section>

      {/* 3. Botón para publicar (URL única de la oficina) */}
      <section className="mt-6">
        <PublicarOficinaBtn />
      </section>

      {/* 4. (Opcional) Preview en vivo */}
      {/* 
      <section className="mt-10 border rounded-xl shadow p-4">
        <h2 className="text-xl font-semibold text-[#4b2e19] mb-4">Vista previa</h2>
        <VistaPreviaOficina config={...} />
      </section>
      */}
    </main>
  );
};

export default PersonalizacionView;
