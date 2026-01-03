// ============================================================================
// 🗨️ ChatSessionItem — Chat dentro del Caso (Canónico)
// ----------------------------------------------------------------------------
// - Subnivel del caso
// - Alta legibilidad (baja visión)
// - Acciones desacopladas
// ============================================================================

import React, { useState } from "react";
import { MessageSquare, MoreVertical } from "lucide-react";
import ChatSessionMenu from "./ChatSessionMenu.jsx";

export default function ChatSessionItem({
  session,
  active = false,
  onSelect,
  onRename,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative">
      {/* FILA PRINCIPAL */}
      <div
        onClick={() => onSelect?.(session.sessionId)}
        className={`
          w-full flex items-center justify-between
          px-3 py-2 mb-1 rounded-lg
          cursor-pointer transition
          ${
            active
              ? "bg-white border border-[#5C2E0B]"
              : "hover:bg-[#F4ECE6]"
          }
        `}
      >
        {/* IZQUIERDA */}
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare
            size={16}
            className="text-[#5C2E0B] shrink-0"
          />

          <div className="min-w-0">
            <div className="text-[16px] font-semibold text-black truncate">
              {session.title || "Conversación"}
            </div>

            {session.updatedAt && (
              <div className="text-[14px] text-[#7A5A3A]">
                {new Date(session.updatedAt).toLocaleDateString("es-PE", {
                  day: "2-digit",
                  month: "short",
                })}
              </div>
            )}
          </div>
        </div>

        {/* DERECHA — MENÚ */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="ml-2 p-2 rounded-lg hover:bg-[#EADFD6]"
          aria-label="Acciones del chat"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {/* MENÚ CONTEXTUAL */}
      <ChatSessionMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onRename={() => {
          setMenuOpen(false);
          onRename?.(session);
        }}
        onDelete={() => {
          setMenuOpen(false);
          onDelete?.(session);
        }}
      />
    </div>
  );
}
