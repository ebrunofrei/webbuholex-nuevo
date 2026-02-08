export default function BubbleLauncher({ onOpen, isOpen }) {
  const ANALYST_GLYPH = "/icons/icon-192.png";
  if (isOpen) return null;

  return (
  <button
    onClick={onOpen}
    className="relative w-16 h-16 rounded-2xl flex items-center justify-center
               transition-transform duration-300 hover:scale-110 active:scale-95
               bg-transparent group"
  >
    {/* Aura de latencia */}
    <span className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-xl
                     animate-[pulse_3.5s_ease-in-out_infinite]" />

    {/* Logo flotante SIN fondo */}
    <img
      src={ANALYST_GLYPH}
      alt="Abrir Analista"
      className="relative w-12 h-12 object-contain
                 drop-shadow-[0_0_12px_rgba(59,130,246,0.55)]"
    />

    {/* Estado online */}
    <span className="absolute -top-1 -right-1 w-3.5 h-3.5
                     bg-green-500 border-2 border-white
                     rounded-full shadow-md" />
  </button>
);

}