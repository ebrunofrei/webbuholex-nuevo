export default function TerminosCondicionesContent() {
  return (
    <div className="space-y-10 leading-relaxed text-gray-700">

      <Section number="1" title="Definición del Servicio">
        BúhoLex es una plataforma jurídica digital que ofrece herramientas de consulta,
        análisis automatizado, acceso a jurisprudencia, gestión de casos y servicios digitales
        para profesionales del derecho.
      </Section>

      <Section number="2" title="Naturaleza del Servicio">
        BúhoLex no constituye un estudio jurídico ni reemplaza el criterio profesional del abogado.
        Las respuestas generadas por LitisBot son referenciales y deben ser validadas por el usuario.
      </Section>

      <Section number="3" title="Registro y Cuenta">
        El usuario declara que la información proporcionada es veraz y actualizada.
        Es responsable de mantener la confidencialidad de su cuenta.
      </Section>

      <Section number="4" title="Planes y Pagos">
        Algunos servicios son de pago mediante suscripción o compra individual.
        Los pagos se procesan a través de pasarelas autorizadas.
      </Section>

      <Section number="5" title="Política de Reembolsos">
        No se realizan devoluciones una vez activado el servicio,
        salvo error comprobable o cobro duplicado.
      </Section>

      <Section number="6" title="Propiedad Intelectual">
        Todo el contenido y funcionalidades son propiedad de BúhoLex.
      </Section>

      <Section number="7" title="Uso Prohibido">
        Está prohibido el uso ilícito, manipulación o ingeniería inversa del sistema.
      </Section>

    </div>
  );
}

function Section({ number, title, children }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#0f2b46] mb-3">
        <span className="text-[#b03a1a] mr-2">{number}.</span>
        {title}
      </h2>
      <p>{children}</p>
    </div>
  );
}