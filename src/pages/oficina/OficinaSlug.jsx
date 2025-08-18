import { useParams } from "react-router-dom"; // O useRouter() en Next.js
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";

const OficinaPublica = () => {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [showCita, setShowCita] = useState(false);
  const [citaData, setCitaData] = useState({ nombre: "", email: "", motivo: "" });
  const [citaMsg, setCitaMsg] = useState("");

  useEffect(() => {
    const fetchOficina = async () => {
      const ref = doc(db, "oficinas_publicas", slug);
      const snap = await getDoc(ref);
      setData(snap.exists() ? snap.data() : { notfound: true });
    };
    if (slug) fetchOficina();
  }, [slug]);
  if (!data) return <div className="text-center mt-10">Cargando oficina...</div>;
  if (data.notfound) return <div className="text-center mt-10">Oficina no encontrada.</div>;
  const { branding } = data;

  // --- Solicitar cita ---
  const handleCitaSubmit = async e => {
    e.preventDefault();
    await addDoc(collection(db, "oficinas_publicas", slug, "citas"), {
      ...citaData,
      fecha: new Date().toISOString(),
      estado: "pendiente",
    });
    setCitaMsg("¡Tu solicitud fue enviada!");
    setTimeout(() => { setShowCita(false); setCitaMsg(""); }, 1800);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center py-10"
      style={{
        background: branding.tema === "dark"
          ? "#242426"
          : branding.tema === "blue"
            ? "#e4f0fb"
            : "#fff",
        color: branding.tema === "dark" ? "#fff" : "#222"
      }}
    >
      <header className="flex items-center gap-3 mb-6">
        {branding.logoUrl && (
          <img src={branding.logoUrl} alt="Logo" className="w-16 h-16 rounded-lg border" />
        )}
        <span className="text-3xl font-bold" style={{ color: branding.colorPrimary }}>
          {branding.nombreEstudio}
        </span>
        {branding.faviconUrl && (
          <img src={branding.faviconUrl} alt="Favicon" className="w-7 h-7 ml-4 rounded border" />
        )}
      </header>
      <div className="max-w-2xl w-full flex flex-col gap-6 items-center">
        {/* --- Botón WhatsApp --- */}
        {branding.whatsapp && (
          <a
            href={`https://wa.me/${branding.whatsapp}?text=Hola%2C%20quiero%20una%20consulta%20legal%20con%20${encodeURIComponent(branding.nombreEstudio)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-600 text-white rounded px-4 py-2 font-bold flex items-center gap-2"
            style={{ textDecoration: "none" }}
          >
            <svg width="24" height="24" fill="currentColor" className="inline"><path d="M16.7 14.1c-.2-.1-1.3-.6-1.5-.7-.2-.1-.3-.1-.5.1-.1.2-.6.7-.7.9-.1.2-.3.2-.5.1-.2-.1-.8-.3-1.5-1-.6-.6-1-1.2-1.1-1.4-.1-.2 0-.3.1-.4.1-.1.2-.2.3-.4.1-.1.1-.2.2-.3.1-.1.1-.2 0-.3-.1-.1-.5-1.3-.7-1.8-.2-.5-.4-.4-.5-.4h-.4c-.2 0-.3 0-.4.2-.1.2-.5.4-.5 1.2 0 .8.5 1.5 1.1 2.2 1.4 1.8 2.9 2.3 3.4 2.4.3.1.6.1.8-.1.2-.2.7-.7.7-.9.1-.2.2-.2.3-.2h.2c.1 0 .2 0 .3.1.1.1 1.3.6 1.5.7.2.1.3.1.4-.1.1-.1.1-.2.1-.4v-.6c0-.1-.1-.2-.2-.3z"/><circle cx="12" cy="12" r="10" fill="none" stroke="white" strokeWidth="2"/></svg>
            WhatsApp directo
          </a>
        )}
        {/* --- QR billetera --- */}
        {branding.qrPagoUrl && (
          <div className="flex flex-col items-center">
            <div className="mb-1 font-semibold text-[#b03a1a]">Paga directo a mi billetera</div>
            <img src={branding.qrPagoUrl} alt="QR Pago" className="w-32 h-32 rounded border" />
            <div className="text-xs text-gray-600">Escanea y paga con Plin/Yape</div>
          </div>
        )}
        {/* --- Link alternativo de pago --- */}
        {branding.linkPago && (
          <a
            href={branding.linkPago}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#b03a1a] text-white px-4 py-2 rounded font-bold mt-2"
          >
            Pagar consulta en línea
          </a>
        )}
        {/* --- Solicitar cita --- */}
        <button
          className="bg-[#16c49e] text-white px-4 py-2 rounded font-bold mb-2"
          onClick={() => setShowCita(true)}
        >
          Solicitar cita
        </button>
        {showCita && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <form onSubmit={handleCitaSubmit} className="bg-white p-5 rounded-xl max-w-xs w-full shadow relative">
              <h3 className="font-bold text-lg mb-3 text-[#16c49e]">Solicitar cita</h3>
              <input required placeholder="Nombre"
                className="w-full mb-2 border rounded px-2 py-1"
                value={citaData.nombre}
                onChange={e => setCitaData(d => ({ ...d, nombre: e.target.value }))}
              />
              <input required type="email" placeholder="Correo"
                className="w-full mb-2 border rounded px-2 py-1"
                value={citaData.email}
                onChange={e => setCitaData(d => ({ ...d, email: e.target.value }))}
              />
              <textarea required placeholder="Motivo o consulta"
                className="w-full mb-2 border rounded px-2 py-1"
                value={citaData.motivo}
                onChange={e => setCitaData(d => ({ ...d, motivo: e.target.value }))}
              />
              <button type="submit" className="bg-[#16c49e] text-white px-3 py-1 rounded w-full">Enviar</button>
              {citaMsg && <div className="text-green-600 mt-2 text-center">{citaMsg}</div>}
              <button type="button" className="absolute top-2 right-3 text-xl" onClick={() => setShowCita(false)}>✕</button>
            </form>
          </div>
        )}
      </div>
      <footer className="mt-6 text-sm text-gray-500">
        Powered by <a href="https://buholex.com" className="underline text-[#2266bb]">BúhoLex</a>
      </footer>
    </div>
  );
};

export default OficinaPublica;
