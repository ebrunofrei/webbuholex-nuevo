import React, { useEffect, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import "chart.js/auto"; // Importa chart.js completo

export default function AdminDashboard() {
  const [porDia, setPorDia] = useState([]);
  const [porFuente, setPorFuente] = useState([]);

  useEffect(() => {
    fetch("/api/analytics/resumen")
      .then(r => r.json())
      .then(data => {
        setPorDia(data.porDia || []);
        setPorFuente(data.porFuente || []);
      });
  }, []);

  // Datos para Chart.js
  const dataBar = {
    labels: porDia.map(d => d._id),
    datasets: [{
      label: "Consultas por día",
      backgroundColor: "#b03a1a",
      data: porDia.map(d => d.total),
    }]
  };
  const dataPie = {
    labels: porFuente.map(f => f._id),
    datasets: [{
      label: "Consultas por fuente",
      backgroundColor: ["#b03a1a", "#4b2e19", "#0ea5e9", "#fbbf24"],
      data: porFuente.map(f => f.total),
    }]
  };

  return (
    <div className="max-w-3xl mx-auto mt-10 bg-white rounded-xl shadow p-8">
      <h1 className="text-2xl font-extrabold mb-6 text-[#b03a1a]">Dashboard Analytics</h1>
      <div className="mb-8">
        <Bar data={dataBar} options={{ plugins: { legend: { display: false } } }} />
      </div>
      <div>
        <Pie data={dataPie} />
      </div>
    </div>
  );
}
