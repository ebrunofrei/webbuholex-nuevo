export default function PoliticaDevolucionesContent() {
  return (
    <div className="space-y-6 leading-relaxed text-gray-700">

      <p className="text-sm text-gray-500">
        Última actualización: marzo 2026
      </p>

      <p>
        BúhoLex ofrece servicios digitales de acceso inmediato tales como
        membresías, herramientas jurídicas automatizadas y acceso a contenido
        especializado.
      </p>

      <Section title="1. Naturaleza digital del servicio">
        Al tratarse de servicios digitales intangibles, el acceso se activa de
        manera inmediata tras la confirmación del pago.
      </Section>

      <Section title="2. No procede devolución">
        <>
          <p>
            No se realizan devoluciones una vez activado el servicio, salvo en
            los siguientes casos:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Cobro duplicado comprobado.</li>
            <li>Error técnico atribuible a la plataforma que impida el acceso.</li>
            <li>Falla en el procesamiento del pago.</li>
          </ul>
        </>
      </Section>

      <Section title="3. Procedimiento">
        Para solicitar revisión de un cobro, el usuario deberá escribir a
        contacto@buholex.com indicando número de operación y detalle del caso.
        Las solicitudes serán evaluadas en un plazo máximo de 7 días hábiles.
      </Section>

      <Section title="4. Cancelación de suscripción">
        El usuario puede cancelar su suscripción en cualquier momento.
        La cancelación evita renovaciones futuras, pero no genera reembolso
        del periodo ya pagado.
      </Section>

      <Section title="5. Disposiciones finales">
        Esta política se rige por la legislación peruana aplicable al comercio
        electrónico y servicios digitales.
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