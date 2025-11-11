import React, { useEffect, useState, useMemo } from "react";

const BASE = import.meta.env.BASE_URL || "/";
const AVATAR_96  = `${BASE}images/litisbot/litisbot-avatar-96.png`;
const AVATAR_112 = `${BASE}images/litisbot/litisbot-avatar-112.png`;

/**
 * LitisBotFAB
 * variant:
 *  - "pulseOnly"            -> solo latido cada X segundos (sobrio)
 *  - "pulseBadgeHint" (def) -> latido + badge "Nuevo" + hint (1ª sesión)
 */
export default function LitisBotFAB({
  onClick,
  variant = "pulseBadgeHint",
  bottom = 24,      // espacio desde el borde inferior (px)
  right = 24,       // espacio desde el borde derecho (px)
  size = 64,        // 56–64 recomendado
}) {
  const [pulse, setPulse] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const stylePos = useMemo(() => ({
    bottom: `${bottom}px`,
    right: `${right}px`,
    width: `${size}px`,
    height: `${size}px`,
  }), [bottom, right, size]);

  // Nudge / Pulse scheduler (cada 12s). Máx 3 veces por sesión si variant completo.
  useEffect(() => {
    const doPulse = () => { setPulse(true); setTimeout(()=>setPulse(false), 1800); };
    const key = "lb-nudges";
    let nudges = Number(sessionStorage.getItem(key) || 0);

    // primer latido a los 2.5s (siempre uno)
    const t0 = setTimeout(doPulse, 2500);

    // siguientes cada 12s (según variant)
    const id = setInterval(() => {
      if (variant === "pulseOnly") return doPulse();
      if (nudges >= 3) return; // limita a 3
      doPulse();
      nudges += 1;
      sessionStorage.setItem(key, String(nudges));
    }, 12000);

    return () => { clearTimeout(t0); clearInterval(id); };
  }, [variant]);

  // Hint “¿Necesitas ayuda?” solo primera sesión (variant completo)
  useEffect(() => {
    if (variant !== "pulseBadgeHint") return;
    if (sessionStorage.getItem("lb-hint") === "1") return;
    setShowHint(true);
    const t = setTimeout(() => {
      setShowHint(false);
      sessionStorage.setItem("lb-hint", "1");
    }, 4200);
    return () => clearTimeout(t);
  }, [variant]);

  return (
    <button
      type="button"
      aria-label="Abrir LitisBot"
      onClick={onClick}
      onKeyDown={(e)=>{ if (e.key==='Enter' || e.key===' ') onClick?.(); }}
      className={[
        "fixed z-[9999] grid place-items-center rounded-full bg-white shadow-lg ring-1 ring-black/10",
        "transition-transform hover:shadow-2xl hover:scale-[1.04] active:scale-95",
        pulse ? "lb-pulse" : ""
      ].join(" ")}
      style={stylePos}
    >
      {/* badge “Nuevo” (solo variant completo y sin contaminar UI) */}
      {variant === "pulseBadgeHint" && (
        <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full
                         bg-cyan-600 text-white shadow ring-1 ring-white/70 select-none">
          Nuevo
        </span>
      )}

      <img
        src={AVATAR_96}
        srcSet={`${AVATAR_96} 1x, ${AVATAR_112} 2x`}
        alt=""
        className="object-contain"
        style={{ width: size * 0.66, height: size * 0.66 }}
        loading="lazy"
      />

      {/* hint discreto en desktop/hover o primera sesión */}
      {variant === "pulseBadgeHint" && showHint && (
        <div className="lb-tooltip lb-pop hidden md:block">
          ¿Necesitas ayuda? Chatea conmigo.
        </div>
      )}
    </button>
  );
}
