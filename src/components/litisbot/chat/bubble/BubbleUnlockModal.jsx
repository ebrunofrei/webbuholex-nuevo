// ============================================================================
// LITIS | Bubble Unlock Modal — Culqi Checkout (R7.7++ CANONICAL)
// ----------------------------------------------------------------------------
// - Mobile-first
// - Culqi-native UX (no fake buttons)
// - Does NOT unlock directly
// - Emits payment token only
// - UX-safe (silent close on failure)
// ============================================================================

import { useEffect, useRef } from "react";

export default function BubbleUnlockModal({
  open,
  onClose,
  onPaymentToken, // 🔑 token → backend
  amount = 100, // USD 1 (centavos)
}) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }

    // --------------------------------------------------
    // Defensa: Culqi SDK debe existir
    // --------------------------------------------------
    if (!window.Culqi) {
      console.error("❌ Culqi SDK not loaded");
      onClose?.();
      return;
    }

    // --------------------------------------------------
    // Evitar doble inicialización (StrictMode / re-render)
    // --------------------------------------------------
    if (initializedRef.current) return;
    initializedRef.current = true;

    // --------------------------------------------------
    // Configuración Culqi
    // --------------------------------------------------
    window.Culqi.publicKey =
      import.meta.env.VITE_CULQI_PUBLIC_KEY;

    window.Culqi.settings({
      title: "LitisBot · Análisis jurídico avanzado",
      currency: "USD",
      amount,
    });

    window.Culqi.options({
      lang: "es",
      installments: false,
      paymentMethods: {
        tarjeta: true,
        yape: true,
        billetera: true,
      },
      style: {
        logo: "https://buholex.com/logo.png",
      },
    });

    // --------------------------------------------------
    // Abrir checkout
    // --------------------------------------------------
    window.Culqi.open();
  }, [open, amount, onClose]);

  // ======================================================
  // Culqi callback (GLOBAL — diseño oficial Culqi)
  // ======================================================
  window.culqi = function () {
    if (window.Culqi.token) {
      const token = window.Culqi.token.id;

      // 🔑 Emitimos token (no lógica aquí)
      onPaymentToken?.(token);
    } else {
      console.warn("⚠️ Culqi error:", window.Culqi.error);
      onClose?.();
    }
  };

  // --------------------------------------------------
  // Overlay visual mínimo (UX)
  // --------------------------------------------------
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm" />
  );
}
