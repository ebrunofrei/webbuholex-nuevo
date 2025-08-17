import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

// Carga tu publishable key (.env, nunca la secreta)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function PagoStripeButton({ usuarioId }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const iniciarPago = async () => {
    setLoading(true);
    setError(null);
    try {
      // Llama a tu backend para crear sesión Stripe
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId }),
      });
      const data = await res.json();
      const stripe = await stripePromise;
      // Redirige a Stripe Checkout
      await stripe.redirectToCheckout({ sessionId: data.id });
    } catch (err) {
      setError("No se pudo iniciar el pago. Intenta de nuevo.");
    }
    setLoading(false);
  };

  return (
    <div>
      <button
        className="bg-[#b03a1a] text-white px-6 py-2 rounded font-bold shadow hover:bg-[#942813] transition"
        onClick={iniciarPago}
        disabled={loading}
      >
        {loading ? "Redirigiendo..." : "Hazte PRO con Stripe"}
      </button>
      {error && <div className="mt-2 text-red-700 text-xs">{error}</div>}
    </div>
  );
}
