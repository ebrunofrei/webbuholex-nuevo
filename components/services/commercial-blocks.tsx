import styles from "./commercial-blocks.module.css";

const process = [
  { step: "01", title: "Cuéntanos tu necesidad", desc: "Escribe por WhatsApp o llena el formulario." },
  { step: "02", title: "Revisamos el alcance", desc: "Analizamos si tu caso requiere evaluación." },
  { step: "03", title: "Propuesta de servicio", desc: "Te comunicamos viabilidad, costo y condiciones." },
  { step: "04", title: "Coordinamos el inicio", desc: "Si estás de acuerdo, programamos la atención." },
  { step: "05", title: "Realizamos seguimiento", desc: "Mantenemos trazabilidad de las acciones." },
];

export function CommercialBlocks() {
  return (
    <>
      <section className={styles.differenceSection} aria-labelledby="difference-title">
        <div className="container">
          <h2 id="difference-title">Cómo trabajamos</h2>
          <div className={styles.differenceGrid}>
            <article>
              <h3>Análisis individual</h3>
              <p>No aplicamos plantillas ciegas. Cada encargo exige evaluación de antecedentes, jurisdicción y finalidad material.</p>
            </article>
            <article>
              <h3>Claridad en el alcance</h3>
              <p>Definimos límites y condiciones precisas antes de comprometer cualquier intervención profesional o resultado.</p>
            </article>
            <article>
              <h3>Trazabilidad y tecnología</h3>
              <p>Usamos tecnología como soporte de registro, versión y control documental, sin reemplazar el criterio humano.</p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.processSection} aria-labelledby="process-title">
        <div className="container">
          <h2 id="process-title">Proceso de atención</h2>
          <ol className={styles.processList}>
            {process.map(p => (
              <li key={p.step}>
                <span>{p.step}</span>
                <strong>{p.title}</strong>
                <p>{p.desc}</p>
              </li>
            ))}
          </ol>
          <p className={styles.disclaimer}>El uso del formulario o canal de contacto no genera automáticamente una relación contractual.</p>
        </div>
      </section>

      <section className={styles.faqSection} aria-labelledby="faq-title">
        <div className="container">
          <h2 id="faq-title">Preguntas frecuentes comerciales</h2>
          <dl className={styles.faqList}>
            <div>
              <dt>¿La evaluación inicial tiene un costo?</dt>
              <dd>El primer contacto permite conocer la necesidad y definir el siguiente paso. Si se requiere una revisión técnica, documental o jurídica remunerada, su alcance y costo se informarán previamente.</dd>
            </div>
            <div>
              <dt>¿La solicitud implica contratación?</dt>
              <dd>No. Llenar el formulario de consulta o escribir por WhatsApp es solo el inicio del contacto. La contratación ocurre únicamente tras aceptar nuestra propuesta formal.</dd>
            </div>
            <div>
              <dt>¿Atienden de manera virtual?</dt>
              <dd>Sí, coordinamos evaluaciones mediante videoconferencia programada y seguimiento digital, dependiendo de la naturaleza del caso.</dd>
            </div>
            <div>
              <dt>¿LitisBot ya está disponible?</dt>
              <dd>No, actualmente LitisBot es un desarrollo interno en preparación y no procesa documentos externos.</dd>
            </div>
          </dl>
        </div>
      </section>
    </>
  );
}
