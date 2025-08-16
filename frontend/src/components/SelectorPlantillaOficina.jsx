import React from "react";
import useLegalOSStore from "@/store/useLegalOSStore";

// Puedes usar IA aquí si deseas ("Sugerir con IA" sería otro botón)
const TEMPLATES = [
  {
    nombreEstudio: "Estudio Civil & Familia",
    colorPrimary: "#b03a1a",
    tema: "light",
    whatsapp: "",
    modulos: [
      { key: "chat", label: "Chat LitisBot", visible: true, pro: false },
      { key: "agenda", label: "Agenda", visible: true, pro: true },
      { key: "expedientes", label: "Expedientes", visible: true, pro: true }
    ]
  },
  {
    nombreEstudio: "Oficina Laboral Pro",
    colorPrimary: "#1662C4",
    tema: "blue",
    whatsapp: "",
    modulos: [
      { key: "chat", label: "Chat LitisBot", visible: true, pro: false },
      { key: "notificaciones", label: "Notificaciones", visible: true, pro: false }
    ]
  },
  {
    nombreEstudio: "Boutique Penal",
    colorPrimary: "#1d2026",
    tema: "dark",
    whatsapp: "",
    modulos: [
      { key: "chat", label: "Chat LitisBot", visible: true, pro: false },
      { key: "agenda", label: "Agenda", visible: true, pro: true }
    ]
  }
];

const SelectorPlantillaOficina = () => {
  const { setBranding } = useLegalOSStore();
  const usarPlantilla = (tpl) => {
    setBranding({
      ...tpl,
      logoUrl: "",
      faviconUrl: "",
      qrPagoUrl: "",
      linkPago: ""
    });
  };
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-3 text-[#b03a1a]">Plantillas prediseñadas</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TEMPLATES.map((tpl, i) => (
          <div key={i} className="border rounded-xl p-4 flex flex-col items-center">
            <div className="w-12 h-12 mb-2 rounded-full" style={{ background: tpl.colorPrimary }}></div>
            <div className="font-bold text-lg">{tpl.nombreEstudio}</div>
            <div className="text-xs mb-2">{tpl.tema === "light" ? "Claro" : tpl.tema === "dark" ? "Oscuro" : "Azul"}</div>
            <div className="flex flex-wrap gap-2 mb-2">
              {tpl.modulos.map(m => (
                <span key={m.key} className="bg-gray-100 text-xs px-2 py-1 rounded">{m.label}</span>
              ))}
            </div>
            <button
              className="bg-[#16c49e] text-white px-4 py-1 rounded mt-2"
              onClick={() => usarPlantilla(tpl)}
            >Usar esta plantilla</button>
          </div>
        ))}
      </div>
    </div>
  );
};
export default SelectorPlantillaOficina;
