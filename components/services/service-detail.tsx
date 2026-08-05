import Link from "next/link";
import { ActionLink, InstitutionalNotice, StatusBadge } from "@/components/public/public-patterns";
import { buildServiceWhatsAppUrl } from "@/lib/contact-links";
import type { PublicService } from "@/types/services";
import styles from "./services.module.css";

function serviceTone(service: PublicService): "success" | "warning" | "muted" {
  if (service.availability === "available") return "success";
  if (service.availability === "evaluation_required") return "warning";
  return "muted";
}

export function ServiceDetail({ service }: { service: PublicService }) {
  const hasExtendedDetail = Boolean(service.scopeGroups?.length);

  return (
    <div className={styles.page}>
      <section className={styles.detailHero}>
        <div className={styles.container}>
          <Link href="/servicios/">← Todos los servicios</Link>
          <StatusBadge tone={serviceTone(service)}>{service.availabilityLabel}</StatusBadge>
          <h1>{service.title}</h1>
          {service.publicTagline ? <strong className={styles.tagline}>{service.publicTagline}</strong> : null}
          <p>{service.summary}</p>
        </div>
      </section>
      <div className={`${styles.container} ${styles.detailLayout}`}>
        <div className={styles.detailMain}>
          <section><h2>Presentación</h2><p>{service.description}</p></section>
          {service.targetAudience ? <section><h2>¿A quién está dirigido?</h2><ul>{service.targetAudience.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
          {service.siteTypes ? <section><h2>Tipos de sitio web</h2><p>Estas posibilidades orientan la evaluación; no constituyen un paquete incluido automáticamente.</p><ul>{service.siteTypes.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
          {service.needs ? <section><h2>Necesidades que puede resolver</h2><ul>{service.needs.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
          {service.scopeGroups ? <section><h2>Alcance posible</h2><p className={styles.scopeNotice}>Los módulos se seleccionan y delimitan durante la evaluación. No forman un paquete automático.</p><div className={styles.scopeGroups}>{service.scopeGroups.map((group) => <article key={group.title}><h3>{group.title}</h3><ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div></section> : <section><h2>Alcance inicial</h2><ul>{service.scope.map((item) => <li key={item}>{item}</li>)}</ul></section>}
          {service.moduleGroups ? <section><h2>Módulos posibles</h2><p className={styles.scopeNotice}>La categoría indica cómo debe evaluarse cada módulo. Su presencia en esta ficha no implica inclusión automática.</p><div className={styles.moduleGroups}>{service.moduleGroups.map((group) => <article data-level={group.level} key={group.title}><span>{group.levelLabel}</span><h3>{group.title}</h3><ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div></section> : null}
          {service.budgetFactors ? <section><h2>Factores que definen el alcance y presupuesto</h2><p>La propuesta técnica y económica se prepara después de revisar estas variables.</p><ul>{service.budgetFactors.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
          {service.technicalResponsibilities ? <section><h2>Componentes técnicos diferenciables</h2><div className={styles.technicalResponsibilities}>{service.technicalResponsibilities.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></section> : null}
          {service.evaluationInputs ? <section><h2>Información necesaria para evaluar el proyecto</h2><p>La solicitud inicial no permite adjuntar archivos y continúa como demostración local sin envío ni almacenamiento.</p><ul>{service.evaluationInputs.map((item) => <li key={item}>{item}</li>)}</ul>{service.clientContentNotice ? <div className={styles.warning}><InstitutionalNotice title="Responsabilidad sobre contenidos">{service.clientContentNotice}</InstitutionalNotice></div> : null}</section> : null}
          {service.potentialDeliverables ? <section><h2>Entregables potenciales</h2><p>Los entregables definitivos dependerán exclusivamente del alcance contratado.</p><ul>{service.potentialDeliverables.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
          <section>
            <h2>{hasExtendedDetail ? "Exclusiones" : "Límites"}</h2>
            <ul>{service.exclusions.map((item) => <li key={item}>{item}</li>)}</ul>
            {service.warning ? <div className={styles.warning}><InstitutionalNotice title={hasExtendedDetail ? "Condición de alcance" : "Advertencia de viabilidad"}>{service.warning}</InstitutionalNotice></div> : null}
          </section>
          {service.stages ? <section><h2>Etapas de trabajo</h2><ol className={styles.stages}>{service.stages.map((stage, index) => <li key={stage}><span>{String(index + 1).padStart(2, "0")}</span><strong>{stage}</strong></li>)}</ol></section> : null}
          {service.prerequisites ? <section><h2>Condiciones previas</h2><ul>{service.prerequisites.map((item) => <li key={item}>{item}</li>)}</ul></section> : null}
        </div>
        <aside className={styles.summary} aria-label="Resumen del servicio">
          <h2>{hasExtendedDetail ? "Solicitud de evaluación" : "Antes de solicitar"}</h2>
          <dl>
            <div><dt>Disponibilidad</dt><dd>{service.availabilityLabel}</dd></div>
            <div><dt>Modalidad</dt><dd>{service.modalities.join(" · ")}</dd></div>
            <div><dt>Precio y plazo</dt><dd>Se definen después de aprobar el alcance</dd></div>
            <div><dt>Pago inmediato</dt><dd>No disponible</dd></div>
            <div><dt>Responsable</dt><dd>Pendiente de asignación institucional</dd></div>
          </dl>
          <ActionLink href={`/consulta-profesional?service=${service.slug}`}>{service.ctaLabel}</ActionLink>
          <a href={buildServiceWhatsAppUrl(service.title)}>Consultar por WhatsApp</a>
        </aside>
      </div>
    </div>
  );
}
