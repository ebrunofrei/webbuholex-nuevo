// ============================================================================
// 🦉 HerramientaLiquidacionLaboral — UI ORQUESTADOR (CANÓNICO)
// ----------------------------------------------------------------------------
// - SOLO selector de régimen
// - NO inputs
// - NO estados de formulario
// - Renderiza UN solo panel activo
// ============================================================================

import React, { useState } from "react";
import { REGIMENES_LABORALES } from "@/services/laboral/regimenes";

export default function HerramientaLiquidacionLaboral() {
  const [regimen, setRegimen] = useState(REGIMENES_LABORALES.PRIVADO_728);

  return (
    <div className="w-full">
      <h2 className="text-lg font-bold mb-4 text-yellow-900">
        Calculadora de Beneficios Laborales
      </h2>

      {/* =========================
          SELECTOR DE RÉGIMEN
      ========================= */}
      <label className="block mb-4">
        Régimen laboral
        <select
          value={regimen}
          onChange={(e) => setRegimen(e.target.value)}
          className="border rounded px-2 py-1 w-full"
        >
          <option value={REGIMENES_LABORALES.PRIVADO_728}>
            Privado (D. Leg. 728)
          </option>
          <option value={REGIMENES_LABORALES.PUBLICO_276}>
            Público (D. Leg. 276)
          </option>
          <option value={REGIMENES_LABORALES.CAS_1057}>
            CAS (D. Leg. 1057)
          </option>
        </select>
      </label>

      {/* =========================
          PANEL ACTIVO (UNO SOLO)
      ========================= */}
      {regimen === REGIMENES_LABORALES.PRIVADO_728 && <PanelPrivado728 />}
      {regimen === REGIMENES_LABORALES.PUBLICO_276 && <PanelPublico276 />}
      {regimen === REGIMENES_LABORALES.CAS_1057 && <PanelCAS1057 />}
    </div>
  );
}
