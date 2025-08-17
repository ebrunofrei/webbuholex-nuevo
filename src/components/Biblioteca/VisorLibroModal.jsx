import React from "react";

function esArchivoPDF(url = "") {
  if (!url) return false;
  try {
    const pathname = new URL(url, window.location.origin).pathname.toLowerCase();
    return pathname.endsWith(".pdf");
  } catch {
    return url.toLowerCase().split("?")[0].endsWith(".pdf");
  }
}

export default function VisorLibroModal({ libro, onClose }) {
  if (!libro) return null;
  const esPDF = esArchivoPDF(libro.urlArchivo);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
      style={{ padding: 0, margin: 0 }}
    >
      <div
        className="relative flex flex-col bg-white"
        style={{
          width: "100vw",
          height: "100vh",
          maxWidth: "100vw",
          maxHeight: "100vh",
          borderRadius: 0,
          boxShadow: "none",
          margin: 0,
          padding: 0,
        }}
      >
        {/* Botón cerrar */}
        <button
          className="absolute top-3 right-5 text-gray-500 hover:text-[#7a2518] text-4xl font-extrabold z-20"
          onClick={onClose}
          style={{ background: "#fff8", borderRadius: "50%", padding: "0 12px" }}
          aria-label="Cerrar visor"
        >
          &times;
        </button>

        {/* Encabezado libro */}
        <div
          className="w-full py-3 px-2 border-b border-[#7a2518] bg-[#ffe4d6] flex flex-col items-center"
          style={{
            minHeight: 70,
            fontSize: "2.1vw",
            fontWeight: 900,
            letterSpacing: 1,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2.6vw", fontWeight: "bold", color: "#7a2518", textShadow: "0 2px 8px #fff" }}>
            {libro.titulo}
          </div>
          <div className="text-[#3e2723] font-semibold" style={{ fontSize: "1.3vw" }}>
            {libro.autor}
          </div>
          <div className="text-[#7a2518]" style={{ fontSize: "1.1vw" }}>
            {libro.materia} {libro.anio && `· ${libro.anio}`}
          </div>
        </div>

        {/* PDF */}
        <div
          className="flex-1 flex flex-col items-center justify-center w-full"
          style={{
            background: "#222",
            padding: 0,
            height: "100%",
            minHeight: 0,
          }}
        >
          {esPDF ? (
            <iframe
              src={libro.urlArchivo + "#toolbar=0&navpanes=0&scrollbar=0"}
              title={libro.titulo}
              className="w-full"
              style={{
                width: "100vw",
                height: "calc(100vh - 70px)",
                border: "none",
                background: "#fff",
              }}
              allowFullScreen
            ></iframe>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <span className="text-xl text-[#7a2518] font-semibold mb-5 text-center">
                Este formato no es compatible para lectura directa.
              </span>
              <a
                href={libro.urlArchivo}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded bg-[#7a2518] text-white font-bold shadow hover:bg-[#a33624] text-lg transition"
              >
                Descargar o ver el archivo
              </a>
            </div>
          )}
        </div>
        {/* Pie de página con link PDF */}
        {esPDF && (
          <div className="p-3 border-t text-center bg-[#fff4ed]">
            <a
              href={libro.urlArchivo}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7a2518] underline font-semibold text-base"
            >
              Abrir en otra pestaña / Descargar PDF
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
