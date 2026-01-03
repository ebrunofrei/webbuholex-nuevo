// ============================================================================
// 🧉 ChatSidebar — Contextos + Análisis (CANÓNICO / HARDWARE)
// ----------------------------------------------------------------------------
// - UI pura (hardware)
// - NO crea análisis
// - NO toca storage
// - NO condiciona flujos
// - Emite callbacks al orquestador
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
  onOpenControlCenter,
  onLogout,
}) {
  const [search, setSearch] = useState("");

  // ======================================================
  // FILTRO CONTEXTOS (UI ONLY)
  // ======================================================
  const filteredContexts = useMemo(() => {
    const q = search.toLowerCase();
    return contexts.filter((c) =>
      (c.title || "").toLowerCase().includes(q)
    );
  }, [contexts, search]);

  // ======================================================
  // RENDER
  // ======================================================
  return (
    <aside className="flex flex-col h-full bg-[#FAF6F2] border-r border-black/10">

      {/* ======================================================
          HEADER
      ====================================================== */}
      <div className="px-5 pt-5 pb-4 border-b border-black/10">
        <h2 className="text-[22px] font-semibold text-[#3A2A1A]">
          Contextos
        </h2>
      </div>

      {/* ======================================================
          BUSCADOR (SIEMPRE ARRIBA)
      ====================================================== */}
      <div className="px-5 py-3">
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

      {/* ======================================================
          ACCIONES GLOBALES (HARDWARE PURO)
      ====================================================== */}
      <div className="px-5 py-2 space-y-2">
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
          Nuevo análisis
        </button>
      </div>

      {/* ======================================================
          LISTA CONTEXTOS + ANÁLISIS
      ====================================================== */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">

        {filteredContexts.length === 0 && (
          <div className="px-2 py-4 text-[15px] opacity-60">
            No hay contextos creados.
          </div>
        )}

        {filteredContexts.map((ctx) => {
          const ctxId = ctx.id || ctx._id;
          const isActive = ctxId === activeCaseId;

          const activeAnalyses = analyses.filter(
            (a) => a.contextId === ctxId && !a.archivedAt
          );

          const archivedAnalyses = analyses.filter(
            (a) => a.contextId === ctxId && a.archivedAt
          );

          return (
            <div key={ctxId} className="mb-4">

              {/* CONTEXTO */}
              <CaseItem
                caseData={ctx}
                active={isActive}
                onSelect={() => onSelectCase(ctxId)}
              />

              {/* ANÁLISIS ACTIVOS */}
              {isActive && activeAnalyses.length > 0 && (
                <div className="ml-6 mt-2 space-y-1">
                  {activeAnalyses.map((a) => (
                    <AnalysisItem
                      key={a.id}
                      analysis={a}
                      active={a.id === activeAnalysisId}
                      onSelect={() => onSelectAnalysis(a.id)}
                      onRename={(title) =>
                        onRenameAnalysis(a.id, title)
                      }
                      onArchive={() =>
                        onArchiveAnalysis(a.id)
                      }
                      onDelete={() =>
                        onDeleteAnalysis(a.id)
                      }
                    />
                  ))}
                </div>
              )}

              {/* ARCHIVADOS */}
              {isActive && archivedAnalyses.length > 0 && (
                <details className="ml-6 mt-3">
                  <summary className="text-[14px] opacity-70 cursor-pointer select-none">
                    Archivados
                  </summary>

                  <div className="mt-2 space-y-1">
                    {archivedAnalyses.map((a) => (
                      <AnalysisItem
                        key={a.id}
                        analysis={a}
                        active={false}
                        onSelect={() => onSelectAnalysis(a.id)}
                        onRename={(title) =>
                          onRenameAnalysis(a.id, title)
                        }
                        onArchive={() =>
                          onArchiveAnalysis(a.id) // RESTAURA
                        }
                        onDelete={() =>
                          onDeleteAnalysis(a.id)
                        }
                      />
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>

      {/* ======================================================
          USUARIO
      ====================================================== */}
      <UserMiniPanel
        onGoHome={onGoHome}
        onGoOffice={onGoOffice}
        onOpenControlCenter={onOpenControlCenter}
        onLogout={onLogout}
      />
    </aside>
  );
}
