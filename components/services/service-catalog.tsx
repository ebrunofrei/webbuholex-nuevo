import { ActionLink, SectionIntro, StatusBadge } from "@/components/public/public-patterns";
import { buildWhatsAppUrl } from "@/lib/contact-links";
import { siteConfig } from "@/lib/site-config";
import type { PublicService } from "@/types/services";
import styles from "./services.module.css";

function serviceTone(service: PublicService): "success" | "warning" | "muted" {
  if (service.availability === "available") return "success";
  if (service.availability === "evaluation_required") return "warning";
  return "muted";
}

export function ServiceCatalog({ services }: { services: readonly PublicService[] }) {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.container}>
          <p>SERVICIOS BÚHOLEX</p>
          <h1>Intervención profesional con alcance definido</h1>
          <span>Explore servicios jurídicos, empresariales, administrativos, técnicos y digitales. Cada encargo requiere la evaluación indicada en su ficha.</span>
        </div>
      </section>
      <section className={styles.catalog} aria-labelledby="services-title">
        <div className={styles.container}>
          <div className={styles.catalogHeading}>
            <SectionIntro id="services-title" eyebrow="CATÁLOGO DE SERVICIOS" title="Elija el punto de partida adecuado" description="No se realizan cobros inmediatos. La disponibilidad y el alcance se confirman antes de aceptar cualquier encargo." />
            <span>{services.length} servicios registrados</span>
          </div>
          <div className={styles.grid}>
            {services.map((service) => (
              <article className={styles.card} key={service.id}>
                <div className={styles.cardHeader}>
                  <span>{service.id}</span>
                  <StatusBadge tone={serviceTone(service)}>{service.availabilityLabel}</StatusBadge>
                </div>
                <div><h3>{service.title}</h3><p>{service.summary}</p></div>
                <div className={styles.cardFooter}>
                  <small>{service.requiresEvaluation ? "Requiere evaluación previa" : "Coordinación institucional"}</small>
                  <ActionLink href={`/servicios/${service.slug}/`}>Ver servicio</ActionLink>
                </div>
              </article>
            ))}
          </div>
          <aside className={styles.catalogContact}>
            <p>¿Necesita identificar el servicio adecuado? Use el WhatsApp Business corporativo de EMCCON.</p>
            <a href={buildWhatsAppUrl()}>{siteConfig.contact.whatsapp.display}</a>
          </aside>
        </div>
      </section>
    </div>
  );
}
