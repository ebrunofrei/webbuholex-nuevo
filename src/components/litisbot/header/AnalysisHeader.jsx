import React from "react";
import { Menu, SlidersHorizontal, AlertTriangle } from "lucide-react";

/**
 * AnalysisHeader — Edición Institucional Premium
 * ------------------------------------------------------------
 * Firma internacional · Sobrio · Estratégico · No SaaS
 * ------------------------------------------------------------
 */

export default function AnalysisHeader({
  onOpenSidebar,
  onOpenControlCenter,
  onOpenCourtReview,
  legalAlert = false,
  sessionTitle = "Razonamiento conceptual",
  strategyMode = "Pensamiento estratégico",
}) {
  return (
    <header className="relative w-full bg-white border-b border-neutral-200 select-none">

      <div className="h-[72px] flex items-center justify-between px-4 md:px-8">

        {/* ================= LEFT ================= */}
        <div className="flex items-center gap-4">

          {/* Sidebar trigger (mobile) */}
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 -ml-2 text-neutral-400 hover:text-neutral-900 transition-colors"
            aria-label="Menú"
          >
            <Menu size={22} strokeWidth={1.6} />
          </button>

          {/* Logo + Identidad */}
          <div className="flex items-center gap-4">
            <img
              src="/icons/icon-192.png"
              alt="LitisBot"
              className="w-10 h-10 object-contain"
            />

            <div className="flex flex-col leading-tight">
              <span className="text-[10px] tracking-[0.18em] uppercase font-semibold text-neutral-400">
                Sesión de Análisis
              </span>

              <h1 className="text-[15px] md:text-[16px] font-semibold text-neutral-900">
                {sessionTitle}:{" "}
                <span className="text-litis-900 font-medium">
                  {strategyMode}
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* ================= RIGHT ================= */}
        <div className="flex items-center gap-6">

          {/* Estado */}
          <div className="hidden md:flex flex-col items-end leading-tight">
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest">
              Estado
            </span>
            <span className="text-[11px] font-semibold text-litis-900 tracking-wider">
              En curso
            </span>
          </div>

          {/* ⚠️ ALERTA JURÍDICA DISCRETA */}
          {legalAlert && (
            <button
              onClick={onOpenCourtReview}
              className="relative group flex items-center justify-center"
              title="Se detectaron observaciones estructurales"
            >
              <AlertTriangle
                size={18}
                className="text-amber-500 group-hover:text-amber-600 transition"
              />
              <span className="absolute -inset-1 rounded-full bg-amber-400/20 blur-md opacity-60" />
            </button>
          )}

          {/* Ajustes */}
          <button
            onClick={onOpenControlCenter}
            className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors"
            title="Ajustes estratégicos"
          >
            <span className="hidden md:block text-xs font-semibold uppercase tracking-widest">
              Ajustes
            </span>
            <SlidersHorizontal size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Línea institucional sutil */}
      <div className="h-[1px] bg-gradient-to-r from-litis-900/40 via-litis-900/10 to-transparent" />
    </header>
  );
}