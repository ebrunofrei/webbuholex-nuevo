export default function BubbleHeader({
  onClose,

  // 🟡 Session-level notice (badge)
  sessionNote,

  // 🟢 Acción declarativa (abre modal)
  onUnlockRequest,
}) {
  const ANALYST_GLYPH = "/icons/icon-192.png";

  return (
    <header className="relative flex flex-col items-center pt-8 pb-4 px-6 bg-white border-b border-slate-100 select-none">
      
      {/* =========================
         AVATAR
      ========================= */}
      <div className="relative mb-4 w-20 h-20 flex items-center justify-center">
        <span
          className="
            absolute inset-0 rounded-full
            bg-blue-500/20 blur-2xl
            animate-[pulse_3.5s_ease-in-out_infinite]
          "
        />

        <img
          src={ANALYST_GLYPH}
          alt="LitisBot Analista"
          className="
            relative w-16 h-16 object-contain
            drop-shadow-[0_0_16px_rgba(59,130,246,0.6)]
          "
        />

        <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-4 border-white rounded-full shadow-sm" />
      </div>

      {/* =========================
         IDENTIDAD
      ========================= */}
      <div className="text-center">
        <h2 className="text-xl font-black text-slate-900 tracking-[-0.05em] uppercase leading-none">
          LitisBot{" "}
          <span className="text-blue-600 font-light ml-0.5">
            Analista
          </span>
        </h2>

        <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase mt-2">
          Kernel R7.7++
        </p>
      </div>

      {/* =========================
         SESSION NOTE BADGE
      ========================= */}
      {sessionNote && (
        <div className="mt-4 w-full max-w-[340px]">
          <div
            className="
              flex items-start justify-between gap-3
              rounded-xl
              bg-amber-50
              border border-amber-200
              px-3 py-2
              text-[11px]
              text-amber-900
              font-medium
            "
          >
            <span className="leading-snug">
              {sessionNote.message}
            </span>

            {onUnlockRequest && (
              <button
                type="button"
                onClick={onUnlockRequest}
                className="
                  shrink-0
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-wide
                  text-amber-700
                  hover:text-amber-900
                "
              >
                Desbloquear
              </button>
            )}
          </div>
        </div>
      )}

      {/* =========================
         CLOSE
      ========================= */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-900 transition-all"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </header>
  );
}
