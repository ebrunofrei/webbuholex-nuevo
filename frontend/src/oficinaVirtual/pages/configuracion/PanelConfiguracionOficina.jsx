import React, { useState } from "react";
import PieDocumentoPreview from "../../components/PieDocumentoPreview";
import { usePerfilOficina } from "../../hooks/usePerfilOficina";


const defaultLogo = "/logo-buholex.png"; // Usa tu logo base, preferible local (en public/)

const PanelConfiguracionOficina = () => {
  const { perfil, guardarPerfil, loading, user } = usePerfilOficina();
  const [logo, setLogo] = useState("");
  const [slogan, setSlogan] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [saving, setSaving] = useState(false);

  // Carga inicial con perfil
  React.useEffect(() => {
    if (perfil) {
      setLogo(perfil.logoBase64 || defaultLogo);
      setSlogan(perfil.slogan || "");
    }
  }, [perfil]);

  // Subida de logo y conversión a base64
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMensaje("Solo se permiten imágenes.");
      return;
    }
    if (file.size > 256 * 1024) {
      setMensaje("El logo debe pesar menos de 256 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setLogo(e.target.result);
    reader.readAsDataURL(file);
    setMensaje("");
  };

  // Guardar cambios en Firestore
  const handleGuardar = async () => {
    setSaving(true);
    try {
      await guardarPerfil({ logoBase64: logo, slogan });
      setMensaje("Configuración guardada ✔");
    } catch (e) {
      setMensaje("Error al guardar: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-lg mx-auto bg-white rounded-xl shadow-lg p-6 mt-6">
      <h1 className="text-2xl font-bold mb-4 text-[#b76e33]">
        Configuración de tu Oficina Virtual
      </h1>

      <label className="block font-semibold mb-1">Logo institucional:</label>
      <input
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleLogoChange}
      />
      {logo && (
        <img
          src={logo}
          alt="Logo Preview"
          className="my-2"
          style={{
            maxWidth: 130,
            maxHeight: 60,
            border: "1.5px solid #e7be5b",
            borderRadius: 8,
            background: "#fff",
            objectFit: "contain",
          }}
        />
      )}

      <label className="block font-semibold mt-4 mb-1">Slogan o lema:</label>
      <input
        type="text"
        className="border rounded px-3 py-2 w-full"
        placeholder="Ejemplo: Estudio Jurídico Mendoza"
        maxLength={60}
        value={slogan}
        onChange={(e) => setSlogan(e.target.value)}
      />

      <button
        className={`mt-5 w-full py-2 rounded-xl font-bold bg-[#b76e33] hover:bg-[#a25423] text-white`}
        disabled={saving || loading}
        onClick={handleGuardar}
      >
        {saving ? "Guardando..." : "Guardar configuración"}
      </button>
      {mensaje && (
        <div className="text-green-600 font-semibold text-sm mt-2">{mensaje}</div>
      )}

      <hr className="my-6" />
      <div className="text-center text-xs text-gray-500 mb-2">
        <b>Vista previa del pie de tus documentos firmados:</b>
      </div>
      <PieDocumentoPreview
        logo={logo || defaultLogo}
        slogan={slogan}
        nombre={user?.displayName || user?.email}
      />
    </div>
  );
};

export default PanelConfiguracionOficina;
