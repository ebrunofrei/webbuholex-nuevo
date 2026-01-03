// ============================================================================
// 🧠 ChatEmptyState – Estado Cero Cognitivo (FASE 6)
// ----------------------------------------------------------------------------
// - No es onboarding
// - No es tutorial
// - Es orientación silenciosa
// ============================================================================

import React from "react";

export default function ChatEmptyState({ onExample }) {
  return (
    <div
      className="
        flex flex-col items-center justify-center
        h-full px-6
        text-center
        select-none
      "
    >
      {/* Frase principal */}
      <p
        className="
          text-[20px] md:text-[22px]
          leading-relaxed
          text-black dark:text-white
          max-w-xl
        "
      >
        Cuando quieras, escribe tu consulta.
      </p>

      {/* Subtexto */}
      <p
        className="
          mt-3
          text-[16px] md:text-[17px]
          text-black/60 dark:text-white/60
          max-w-xl
        "
      >
        Puedes plantear un problema, pedir un análisis o revisar un documento.
      </p>

      {/* Ejemplos (texto clicable, no botones) */}
      <div
        className="
          mt-6
          text-[15px]
          text-black/40 dark:text-white/40
          space-y-2
        "
      >
        <div>
          <span
            className="hover:underline cursor-pointer"
            onClick={() =>
              onExample?.("Analiza este caso desde un enfoque jurídico.")
            }
          >
            Analizar un caso
          </span>
        </div>

        <div>
          <span
            className="hover:underline cursor-pointer"
            onClick={() =>
              onExample?.("Revisa este documento y dime los puntos críticos.")
            }
          >
            Revisar un documento
          </span>
        </div>

        <div>
          <span
            className="hover:underline cursor-pointer"
            onClick={() =>
              onExample?.("Explícame este problema como si fuera para un cliente.")
            }
          >
            Pedir una explicación clara
          </span>
        </div>
      </div>
    </div>
  );
}
