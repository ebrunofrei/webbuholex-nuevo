import React from "react";
import { generarPDFConFirmaYQR } from "@/utils/pdfFirma";

export default function BotonGenerarPDF({ textoDocumento, firmaUrl, datosAbogado, onPDF }) {
  const handleClick = async () => {
    await generarPDFConFirmaYQR({
      textoDocumento,
      firmaUrl,
      datosAbogado,
      onFinish: (hash) => {
        if (onPDF) onPDF(hash);
        // Aquí puedes registrar el uso, mostrar alerta, etc.
      }
    });
  };
  return (
    <button
      className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded"
      onClick={handleClick}
    >
      Generar PDF firmado
    </button>
  );
}
