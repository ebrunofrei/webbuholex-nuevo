import React from "react";

export default function AvisoCookies() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Aviso sobre Uso de Cookies</h1>
      <p className="mb-4">Última actualización: agosto 2025</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">¿Qué son las cookies?</h2>
      <p className="mb-4">
        Son pequeños archivos almacenados en el navegador del usuario. Permiten identificar
        hábitos de navegación y preferencias sin acceder a información sensible.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Tipos de cookies utilizadas</h2>
      <ul className="list-disc pl-6">
        <li>Esenciales: necesarias para el funcionamiento de la web</li>
        <li>Analíticas: para conocer el uso de la plataforma (ej. Firebase)</li>
        <li>Funcionales: recordar preferencias del usuario</li>
        <li>Terceros: contenido incrustado como YouTube o Google Docs</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">Consentimiento</h2>
      <p className="mb-4">
        Al continuar navegando, el usuario acepta el uso de cookies. Puede desactivarlas desde
        la configuración de su navegador.
      </p>
    </div>
  );
}