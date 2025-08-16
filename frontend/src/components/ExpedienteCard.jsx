import React from "react";
import { FileText, FolderKanban, BadgeCheck } from "lucide-react";

export default function ExpedienteCard({ exp, onClick }) {
  return (
    <div
      className="bg-white rounded-2xl shadow-md p-5 hover:shadow-xl cursor-pointer flex flex-col gap-1 transition border-l-4 border-[#b03a1a]"
      onClick={onClick}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-lg font-bold text-[#b03a1a]">{exp.numero || "000-0000"}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
            ${exp.estado === "Activo"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"}
          `}>
          {exp.estado}
        </span>
      </div>
      <div className="text-sm text-gray-700">
        <b>Cliente:</b> {exp.cliente} &nbsp; <b>Materia:</b> {exp.materia} &nbsp; <b>Año:</b> {exp.año}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        <b>Juzgado:</b> {exp.juzgado} <br />
        <b>Responsable:</b> {exp.responsable}
      </div>
      <div className="flex gap-2 mt-2">
        <span className="inline-flex items-center gap-1 text-[#b03a1a] bg-[#fff6e6] rounded px-2 text-xs">
          <FileText size={16} /> Docs
        </span>
        <span className="inline-flex items-center gap-1 text-green-800 bg-green-100 rounded px-2 text-xs">
          <BadgeCheck size={16} /> {exp.estado}
        </span>
      </div>
    </div>
  );
}
