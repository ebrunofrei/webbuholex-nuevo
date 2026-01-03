// ============================================================================
// 🧠 BotThinkingState — Estados cognitivos del Bot (UX-3.4)
// ----------------------------------------------------------------------------
// - Ícono institucional real
// - Discreto, humano, profesional
// - Sin ruido visual
// ============================================================================

import React from "react";

const LABELS = {
  thinking: "Analizando…",
  structuring: "Organizando ideas…",
  drafting: "Redactando…",
};

export default function BotThinkingState({ state }) {
  if (!state || !LABELS[state]) return null;

  return (
    <div className="flex items-center gap-3 mt-4 opacity-70 animate-pulse">
      {/* ÍCONO LITISBOT (PÚBLICO / PWA) */}
      <img
        src="/icons/icon-192.png"
        alt="LitisBot"
        className="w-6 h-6 rounded-full"
      />

      {/* TEXTO COGNITIVO */}
      <span className="text-sm text-black/60 dark:text-white/60">
        {LABELS[state]}
      </span>
    </div>
  );
}
