"use client";

import { useState } from "react";
import styles from "./commercial-blocks.module.css";

const principles = [
  {
    step: "01",
    title: "Análisis individual",
    kicker: "Cada encargo empieza por comprender el caso",
    description:
      "No aplicamos plantillas ciegas. Cada encargo exige evaluación de antecedentes, jurisdicción y finalidad material.",
  },
  {
    step: "02",
    title: "Claridad en el alcance",
    kicker: "Definimos antes de intervenir",
    description:
      "Establecemos límites y condiciones precisas antes de comprometer cualquier intervención profesional o resultado.",
  },
  {
    step: "03",
    title: "Trazabilidad y tecnología",
    kicker: "Tecnología al servicio del criterio profesional",
    description:
      "Usamos tecnología como soporte de registro, versión y control documental, sin reemplazar el criterio humano.",
  },
];

const process = [
  {
    step: "01",
    title: "Cuéntanos tu necesidad",
    short: "Primer contacto",
    desc: "Escribe por WhatsApp o llena el formulario para explicarnos brevemente qué necesitas.",
  },
  {
    step: "02",
    title: "Revisamos el alcance",
    short: "Evaluación",
    desc: "Analizamos si la situación puede atenderse directamente o si requiere una evaluación profesional previa.",
  },
  {
    step: "03",
    title: "Propuesta de servicio",
    short: "Definición",
    desc: "Te comunicamos viabilidad, alcance, condiciones y, cuando corresponda, los honorarios aplicables.",
  },
  {
    step: "04",
    title: "Coordinamos el inicio",
    short: "Inicio",
    desc: "Si estás de acuerdo con la propuesta, coordinamos la documentación, responsables y fecha de inicio.",
  },
  {
    step: "05",
    title: "Realizamos seguimiento",
    short: "Seguimiento",
    desc: "Mantenemos trazabilidad de las actuaciones comprendidas dentro del alcance profesional contratado.",
  },
];

const faqs = [
  {
    question: "¿La evaluación inicial tiene un costo?",
    answer:
      "El primer contacto permite conocer la necesidad y definir el siguiente paso. Si se requiere una revisión técnica, documental o jurídica remunerada, su alcance y costo se informarán previamente.",
  },
  {
    question: "¿La solicitud implica contratación?",
    answer:
      "No. Llenar el formulario de consulta o escribir por WhatsApp es solo el inicio del contacto. La contratación ocurre únicamente tras aceptar nuestra propuesta formal.",
  },
  {
    question: "¿Atienden de manera virtual?",
    answer:
      "Sí, coordinamos evaluaciones mediante videoconferencia programada y seguimiento digital, dependiendo de la naturaleza del caso.",
  },
];

export function CommercialBlocks() {
  const [activeProcess, setActiveProcess] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const currentProcess = process[activeProcess] ?? process[0]!;

  return (
    <>
      <section
        className={styles.differenceSection}
        aria-labelledby="difference-title"
      >
        <div className={`container ${styles.sectionContainer}`}>
          <header className={styles.sectionHeader}>
            <p className={styles.eyebrow}>NUESTRO ENFOQUE</p>
            <h2 id="difference-title">Cómo trabajamos</h2>
            <p className={styles.sectionLead}>
              Cada intervención combina análisis profesional, claridad en el
              alcance y trazabilidad durante su desarrollo.
            </p>
          </header>

          <div className={styles.differenceGrid}>
            {principles.map((principle, index) => (
              <article
                key={principle.step}
                className={`${styles.principleCard} ${
                  index === 0 ? styles.principleCardPrimary : ""
                }`}
              >
                <div className={styles.principleTop}>
                  <span className={styles.principleNumber}>
                    {principle.step}
                  </span>
                  <span className={styles.principleLine} aria-hidden="true" />
                </div>

                <p className={styles.principleKicker}>{principle.kicker}</p>

                <h3>{principle.title}</h3>

                <p className={styles.principleDescription}>
                  {principle.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className={styles.processSection}
        aria-labelledby="process-title"
      >
        <div className={`container ${styles.sectionContainer}`}>
          <header className={styles.sectionHeader}>
            <p className={styles.eyebrow}>DE LA CONSULTA AL ENCARGO</p>
            <h2 id="process-title">Proceso de atención</h2>
            <p className={styles.sectionLead}>
              Conozca el recorrido general antes de iniciar una intervención
              profesional.
            </p>
          </header>

          <div className={styles.processExperience}>
            <nav
              className={styles.processNav}
              aria-label="Etapas del proceso de atención"
            >
              {process.map((item, index) => {
                const active = index === activeProcess;

                return (
                  <button
                    key={item.step}
                    type="button"
                    className={`${styles.processTab} ${
                      active ? styles.processTabActive : ""
                    }`}
                    onClick={() => setActiveProcess(index)}
                    aria-pressed={active}
                    aria-controls="process-detail"
                  >
                    <span className={styles.processTabNumber}>
                      {item.step}
                    </span>

                    <span className={styles.processTabText}>
                      <strong>{item.short}</strong>
                      <small>{item.title}</small>
                    </span>
                  </button>
                );
              })}
            </nav>

            <div
              id="process-detail"
              className={styles.processDetail}
              aria-live="polite"
            >
              <div className={styles.processDetailNumber} aria-hidden="true">
                {currentProcess.step}
              </div>

              <div className={styles.processDetailContent}>
                <p className={styles.processDetailEyebrow}>
                  ETAPA {currentProcess.step}
                </p>

                <h3>{currentProcess.title}</h3>

                <p>{currentProcess.desc}</p>
              </div>

              <div className={styles.processProgress} aria-hidden="true">
                <span>
                  {String(activeProcess + 1).padStart(2, "0")} /{" "}
                  {String(process.length).padStart(2, "0")}
                </span>

                <div className={styles.processProgressTrack}>
                  <div
                    className={styles.processProgressFill}
                    style={{
                      width: `${
                        ((activeProcess + 1) / process.length) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <p className={styles.disclaimer}>
            El uso del formulario o canal de contacto no genera
            automáticamente una relación contractual.
          </p>
        </div>
      </section>

      <section className={styles.faqSection} aria-labelledby="faq-title">
        <div className={`container ${styles.faqContainer}`}>
          <div className={styles.faqIntro}>
            <p className={styles.eyebrow}>ANTES DE CONTACTARNOS</p>
            <h2 id="faq-title">Preguntas frecuentes comerciales</h2>

            <p>
              Algunas respuestas breves antes de solicitar una evaluación.
            </p>
          </div>

          <div className={styles.faqList}>
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              const panelId = `commercial-faq-panel-${index}`;

              return (
                <article
                  key={faq.question}
                  className={`${styles.faqItem} ${
                    isOpen ? styles.faqItemOpen : ""
                  }`}
                >
                  <button
                    type="button"
                    className={styles.faqQuestion}
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                  >
                    <span className={styles.faqNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span>{faq.question}</span>

                    <span className={styles.faqIcon} aria-hidden="true">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  <div
                    id={panelId}
                    className={styles.faqAnswer}
                    data-open={isOpen ? "true" : "false"}
                  >
                    <div className={styles.faqAnswerInner}>
                      <p>{faq.answer}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}