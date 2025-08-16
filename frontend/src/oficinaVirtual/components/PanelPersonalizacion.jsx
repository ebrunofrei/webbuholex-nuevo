import React, { useRef } from "react";
import useLegalOSStore from "@/store/useLegalOSStore";

// Temas y colores para demo
const temas = [
  { name: "Claro", value: "light", color: "#f9fafb" },
  { name: "Oscuro", value: "dark", color: "#242426" },
  { name: "Azul", value: "blue", color: "#1662C4" },
];
const colores = ["#b03a1a", "#1662C4", "#16c49e", "#ffc107", "#fff"];

// --- Preview tipo builder ---
const OficinaPreview = ({ branding, plan }) => (
  <div
    className="rounded-xl border shadow mt-8 mb-8 p-6"
    style={{
      background: branding.tema === "dark"
        ? "#242426"
        : branding.tema === "blue"
          ? "#e4f0fb"
          : "#fff",
      color: branding.tema === "dark" ? "#fff" : "#222",
      borderColor: branding.colorPrimary,
      minHeight: 230,
      transition: "all 0.2s"
    }}
  >
    <header className="flex items-center gap-3 mb-4">
      {branding.logoUrl ? (
        <img src={branding.logoUrl} alt="Logo" className="w-12 h-12 rounded-lg border" />
      ) : (
        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-xl text-gray-400">Logo</div>
      )}
      <span className="text-2xl font-bold" style={{ color: branding.colorPrimary }}>
        {branding.nombreEstudio}
      </span>
      {branding.faviconUrl && (
        <img src={branding.faviconUrl} alt="Favicon" className="w-7 h-7 ml-4 rounded border" />
      )}
    </header>
    <div className="flex flex-wrap gap-3">
      {branding.modulos.filter(m => m.visible).map(m => (
        <div
          key={m.key}
          className={`flex-1 min-w-[120px] p-3 rounded-lg shadow-sm text-center
            ${m.pro && !(plan === "pro" || plan === "enterprise") ? "bg-yellow-50 text-[#b03a1a]" : "bg-gray-50"}
          `}
        >
          {m.pro && !(plan === "pro" || plan === "enterprise")
            ? <>Módulo <b>{m.label}</b> solo PRO</>
            : <>[Vista {m.label}]</>
          }
        </div>
      ))}
      {!branding.modulos.filter(m => m.visible).length && (
        <div className="text-gray-400 w-full text-center py-4">Ningún módulo visible. Activa módulos para ver el preview.</div>
      )}
    </div>
  </div>
);

const PanelPersonalizacion = () => {
  const { branding, updateBranding, guardarEnFirestore, plan } = useLegalOSStore();
  const logoInput = useRef();
  const faviconInput = useRef();

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
  // Drag & drop módulos
  const handleDrag = (from, to) => {
    const nuevos = [...branding.modulos];
    const [item] = nuevos.splice(from, 1);
    nuevos.splice(to, 0, item);
    updateBranding("modulos", nuevos);
  };
  // Mostrar/ocultar módulo
  const handleToggle = idx => {
    const nuevos = [...branding.modulos];
    nuevos[idx].visible = !nuevos[idx].visible;
    updateBranding("modulos", nuevos);
  };
  const modulos = branding.modulos || [];

  return (
    <div>
      {/* --- Preview tipo builder arriba --- */}
      <OficinaPreview branding={branding} plan={plan} />
      <div className="bg-white shadow rounded-xl p-6 max-w-md mx-auto mb-8">
        <h2 className="text-xl font-bold mb-4 text-[#b03a1a]">Personaliza tu Oficina</h2>
        {/* Logo */}
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => logoInput.current.click()} className="text-blue-600 underline">
            Cambiar Logo
          </button>
          <input type="file" ref={logoInput} style={{ display: "none" }} accept="image/*" onChange={handleLogoChange} />
        </div>
        {/* Favicon */}
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => faviconInput.current.click()} className="text-blue-600 underline">
            Cambiar Favicon
          </button>
          <input type="file" ref={faviconInput} style={{ display: "none" }} accept="image/*" onChange={handleFaviconChange} />
        </div>
        {/* Nombre */}
        <div className="mb-4">
          <label className="block mb-1 font-semibold">Nombre del Estudio:</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-1"
            value={branding.nombreEstudio}
            onChange={e => updateBranding("nombreEstudio", e.target.value)}
          />
        </div>
        {/* Color principal */}
        <div className="mb-4">
          <label className="block mb-1 font-semibold">Color principal:</label>
          <div className="flex gap-2">
            {colores.map(c => (
              <button key={c} className="w-8 h-8 rounded-full border-2"
                style={{ background: c, borderColor: branding.colorPrimary === c ? "#222" : "#eee" }}
                onClick={() => updateBranding("colorPrimary", c)}
              />
            ))}
          </div>
        </div>
        {/* Tema */}
        <div className="mb-4">
          <label className="block mb-1 font-semibold">Tema:</label>
          <div className="flex gap-3">
            {temas.map(t => (
              <button key={t.value}
                onClick={() => updateBranding("tema", t.value)}
                className={`rounded-full px-4 py-1 border ${branding.tema === t.value ? "border-[#b03a1a] font-bold" : "border-gray-200"}`}
                style={{ background: t.color, color: t.value === "dark" ? "#fff" : "#222" }}>
                {t.name}
              </button>
            ))}
          </div>
        </div>
        {/* Módulos: drag & drop y visible */}
        <div className="mb-4">
          <label className="block mb-1 font-semibold">Módulos:</label>
          <ul>
            {modulos.map((mod, idx) => (
              <li
                key={mod.key}
                draggable
                onDragStart={e => e.dataTransfer.setData("from", idx)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  const from = +e.dataTransfer.getData("from");
                  handleDrag(from, idx);
                }}
                className="flex items-center gap-2 p-1 border-b"
                style={{ opacity: mod.visible ? 1 : 0.5, cursor: "move" }}
              >
                <input
                  type="checkbox"
                  checked={mod.visible}
                  onChange={() => handleToggle(idx)}
                  disabled={mod.pro && !(plan === "pro" || plan === "enterprise")}
                />
                <span className="flex-1">
                  {mod.label}
                  {mod.pro && (
                    <span className="ml-2 text-xs text-[#b03a1a] font-bold">PRO</span>
                  )}
                </span>
                <span className="text-gray-400 text-xs">(Arrastra para reordenar)</span>
              </li>
            ))}
          </ul>
        </div>
        <button
          className="bg-[#b03a1a] text-white px-5 py-2 rounded mt-2 font-bold w-full"
          onClick={guardarEnFirestore}
        >Guardar configuración</button>
      </div>
    </div>
  );
};

export default PanelPersonalizacion;
