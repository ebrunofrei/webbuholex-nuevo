import React, { useMemo, useState } from "react";

/**
 * ============================================================
 * 🧮 Liquidación Laboral
 * ------------------------------------------------------------
 * Dominio: Laboral
 * Tipo: Herramienta jurídica determinística
 *
 * - CTS
 * - Vacaciones truncas
 * - Gratificación trunca
 *
 * NO depende del chat
 * NO abre/cierra modales
 * ============================================================
 */

export default function LiquidacionLaboral() {
  const [remuneracion, setRemuneracion] = useState("");
  const [mesesTrabajados, setMesesTrabajados] = useState("");
  const [regimen, setRegimen] = useState("general"); // general | micro

  const sueldo = parseFloat(remuneracion);
  const meses = parseFloat(mesesTrabajados);

  const calculo = useMemo(() => {
    if (!sueldo || !meses || sueldo <= 0 || meses <= 0) return null;

    // === CTS ===
    const cts = (sueldo / 12) * meses;

    // === Vacaciones truncas ===
    const vacaciones = (sueldo / 12) * meses;

    // === Gratificación trunca (julio/diciembre)
    const gratificacion =
      regimen === "micro" ? 0 : (sueldo / 6) * (meses / 12);

    return {
      cts,
      vacaciones,
      gratificacion,
      total: cts + vacaciones + gratificacion,
    };
  }, [sueldo, meses, regimen]);

  return (
    <div className="flex flex-col gap-4 text-[#5C2E0B]">

      {/* INPUTS */}
      <div className="flex flex-col gap-2">
        <label className="font-semibold">Remuneración mensual (S/)</label>
        <input
          type="number"
          min="0"
          className="border rounded-lg px-3 py-2"
          style={{ borderColor: "rgba(92,46,11,0.3)" }}
          placeholder="Ej. 1500"
          value={remuneracion}
          onChange={(e) => setRemuneracion(e.target.value)}
        />

        <label className="font-semibold mt-2">Meses trabajados</label>
        <input
          type="number"
          min="0"
          max="12"
          className="border rounded-lg px-3 py-2"
          style={{ borderColor: "rgba(92,46,11,0.3)" }}
          placeholder="Ej. 8"
          value={mesesTrabajados}
          onChange={(e) => setMesesTrabajados(e.target.value)}
        />

        <label className="font-semibold mt-2">Régimen laboral</label>
        <select
          className="border rounded-lg px-3 py-2 bg-white"
          style={{ borderColor: "rgba(92,46,11,0.3)" }}
          value={regimen}
          onChange={(e) => setRegimen(e.target.value)}
        >
          <option value="general">Régimen General</option>
          <option value="micro">Microempresa</option>
        </select>
      </div>

      {/* RESULTADOS */}
      {calculo && (
        <div
          className="rounded-xl border p-4 bg-[#FFF7EF]"
          style={{ borderColor: "rgba(92,46,11,0.2)" }}
        >
          <div className="font-semibold mb-2">Resultados</div>
          <ul className="text-sm flex flex-col gap-1">
            <li>🔹 CTS: <b>S/ {calculo.cts.toFixed(2)}</b></li>
            <li>🔹 Vacaciones truncas: <b>S/ {calculo.vacaciones.toFixed(2)}</b></li>
            <li>
              🔹 Gratificación trunca:{" "}
              <b>S/ {calculo.gratificacion.toFixed(2)}</b>
            </li>
            <li className="mt-2 font-semibold">
              Total estimado: S/ {calculo.total.toFixed(2)}
            </li>
          </ul>
        </div>
      )}
        <button
            className="mt-4 rounded-lg px-4 py-2 font-semibold"
            style={{ background: "#5C2E0B", color: "#fff" }}
            onClick={() => {
                const html = `
                <div class="litis-tool-block">
                    <strong>💼 Liquidación laboral</strong><br/>
                    Remuneración mensual: S/ ${sueldo}<br/>
                    CTS: <b>S/ ${calculo.cts.toFixed(2)}</b><br/>
                    Vacaciones: S/ ${calculo.vacaciones.toFixed(2)}<br/>
                    Gratificación: S/ ${calculo.gratificacion.toFixed(2)}<br/>
                    <strong>Total estimado: S/ ${calculo.total.toFixed(2)}</strong><br/>
                    <em>Cálculo referencial</em>
                </div>
                `;

                window.dispatchEvent(
                new CustomEvent("litisbot:tool-result", {
                    detail: {
                    toolKey: "liquidacion_laboral",
                    title: "Liquidación laboral",
                    content: html,
                    },
                })
                );
            }}
            >
            Insertar en el chat
            </button>

      {/* NOTA LEGAL */}
      <div className="text-xs text-[#5C2E0B]/70 leading-relaxed">
        ⚠️ Cálculo referencial. La liquidación real depende del régimen,
        tipo de contrato, beneficios pactados y normativa vigente (D. Leg.
        728, D. Leg. 1086, entre otros).
      </div>
    </div>
  );
}
