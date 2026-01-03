// ============================================================
// 🧭 InputCognitiveHint — Señal semántica discreta
// ============================================================

export default function InputCognitiveHint({ label }) {
  if (!label) return null;

  return (
    <div className="text-[12px] text-black/40 dark:text-white/40 mt-1">
      {label}
    </div>
  );
}
