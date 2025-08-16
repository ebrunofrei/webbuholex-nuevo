import React from "react";

export default function HistorialFirmas({ historial }) {
  return (
    <div className="my-4">
      <h3 className="font-bold mb-2 text-[#b03a1a]">Historial de uso de tu firma</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Fecha</th>
              <th className="p-2">Documento</th>
              <th className="p-2">Expediente</th>
              <th className="p-2">Hash</th>
            </tr>
          </thead>
          <tbody>
            {historial?.length ? historial.map((item, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{item.fecha}</td>
                <td className="p-2">{item.nombreArchivo}</td>
                <td className="p-2">{item.expediente}</td>
                <td className="p-2 truncate">{item.hash}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="text-center text-gray-400 p-4">Sin uso registrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
