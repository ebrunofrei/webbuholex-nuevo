export default function LibroReclamacionesContent() {
  return (
    <div className="space-y-6 leading-relaxed text-gray-700">

      <p className="text-sm text-gray-500">
        Libro de Reclamaciones Virtual – Conforme a la Ley N° 29571
      </p>

      <p>
        En cumplimiento del Código de Protección y Defensa del Consumidor,
        BúhoLex pone a disposición de sus usuarios el presente Libro de
        Reclamaciones Virtual para el registro de reclamos y quejas.
      </p>

      <Section title="Datos del proveedor">
        <div className="bg-[#f6f7f9] border border-gray-200 rounded-lg p-4 space-y-1">
          <p><strong>Razón social:</strong> Eduardo Frei Bruno Gómez</p>
          <p><strong>RUC:</strong> 20571585902</p>
          <p><strong>Domicilio:</strong> Jr. Gálvez 844 – Barranca, Perú</p>
          <p><strong>Correo:</strong> eduardo@buholex.com</p>
        </div>
      </Section>

      <Section title="Cómo registrar un reclamo o queja">
        <>
          <p>
            Para registrar un reclamo o queja, el usuario deberá enviar un
            correo electrónico a <strong>contacto@buholex.com</strong> con la
            siguiente información:
          </p>

          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Nombre completo</li>
            <li>DNI o documento de identidad</li>
            <li>Detalle del reclamo o queja</li>
            <li>Fecha del incidente</li>
          </ul>
        </>
      </Section>

      <Section title="Plazo de respuesta">
        El proveedor dará respuesta en un plazo máximo de 15 días hábiles,
        conforme a la normativa vigente.
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