export default function AvisoCookiesContent() {
  return (
    <div className="space-y-6 leading-relaxed text-gray-700">

      <p className="text-sm text-gray-500">
        Última actualización: agosto 2025
      </p>

      <Section title="¿Qué son las cookies?">
        Son pequeños archivos que se almacenan en el navegador del usuario al
        visitar un sitio web. Permiten reconocer hábitos de navegación y
        preferencias sin acceder a información sensible del dispositivo.
      </Section>

      <Section title="Tipos de cookies utilizadas">
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Esenciales:</strong> necesarias para el funcionamiento
            correcto de la plataforma.
          </li>
          <li>
            <strong>Analíticas:</strong> permiten conocer el uso de la
            plataforma y mejorar la experiencia (por ejemplo, servicios de Google o Firebase).
          </li>
          <li>
            <strong>Funcionales:</strong> recuerdan preferencias del usuario.
          </li>
          <li>
            <strong>De terceros:</strong> pueden generarse mediante contenido
            incrustado como YouTube o Google Docs.
          </li>
        </ul>
      </Section>

      <Section title="Consentimiento y configuración">
        El usuario puede aceptar o rechazar el uso de cookies mediante el
        banner de consentimiento. Asimismo, puede desactivarlas en cualquier
        momento desde la configuración de su navegador.
      </Section>

      <Section title="Modificaciones">
        BúhoLex podrá actualizar este aviso cuando sea necesario para
        adecuarlo a cambios normativos o técnicos.
      </Section>

    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-[#0f2b46]">
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}