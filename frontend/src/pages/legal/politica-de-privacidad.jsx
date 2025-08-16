// src/pages/legal/politica-de-privacidad.jsx
import React from "react";

export default function PoliticaPrivacidad() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Política de Privacidad</h1>
      <p className="mb-4">Última actualización: agosto 2025</p>

      <p className="mb-4">
        BúhoLex, plataforma digital dirigida por el abogado Eduardo Frei Bruno Gómez,
        con domicilio en Jr. Gálvez 844 - Barranca, Perú, garantiza la confidencialidad
        y el adecuado tratamiento de los datos personales proporcionados por sus
        usuarios, conforme a la Ley N.º 29733 – Ley de Protección de Datos Personales.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">1. Datos recopilados</h2>
      <ul className="list-disc pl-6">
        <li>Nombre completo</li>
        <li>Correo electrónico</li>
        <li>Profesión o especialidad jurídica (opcional)</li>
        <li>Actividad de navegación en la web</li>
        <li>Noticias o artículos guardados</li>
        <li>Preferencias de suscripción y uso de herramientas legales</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. Finalidad del tratamiento</h2>
      <p className="mb-4">
        Los datos serán utilizados para brindar acceso a la Oficina Virtual de Abogados,
        enviar boletines, personalizar recomendaciones de LitisBot, gestionar pagos y
        mejorar la experiencia de navegación.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. Consentimiento y almacenamiento</h2>
      <p className="mb-4">
        El uso de la web implica el consentimiento expreso del usuario. Los datos se
        almacenan de forma segura en Firebase (Google LLC), bajo cláusulas contractuales
        adecuadas.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Derechos del titular</h2>
      <p className="mb-4">
        Los usuarios pueden ejercer sus derechos de acceso, rectificación, cancelación y
        oposición escribiendo a eduardofreib@gmail.com.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Transferencias</h2>
      <p className="mb-4">
        No se comparten datos con terceros, salvo autorización expresa del usuario o
        mandato legal.
      </p>
    </div>
  );
}
