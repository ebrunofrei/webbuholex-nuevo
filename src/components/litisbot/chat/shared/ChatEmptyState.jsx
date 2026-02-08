/* ============================================================================
   R7.7 — GENERAL CHAT EMPTY STATE (HOME / CONSULTIVO)
   Pure UI. No logic. No i18n. No backend.
============================================================================ */

export default function ChatEmptyState({
  title = "Cuéntame, qué pasó",
  subtitle = "Describe los hechos con calma. El derecho viene después.",
}) {
  return (
    <div className="text-center space-y-12 py-24 animate-in fade-in duration-700 ease-out">

      {/* Bienvenida principal */}
      <div className="space-y-4">
        <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">
          {title}
        </h2>

        <p className="text-slate-500 text-sm md:text-[13px] font-medium tracking-wide">
          {subtitle}
        </p>
      </div>

      {/* Separador */}
      <div className="flex justify-center">
        <div className="w-12 h-px bg-slate-200" />
      </div>

      {/* Mensajes pedagógicos (no botones, no CTA agresivo) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto px-6 pt-6">
        {[
          "Los hechos ayudan a entender el derecho.",
          "El derecho ayuda a tomar mejores decisiones.",
          "No necesitas saber leyes para empezar.",
          "Habla como lo harías en una oficina jurídica.",
        ].map((text) => (
          <div
            key={text}
            className="
              px-6 py-4 border border-slate-200 rounded-xl
              text-[12px] font-medium text-slate-600
              bg-white
            "
          >
            {text}
          </div>
        ))}
      </div>

      {/* Footer silencioso */}
      <div className="pt-10">
        <p className="text-[11px] text-slate-400 mt-10">
          Para análisis jurídico en profundidad, visita chatpro en la oficina virtual.
        </p>
        <span className="text-[9px] font-medium text-slate-300 tracking-[0.35em] uppercase">
          Cognitive Kernel R7.7++
        </span>
      </div>
    </div>
  );
}
