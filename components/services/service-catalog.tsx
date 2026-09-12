import { SectionIntro } from "@/components/public/public-patterns";
import { buildWhatsAppUrl } from "@/lib/contact-links";
import { siteConfig } from "@/lib/site-config";
import type { PublicService } from "@/types/services";

import { ServicesExperience } from "./services-experience";
import styles from "./services.module.css";

export function ServiceCatalog({
  services,
}: {
  services: readonly PublicService[];
}) {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>SERVICIOS BÚHOLEX</p>

          <h1>
            Soluciones profesionales
            <br />
            para necesidades concretas
          </h1>

          <span className={styles.heroDescription}>
            Explore los servicios jurídicos, empresariales, administrativos,
            técnicos y digitales de BúhoLex, respaldados por EMCCON.
            Cada intervención se define según su alcance, complejidad y
            condiciones particulares.
          </span>
        </div>
      </section>

      <section
        className={styles.catalog}
        aria-labelledby="services-title"
      >
        <div className={styles.container}>
          <div className={styles.catalogHeading}>
            <SectionIntro
              id="services-title"
              eyebrow="CATÁLOGO DE SERVICIOS"
              title="Explore nuestros servicios"
              description="Seleccione un servicio para conocer su alcance, modalidad, condiciones de evaluación y forma de atención."
            />

            <span className={styles.serviceCount}>
              {services.length} servicios en el catálogo
            </span>
          </div>

          <ServicesExperience services={services} />

          <aside className={styles.catalogContact}>
            <div>
              <strong>¿Aún no identifica el servicio adecuado?</strong>
              <p>
                Podemos orientarlo antes de definir el tipo de intervención
                profesional que corresponde.
              </p>
            </div>

            <a href={buildWhatsAppUrl()}>
              {siteConfig.contact.whatsapp.display}
            </a>
          </aside>
        </div>
      </section>
    </div>
  );
}