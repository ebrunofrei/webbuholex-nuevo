// src/components/MensajeBurbuja.jsx
import React from "react";
import { FaRegCopy, FaRegThumbsUp, FaRegThumbsDown } from "react-icons/fa";
import { FiVolume2, FiEdit3 } from "react-icons/fi";

export default function MensajeBurbuja({ msg, onCopy, onEdit, onFeedback }) {
  if (!msg) return null;

  return (
    <div className="w-full flex flex-col">
      {/* Texto del bot */}
      <div
        className="text-[#5C2E0B] leading-relaxed whitespace-pre-wrap break-words"
        dangerouslySetInnerHTML={{ __html: msg.content }}
      />

      {/* Barra de acciones */}
      <div
        className="
          flex flex-wrap items-center gap-3
          text-[#5C2E0B] text-[15px] font-normal
          mt-3
          sm:flex-row sm:justify-start
          justify-start
        "
        style={{ lineHeight: 1.2 }}
      >
        {/* Voz */}
        <button
          type="button"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-[#5C2E0B] text-white text-[14px] shadow"
          title="Leer en voz"
          onClick={() => {
            // si ya expusiste reproducirVozVaronil en window, úsala
            if (window?.reproducirVozVaronil) {
              window.reproducirVozVaronil(msg.content || "");
            }
          }}
        >
          <FiVolume2 />
        </button>

        {/* Copiar */}
        <button
          type="button"
          className="text-[#5C2E0B] text-[16px]"
          title="Copiar"
          onClick={() => onCopy?.(msg.content || "")}
        >
          <FaRegCopy />
        </button>

        {/* Editar */}
        <button
          type="button"
          className="text-[#5C2E0B] text-[16px]"
          title="Editar"
          onClick={() => onEdit?.(msg.content || "")}
        >
          <FiEdit3 />
        </button>

        {/* Like */}
        <button
          type="button"
          className="text-[#5C2E0B] text-[16px]"
          title="Útil"
          onClick={() => onFeedback?.("like")}
        >
          <FaRegThumbsUp />
        </button>

        {/* Dislike */}
        <button
          type="button"
          className="text-[#5C2E0B] text-[16px]"
          title="No me sirvió"
          onClick={() => onFeedback?.("dislike")}
        >
          <FaRegThumbsDown />
        </button>
      </div>
    </div>
  );
}
