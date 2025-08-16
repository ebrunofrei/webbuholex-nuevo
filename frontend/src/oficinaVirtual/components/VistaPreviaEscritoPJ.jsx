import React from "react";

export default function VistaPreviaEscritoPJ({ contenido, firmaUrl, abogado }) {
  return (
    <div className="bg-white p-6 md:p-12 shadow max-w-2xl mx-auto border rounded my-4 print:p-0 print:shadow-none print:border-none print:my-0">
      {/* Cabecera estilo PJ */}
      <div className="text-center mb-6">
        <div className="font-bold text-lg text-[#b03a1a]">EXPEDIENTE DIGITAL - PODER JUDICIAL DEL PERÚ</div>
        <div className="text-xs text-gray-600">Sistema de Escritos Judiciales Electrónicos</div>
        <hr className="my-2 border-[#b03a1a]" />
      </div>

      {/* Contenido principal (escrito) */}
      <div className="text-base md:text-lg leading-relaxed mb-8 whitespace-pre-wrap font-serif">
        {contenido}
      </div>

      {/* Firma escaneada (si existe) */}
      {firmaUrl && (
        <div className="mt-16 flex flex-col items-end">
          <img
            src={firmaUrl}
            alt="Firma Abogado"
            style={{ height: 72, maxWidth: 350, objectFit: "contain" }}
            className="border p-1 bg-white shadow rounded"
          />
          <div className="text-xs text-gray-700 mt-2 font-semibold text-right">
            {abogado || "Abogado(a) Responsable"}
          </div>
        </div>
      )}

      {/* Advertencia legal */}
      <div className="mt-4 text-xs text-yellow-700 border-l-4 border-yellow-500 pl-2">
        <b>Advertencia:</b> La firma aquí insertada corresponde a la firma escaneada declarada por el user, válida para escritos electrónicos en plataformas administrativas/judiciales, pero no reemplaza la firma digital con certificado electrónico.
      </div>
    </div>
  );
}
