export default function PoliticaPrivacidadContent() {
  return (
    <div className="space-y-6 leading-relaxed text-gray-700">

      <p className="text-sm text-gray-500">
        Última actualización: marzo 2026
      </p>

      <p>
        BúhoLex, plataforma digital dirigida por Eduardo Frei Bruno Gómez,
        con domicilio en Jr. Gálvez 844 – Barranca, Perú, es responsable del
        tratamiento de datos personales conforme a la Ley N.º 29733 – Ley de
        Protección de Datos Personales y su Reglamento.
      </p>

      <Section title="1. Datos recopilados">
        <ul className="list-disc pl-6 space-y-1">
          <li>Nombre completo</li>
          <li>Correo electrónico</li>
          <li>Datos de facturación</li>
          <li>Información de suscripción</li>
          <li>Actividad de navegación</li>
          <li>Historial de consultas realizadas en la plataforma</li>
        </ul>
      </Section>

      <Section title="2. Finalidad del tratamiento">
        Los datos personales se utilizan para prestar los servicios contratados,
        gestionar pagos, personalizar la experiencia del usuario, enviar
        comunicaciones informativas y mejorar el funcionamiento del sistema.
      </Section>

      <Section title="3. Base legal">
        El tratamiento se realiza con base en el consentimiento del usuario,
        la ejecución de un contrato digital y el cumplimiento de obligaciones
        legales aplicables.
      </Section>

      <Section title="4. Pasarelas de pago">
        Los pagos se procesan mediante pasarelas certificadas.
        BúhoLex no almacena datos completos de tarjetas de crédito o débito.
        El tratamiento de dichos datos se rige por las políticas de la pasarela utilizada.
      </Section>

      <Section title="5. Transferencias internacionales">
        Algunos datos pueden almacenarse en servidores ubicados fuera del Perú
        (por ejemplo, Firebase – Google LLC), bajo estándares de seguridad adecuados.
      </Section>

      <Section title="6. Tiempo de conservación">
        Los datos se conservarán mientras exista relación contractual o
        mientras sean necesarios para cumplir obligaciones legales.
      </Section>

      <Section title="7. Seguridad">
        BúhoLex implementa medidas técnicas y organizativas para proteger
        la información frente a accesos no autorizados, pérdida o alteración.
      </Section>

      <Section title="8. Derechos del titular">
        El usuario puede ejercer sus derechos de acceso, rectificación,
        cancelación y oposición (ARCO) enviando una solicitud al correo:
        contacto@buholex.com
      </Section>

      <Section title="9. Cookies">
        El sitio puede utilizar cookies técnicas y analíticas para mejorar
        la experiencia del usuario. El uso continuado del sitio implica
        aceptación de dichas tecnologías.
      </Section>

      <Section title="10. Modificaciones">
        BúhoLex podrá actualizar esta política en cualquier momento.
        Las modificaciones serán publicadas en el Centro Legal.
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