import React, { useEffect, useMemo, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import "chart.js/auto";

import { getResumenAnalyticsOficina } from "../services/analyticsService";
// (Opcional) Tiempo centralizado (backend). Actívalo cuando ya tengas endpoint.
// import { getNow } from "../../shared/services/timeService";

export default function AdminDashboard() {
  const [porDia, setPorDia] = useState([]);
  const [porFuente, setPorFuente] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // (Opcional) para mostrar “Actualizado: …”
  // const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErrMsg("");

        const data = await getResumenAnalyticsOficina({ signal: ctrl.signal });
        setPorDia(Array.isArray(data?.porDia) ? data.porDia : []);
        setPorFuente(Array.isArray(data?.porFuente) ? data.porFuente : []);

        // ✅ Tiempo: mejor del backend (source of truth)
        // const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; // ej: "America/Lima"
        // const now = await getNow({ tz, signal: ctrl.signal });
        // setUpdatedAt(now?.local || now?.iso || "");
      } catch (e) {
        if (e?.name === "AbortError") return;
        console.error(e);
        setPorDia([]);
        setPorFuente([]);
        setErrMsg("No se pudo cargar analytics. Revisa el endpoint de Oficina Virtual.");
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, []);

  const dataBar = useMemo(() => {
    return {
      labels: porDia.map((d) => d?._id ?? ""),
      datasets: [
        {
          label: "Consultas por día",
          backgroundColor: "#b03a1a", // rojo institucional
          data: porDia.map((d) => Number(d?.total ?? 0)),
        },
      ],
    };
  }, [porDia]);

  const dataPie = useMemo(() => {
    return {
      labels: porFuente.map((f) => f?._id ?? ""),
      datasets: [
        {
          label: "Consultas por fuente",
          // ✅ Solo institucional (rojo/blanco/marrón)
          backgroundColor: ["#b03a1a", "#4b2e19", "#8b5a2b", "#ffffff"],
          data: porFuente.map((f) => Number(f?.total ?? 0)),
        },
      ],
    };
  }, [porFuente]);

  return (
    <div className="max-w-3xl mx-auto mt-10 bg-white rounded-xl shadow p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#b03a1a]">
            Dashboard Analytics (Oficina)
          </h1>

          {/* (Opcional)
          {updatedAt ? (
            <p className="text-sm text-gray-500 mt-1">
              Actualizado: {updatedAt}
            </p>
          ) : null}
          */}

          {errMsg ? (
            <p className="text-sm text-red-600 mt-2">{errMsg}</p>
          ) : null}
        </div>

        {loading ? (
          <span className="text-sm text-gray-500">Cargando…</span>
        ) : null}
      </div>

      <div className="mb-8">
        <Bar
          data={dataBar}
          options={{
            plugins: { legend: { display: false } },
            responsive: true,
            maintainAspectRatio: true,
          }}
        />
      </div>

      <div>
        <Pie
          data={dataPie}
          options={{
            plugins: { legend: { position: "bottom" } },
            responsive: true,
            maintainAspectRatio: true,
          }}
        />
      </div>
    </div>
  );
}
