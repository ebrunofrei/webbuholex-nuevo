import Image from "next/image";
import Link from "next/link";

import {
  ActionLink,
  InstitutionalNotice,
  StatusBadge,
} from "@/components/public/public-patterns";
import { buildServiceWhatsAppUrl } from "@/lib/contact-links";
import type { PublicService } from "@/types/services";

import styles from "./services.module.css";

function serviceTone(
  service: PublicService,
): "success" | "warning" | "muted" {
  if (service.availability === "available") return "success";
  if (service.availability === "evaluation_required") return "warning";
  return "muted";
}

export function ServiceDetail({
  service,
}: {
  service: PublicService;
}) {
  const hasExtendedDetail = Boolean(service.scopeGroups?.length);

  return (
    <div className={styles.page}>
      <section className={styles.detailHero}>
        <div className={styles.detailHeroContainer}>
          <Link
            href="/servicios/"
            className={styles.detailBackLink}
          >
            <span aria-hidden="true">←</span>
            <span>Todos los servicios</span>
          </Link>

          <div className={styles.detailHeroCard}>
            <div className={styles.detailImageFrame}>
              <Image
                src={service.detailImage.src}
                alt={service.detailImage.alt}
                width={1200}
                height={900}
                priority
                className={styles.detailImage}
                sizes="(max-width: 767px) 100vw, (max-width: 1100px) 48vw, 560px"
              />
            </div>

            <div className={styles.detailHeroContent}>
              <div className={styles.detailHeroMeta}>
                <span className={styles.detailHeroEyebrow}>
                  SERVICIO BÚHOLEX
                </span>

                <StatusBadge tone={serviceTone(service)}>
                  {service.availabilityLabel}
                </StatusBadge>
              </div>

              <h1>{service.title}</h1>

              {service.publicTagline ? (
                <p className={styles.detailTagline}>
                  {service.publicTagline}
                </p>
              ) : null}

              <p className={styles.detailSummary}>
                {service.summary}
              </p>

              <p className={styles.detailDescription}>
                {service.description}
              </p>

              <div className={styles.detailHeroActions}>
                <ActionLink
                  href={`/consulta-profesional?service=${service.slug}`}
                >
                  {service.ctaLabel}
                </ActionLink>

                <a
                  className={styles.detailWhatsAppLink}
                  href={buildServiceWhatsAppUrl(service.title)}
                >
                  Consultar por WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div
        className={`${styles.container} ${styles.detailLayout}`}
      >
        <main className={styles.detailMain}>
          {service.targetAudience ? (
            <section>
              <h2>¿A quién está dirigido?</h2>

              <ul>
                {service.targetAudience.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {service.siteTypes ? (
            <section>
              <h2>Tipos de sitio web</h2>

              <p>
                Estas posibilidades orientan la evaluación; no
                constituyen un paquete incluido automáticamente.
              </p>

              <ul>
                {service.siteTypes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {service.needs ? (
            <section>
              <h2>Necesidades que puede resolver</h2>

              <ul>
                {service.needs.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {service.scopeGroups ? (
            <section>
              <h2>Alcance posible</h2>

              <p className={styles.scopeNotice}>
                Los módulos se seleccionan y delimitan durante la
                evaluación. No forman un paquete automático.
              </p>

              <div className={styles.scopeGroups}>
                {service.scopeGroups.map((group) => (
                  <article key={group.title}>
                    <h3>{group.title}</h3>

                    <ul>
                      {group.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section>
              <h2>Alcance inicial</h2>

              <ul>
                {service.scope.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {service.moduleGroups ? (
            <section>
              <h2>Módulos posibles</h2>

              <p className={styles.scopeNotice}>
                La categoría indica cómo debe evaluarse cada módulo.
                Su presencia en esta ficha no implica inclusión
                automática.
              </p>

              <div className={styles.moduleGroups}>
                {service.moduleGroups.map((group) => (
                  <article
                    data-level={group.level}
                    key={group.title}
                  >
                    <span>{group.levelLabel}</span>
                    <h3>{group.title}</h3>

                    <ul>
                      {group.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {service.budgetFactors ? (
            <section>
              <h2>
                Factores que definen el alcance y presupuesto
              </h2>

              <p>
                La propuesta técnica y económica se prepara después
                de revisar estas variables.
              </p>

              <ul>
                {service.budgetFactors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {service.technicalResponsibilities ? (
            <section>
              <h2>Componentes técnicos diferenciables</h2>

              <div className={styles.technicalResponsibilities}>
                {service.technicalResponsibilities.map((item) => (
                  <article key={item.title}>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {service.evaluationInputs ? (
            <section>
              <h2>Información necesaria para evaluar tu consulta</h2>

              <p>
                Para realizar una evaluación responsable necesitamos conocer los hechos,
                antecedentes y documentos relevantes vinculados con la consulta.
              </p>

              <ul>
                {service.evaluationInputs.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              {service.clientContentNotice ? (
                <div className={styles.warning}>
                  <InstitutionalNotice title="Responsabilidad sobre contenidos">
                    {service.clientContentNotice}
                  </InstitutionalNotice>
                </div>
              ) : null}
            </section>
          ) : null}

          {service.potentialDeliverables ? (
            <section>
              <h2>Entregables potenciales</h2>

              <p>
                Los entregables definitivos dependerán exclusivamente
                del alcance contratado.
              </p>

              <ul>
                {service.potentialDeliverables.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2>
              {hasExtendedDetail ? "Exclusiones" : "Límites"}
            </h2>

            <ul>
              {service.exclusions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            {service.warning ? (
              <div className={styles.warning}>
                <InstitutionalNotice
                  title={
                    hasExtendedDetail
                      ? "Condición de alcance"
                      : "Advertencia de viabilidad"
                  }
                >
                  {service.warning}
                </InstitutionalNotice>
              </div>
            ) : null}
          </section>

          {service.stages ? (
            <section>
              <h2>Etapas de trabajo</h2>

              <ol className={styles.stages}>
                {service.stages.map((stage, index) => (
                  <li key={stage}>
                    <span>
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <strong>{stage}</strong>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {service.prerequisites ? (
            <section>
              <h2>Condiciones previas</h2>

              <ul>
                {service.prerequisites.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {service.subOffers ? (
            <section>
              <h2>Líneas de servicio</h2>

              <p className={styles.scopeNotice}>
                Cada actuación se evalúa de manera individual. Antes de proponer
                una redacción se revisa si el documento solicitado es adecuado
                para el objetivo del cliente, el estado del asunto y los plazos
                disponibles.
              </p>

              <div className={styles.subOffers}>
                {service.subOffers.map((offer) => (
                  <article key={offer.title}>
                    <h3>{offer.title}</h3>

                    {offer.description ? (
                      <p className={styles.subOfferDescription}>
                        {offer.description}
                      </p>
                    ) : null}

                    {offer.usefulWhen?.length ? (
                      <div className={styles.subOfferSection}>
                        <strong>Puede ser útil cuando</strong>
                        <ul>
                          {offer.usefulWhen.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {offer.reviewBeforeAssuming?.length ? (
                      <div className={styles.subOfferSection}>
                        <strong>Qué revisamos antes de asumirlo</strong>
                        <ul>
                          {offer.reviewBeforeAssuming.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {offer.workMayInclude?.length ? (
                      <div className={styles.subOfferSection}>
                        <strong>El trabajo puede comprender</strong>
                        <ul>
                          {offer.workMayInclude.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {offer.notice ? (
                      <p className={styles.subOfferNotice}>
                        {offer.notice}
                      </p>
                    ) : null}
                    <dl>
                      <div>
                        <dt>Evaluación</dt>
                        <dd>
                          {offer.requiresEvaluation
                            ? offer.professionalLevel === "senior"
                              ? "Revisión estratégica senior"
                              : "Evaluación profesional previa"
                            : "Disponible previa coordinación"}
                        </dd>
                      </div>

                      <div>
                        <dt>Honorarios</dt>
                        <dd>
                          {offer.pricingMode === "from" ||
                          offer.pricingMode === "quote_required"
                            ? "Se determinan después de revisar el caso y el alcance"
                            : "Por definir previa evaluación"}
                        </dd>
                      </div>

                      {offer.professionalLevel ? (
                        <div>
                          <dt>Nivel profesional</dt>
                          <dd>
                            {offer.professionalLevel === "senior"
                              ? "Senior / Estratégico"
                              : offer.professionalLevel === "professional"
                                ? "Profesional"
                                : "Estándar"}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </main>

        <aside
          className={styles.detailSidebar}
          aria-label="Resumen del servicio"
        >
          <span className={styles.detailSidebarEyebrow}>
            INFORMACIÓN DEL SERVICIO
          </span>

          <h2>
            {hasExtendedDetail
              ? "Solicitud de evaluación"
              : "Antes de solicitar"}
          </h2>

          <dl>
            <div>
              <dt>Disponibilidad</dt>
              <dd>{service.availabilityLabel}</dd>
            </div>

            <div>
              <dt>Modalidad</dt>
              <dd>{service.modalities.join(" · ")}</dd>
            </div>

            <div>
              <dt>Honorarios</dt>
              <dd>
                {service.category === "buhodoc"
                  ? "Se determinan luego de evaluar la complejidad, alcance, documentación y plazo del encargo."
                  : service.pricingMode === "from"
                    ? "Se determina después de evaluar la complejidad y alcance"
                    : service.pricingMode === "quote_required"
                      ? "Se determina después de evaluar el alcance"
                      : service.pricingMode === "not_defined"
                        ? "Por definir previa evaluación"
                        : "Según evaluación"}
              </dd>
            </div>

            <div>
              <dt>Pago inmediato</dt>
              <dd>
                {service.allowsImmediatePayment
                  ? "Disponible"
                  : "No disponible"}
              </dd>
            </div>

            {service.professionalLevel ? (
              <div>
                <dt>Nivel profesional</dt>
                <dd>
                  {service.professionalLevel === "senior"
                    ? "Senior / Estratégico"
                    : service.professionalLevel === "professional"
                      ? "Profesional"
                      : "Estándar"}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className={styles.detailSidebarActions}>
            <ActionLink
              href={`/consulta-profesional?service=${service.slug}`}
            >
              {service.ctaLabel}
            </ActionLink>

            <a href={buildServiceWhatsAppUrl(service.title)}>
              Consultar por WhatsApp
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
