// ============================================================================
// 🧉 ChatSidebar — Contextos + Hilos (CANÓNICO / SIN JSX ROTO)
// ============================================================================

import React, { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import CaseItem from "./CaseItem.jsx";
import AnalysisItem from "./sidebar/AnalysisItem.jsx";
import UserMiniPanel from "./sidebar/UserMiniPanel.jsx";

export default function ChatSidebar({
  contexts = [],
  analyses = [],

  activeCaseId,
  activeAnalysisId,

  onSelectCase,
  onSelectAnalysis,

  onNuevoAnalisis,
  onOpenNuevoCaso,

  onRenameAnalysis,
  onArchiveAnalysis,
  onDeleteAnalysis,

  onGoHome,
  onGoOffice,
  onOpenAccount,
  onLogout,
}) {
  const [search, setSearch] = useState("");

  // ======================================================
  // 🔍 FILTRO CONTEXTOS
  // ======================================================
  const filteredContexts = useMemo(() => {
    const q = search.toLowerCase();
    return contexts.filter((c) =>
      (c.title || "").toLowerCase().includes(q)
    );
  }, [contexts, search]);

  // ======================================================
  // 🧠 HILOS DEL CONTEXTO ACTIVO
  // ======================================================
  const activeAnalyses = useMemo(() => {
    if (!activeCaseId) return [];
    return analyses.filter(
      (a) => a.contextId === activeCaseId && !a.archivedAt
    );
  }, [analyses, activeCaseId]);

  // ======================================================
  // 🧠 RENDER HABLEMOS (SEGURO)
  // ======================================================
  const renderHablemos = () => {
    if (!activeCaseId) {
      return (
        <div className="text-[14px] opacity-60 px-2">
          Inicia una conversación o crea un contexto.
        </div>
      );
    }

    if (activeAnalyses.length === 0) {
      return (
        <div className="text-[14px] opacity-60 px-2">
          Aún no hay hilos en este contexto.
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {activeAnalyses.map((a) => (
          <AnalysisItem
            key={a.id}
            analysis={a}
            active={a.id === activeAnalysisId}
            onSelect={() => onSelectAnalysis(a.id)}
            onRename={(title) => onRenameAnalysis(a.id, title)}
            onArchive={() => onArchiveAnalysis(a.id)}
            onDelete={() => onDeleteAnalysis(a.id)}
          />
        ))}
      </div>
    );
  };

  // ======================================================
  // 🧩 RENDER
  // ======================================================
  return (
    <aside
      className="
        flex flex-col
        h-full
        w-[280px] max-w-[280px]
        flex-shrink-0
        overflow-x-hidden
        bg-[#FAF6F2]
        border-r border-black/10
      "
      aria-label="Sidebar de contextos y hilos"
    >
      {/* HEADER */}
      <div className="px-5 pt-5 pb-4 border-b border-black/10">
        <h2 className="text-[22px] font-semibold text-[#3A2A1A]">
          Contextos
        </h2>
      </div>

      {/* ACCIONES */}
      <div className="px-5 py-3 space-y-2">
        <button
          onClick={onOpenNuevoCaso}
          className="w-full flex items-center gap-2 text-[17px] font-semibold text-[#6B3F2A] hover:underline"
        >
          <Plus size={18} className="text-red-700" />
          Nuevo contexto
        </button>

        <button
          onClick={onNuevoAnalisis}
          className="w-full flex items-center gap-2 text-[17px] font-semibold text-red-700 hover:underline"
        >
          <Plus size={18} />
          Nuevo hilo
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 bg-white rounded px-3 py-2 border">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contextos…"
            className="w-full bg-transparent outline-none text-[16px]"
          />
        </div>
      </div>

      {/* CONTEXTOS */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {filteredContexts.length === 0 && (
          <div className="px-2 py-4 text-[15px] opacity-60">
            No hay contextos creados.
          </div>
        )}

        {filteredContexts
          .filter((ctx) => ctx.role !== "__ROOT_ANALYSIS__")
          .map((ctx) => {
            const ctxId = ctx.id || ctx._id;
            const isActive = ctxId === activeCaseId;

            return (
              <div key={ctxId} className="mb-3">
                <CaseItem
                  caseData={ctx}
                  active={isActive}
                  onSelect={() => onSelectCase(ctxId)}
                />
              </div>
            );
          })}

        {/* =========================
            HABLEMOS (RÓTULO GLOBAL)
        ========================= */}
        <div className="mt-4 px-2">
          <div className="text-[16px] font-semibold text-[#3A2A1A] mb-2">
            Hablemos
          </div>
          {renderHablemos()}
        </div>
      </div>

      {/* USUARIO */}
      <UserMiniPanel
        onGoHome={onGoHome}
        onGoOffice={onGoOffice}
        onOpenAccount={onOpenAccount}
        onLogout={onLogout}
      />
    </aside>
  );
}

