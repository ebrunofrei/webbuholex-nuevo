import React, { useRef } from "react";
import useLegalOSStore from '@/store/useLegalOSStore';
const colores = ["#b03a1a", "#1662C4", "#16c49e", "#ffc107", "#fff"];
const temas = [
  { name: "Claro", value: "light", color: "#f9fafb" },
  { name: "Oscuro", value: "dark", color: "#242426" },
  { name: "Azul", value: "blue", color: "#1662C4" },
];

const PanelPersonalizacion = () => {
  const { branding, updateBranding, guardarEnFirestore } = useLegalOSStore();
  const logoInput = useRef();
  const faviconInput = useRef();
  const qrInput = useRef();

  // Logo
  const handleLogoChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => updateBranding("logoUrl", ev.target.result);
    reader.readAsDataURL(file);
  };

  // Favicon
  const handleFaviconChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => updateBranding("faviconUrl", ev.target.result);
    reader.readAsDataURL(file);
  };

  // QR billetera
  const handleQRChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => updateBranding("qrPagoUrl", ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white shadow rounded-xl p-6 max-w-md mx-auto mb-8">
      <h2 className="text-xl font-bold mb-4 text-[#b03a1a]">Personaliza tu Oficina</h2>
      {/* Logo y favicon */}
      <div className="mb-2 flex items-center gap-3">
        <button onClick={() => logoInput.current.click()} className="text-blue-600 underline">
          Cambiar Logo
        </button>
        <input type="file" ref={logoInput} style={{ display: "none" }} accept="image/*" onChange={handleLogoChange} />
        <button onClick={() => faviconInput.current.click()} className="text-blue-600 underline">
          Cambiar Favicon
        </button>
        <input type="file" ref={faviconInput} style={{ display: "none" }} accept="image/*" onChange={handleFaviconChange} />
      </div>
      {/* Nombre */}
      <div className="mb-3">
        <label className="block mb-1 font-semibold">Nombre del Estudio:</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-1"
          value={branding.nombreEstudio}
          onChange={e => updateBranding("nombreEstudio", e.target.value)}
        />
      </div>
      {/* WhatsApp */}
      <div className="mb-3">
        <label className="block mb-1 font-semibold">WhatsApp de contacto (ej: 51999999999):</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-1"
          value={branding.whatsapp || ""}
          onChange={e => updateBranding("whatsapp", e.target.value)}
        />
      </div>
      {/* QR billetera */}
      <div className="mb-3">
        <label className="block mb-1 font-semibold">QR Plin/Yape para recibir pagos (opcional):</label>
        <div className="flex gap-3 items-center">
          <button onClick={() => qrInput.current.click()} className="text-blue-600 underline">
            {branding.qrPagoUrl ? "Cambiar QR" : "Subir QR"}
          </button>
          <input type="file" ref={qrInput} style={{ display: "none" }} accept="image/*" onChange={handleQRChange} />
          {branding.qrPagoUrl && (
            <img src={branding.qrPagoUrl} alt="QR Pago" className="w-14 h-14 rounded border" />
          )}
        </div>
      </div>
      {/* Link alternativo de pago */}
      <div className="mb-3">
        <label className="block mb-1 font-semibold">Link de pago rápido (Culqi/MercadoPago, opcional):</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-1"
          value={branding.linkPago || ""}
          onChange={e => updateBranding("linkPago", e.target.value)}
        />
      </div>
      {/* Color y tema */}
      <div className="mb-3 flex gap-4 items-center">
        <label className="font-semibold">Color:</label>
        {colores.map(c => (
          <button key={c} className="w-7 h-7 rounded-full border-2"
            style={{ background: c, borderColor: branding.colorPrimary === c ? "#222" : "#eee" }}
            onClick={() => updateBranding("colorPrimary", c)}
          />
        ))}
        <label className="ml-6 font-semibold">Tema:</label>
        {temas.map(t => (
          <button key={t.value}
            onClick={() => updateBranding("tema", t.value)}
            className={`rounded-full px-2 py-1 border ${branding.tema === t.value ? "border-[#b03a1a] font-bold" : "border-gray-200"}`}
            style={{ background: t.color, color: t.value === "dark" ? "#fff" : "#222" }}>
            {t.name}
          </button>
        ))}
      </div>
      <button
        className="bg-[#b03a1a] text-white px-5 py-2 rounded mt-2 font-bold w-full"
        onClick={guardarEnFirestore}
      >Guardar configuración</button>
    </div>
  );
};

export default PanelPersonalizacion;
