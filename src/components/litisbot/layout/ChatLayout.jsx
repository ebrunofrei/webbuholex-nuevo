// ============================================================================
// 🧱 ChatLayout — Base estructural CANÓNICA (Refactor FASE 1.1-B)
// ----------------------------------------------------------------------------
// Principios:
// - El chat SIEMPRE se renderiza (rehidratación garantizada)
// - El caso es contexto, no bloqueo
// - El layout decide, el engine obedece
// ============================================================================

import React from "react";
import { useCase } from "@/context/CaseContext";

/**
 * Props:
 * - sidebar   : ReactNode
 * - header    : ReactNode
 * - window    : ReactNode (ChatWindow)
 * - input     : ReactNode (ChatInputBar)
 * - overlays  : ReactNode (Drawers / Modals)
 */
export default function ChatLayout({
  sidebar,
  header,
  window,
  input,
  overlays,
}) {
  const { caseContext, loadingCase } = useCase();

  const hasCase = Boolean(caseContext?.caseId);

  return (
    <div className="w-full h-[100dvh] flex bg-white text-black">
      {/* ================= SIDEBAR ================= */}
      {sidebar && (
        <aside
          className="
            hidden md:flex
            w-[320px] min-w-[320px]
            border-r border-black/10
            bg-white
          "
        >
          {sidebar}
        </aside>
      )}

      {/* ================= MAIN ================= */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* ---------- HEADER ---------- */}
        {header && (
          <div className="shrink-0 border-b border-black/10">
            {header}
          </div>
        )}

        {/* ---------- CHAT WINDOW (SIEMPRE) ---------- */}
        <section className="flex-1 min-h-0 flex flex-col">
          {window}
        </section>

        {/* ---------- INPUT ---------- */}
        {input && (
          <div className="shrink-0 border-t border-black/10">
            {input}
          </div>
        )}
      </main>

      {/* ================= OVERLAYS ================= */}
      {overlays}
    </div>
  );
}
