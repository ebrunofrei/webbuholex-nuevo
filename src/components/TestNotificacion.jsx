import React, { useState } from "react";

export default function TestNotificacion({ tokenFCM }) {
  const [loading, setLoading] = useState(false);
  const [respuesta, setRespuesta] = useState(null);

  const enviarNotificacion = async () => {
    if (!tokenFCM) {
      alert("⚠️ No hay token FCM disponible.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/notificaciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tokenDestino: tokenFCM,
          titulo: "Prueba de notificación",
          cuerpo: "🚀 Si ves esto, FCM ya está funcionando.",
        }),
      });

      const data = await res.json();
      setRespuesta(data);

      if (data.ok) {
        alert("✅ Notificación enviada correctamente");
      } else {
        alert("❌ Error al enviar: " + (data.error || "Desconocido"));
      }
    } catch (err) {
      console.error("❌ Error en el fetch:", err);
      alert("Error en el cliente: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded shadow-md mt-4">
      <h2 className="font-bold text-lg mb-2">🔔 Test de Notificación</h2>
      <button
        onClick={enviarNotificacion}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Enviando..." : "Enviar notificación de prueba"}
      </button>

      {respuesta && (
        <pre className="mt-3 text-sm bg-black text-green-300 p-2 rounded">
          {JSON.stringify(respuesta, null, 2)}
        </pre>
      )}
    </div>
  );
}
