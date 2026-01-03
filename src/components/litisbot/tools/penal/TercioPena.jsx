import React, { useState, useMemo } from "react";

/**
 * ============================================================
 * ⚖️ HerramientaTercioPena
 * ------------------------------------------------------------
 * Dominio: Penal
 * Tipo: Herramienta jurídica reusable
 *
 * - NO depende del chat
 * - NO abre ni cierra modales
 * - NO conoce planes ni contexto
 *
 * El contenedor (ChatBase / ChatPro) decide:
 * - dónde se muestra
 * - si es PRO o no
 * - si se persiste el resultado
 * ============================================================
 */

export default function TercioPena() {
  const [pena, setPena] = useState("");
  const [unidad, setUnidad] = useState("años");

  const valor = parseFloat(pena);

  const calculo = useMemo(() => {
    if (isNaN(valor) || valor <= 0) return null;

    const tercio = valor / 3;
    const mitad = valor / 2;
    const cuarto = valor / 4;

    return {
      tercio,
      mitad,
      cuarto,
    };
  }, [valor]);

  return (
    <div className="flex flex-col gap-4 text-[#5C2E0B]">
      {/* ================== INPUT ================== */}
      <div className="flex flex-col gap-2">
        <label className="font-semibold">
          Pena total impuesta
        </label>

        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            step="0.1"
            className="
              flex-1 border rounded-lg px-3 py-2
              outline-none
            "
            style={{
              borderColor: "rgba(92,46,11,0.3)",
            }}
            placeholder="Ej. 6"
            value={pena}
            onChange={(e) => setPena(e.target.value)}
          />

          <select
            className="
              border rounded-lg px-3 py-2
              outline-none bg-white
            "
            style={{
              borderColor: "rgba(92,46,11,0.3)",
            }}
            value={unidad}
            onChange={(e) => setUnidad(e.target.value)}
          >
            <option value="años">Años</option>
            <option value="meses">Meses</option>
          </select>
        </div>
      </div>

      {/* ================== RESULTADOS ================== */}
      {calculo && (
        <div
          className="
            rounded-xl border p-4
            bg-[#FFF7EF]
          "
          style={{
            borderColor: "rgba(92,46,11,0.2)",
          }}
        >
          <div className="font-semibold mb-2">
            Resultados del cálculo
          </div>

          <ul className="flex flex-col gap-1 text-sm">
            <li>
              🔹 <b>Tercio:</b>{" "}
              {calculo.tercio.toFixed(2)} {unidad}
            </li>
            <li>
              🔹 <b>Mitad:</b>{" "}
              {calculo.mitad.toFixed(2)} {unidad}
            </li>
            <li>
              🔹 <b>Cuarto:</b>{" "}
              {calculo.cuarto.toFixed(2)} {unidad}
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
                    <strong>🧮 Cálculo – Tercio de la pena</strong><br/>
                    Pena base: ${pena} años<br/>
                    Tercio: <b>${tercio} años</b><br/>
                    Mitad: ${mitad} años<br/>
                    Cuarto: ${cuarto} años<br/>
                    <em>Resultado generado por herramienta jurídica</em>
                </div>
                `;

                window.dispatchEvent(
                new CustomEvent("litisbot:tool-result", {
                    detail: {
                    toolKey: "tercio_pena",
                    title: "Cálculo – Tercio de la pena",
                    content: html,
                    },
                })
                );
            }}
            >
            Insertar en el chat
            </button>

      {/* ================== NOTA LEGAL ================== */}
      <div className="text-xs text-[#5C2E0B]/70 leading-relaxed">
        ⚠️ Este cálculo es referencial. La aplicación de beneficios
        penitenciarios depende del tipo de delito, reincidencia,
        etapa procesal y criterios jurisprudenciales vigentes.
      </div>
    </div>
  );
}
