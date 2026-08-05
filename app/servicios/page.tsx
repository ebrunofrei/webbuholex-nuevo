import type { Metadata } from "next";
import Link from "next/link";
import { ServiceCatalog } from "@/components/services/service-catalog";
import { CommercialBlocks } from "@/components/services/commercial-blocks";
import { publicServices } from "@/data/services";
import { createPageMetadata } from "@/lib/metadata";
import { buildWhatsAppUrl } from "@/lib/contact-links";
import { siteConfig } from "@/lib/site-config";
import styles from "./servicios-page.module.css";

export const metadata: Metadata = createPageMetadata("Servicios jurídicos", "Orientación, revisión documental y atención profesional según la complejidad del caso.", "/servicios/");
export default function ServicesPage() {
  return (
    <>
      <ServiceCatalog services={publicServices} />
      <CommercialBlocks />
      <section className={styles.ctaSection} aria-labelledby="cta-title">
        <div className="container" style={{ textAlign: "center", padding: "4rem 0" }}>
          <h2 id="cta-title" style={{ fontSize: "2rem", marginBottom: "1rem" }}>¿Listo para coordinar su evaluación?</h2>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "2rem" }}>Contáctenos para revisar su caso y enviarle una propuesta formal.</p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            <Link className="button" href="/consulta-profesional/">Ir al formulario de evaluación</Link>
            <a className="button button-secondary" href={buildWhatsAppUrl()}>{siteConfig.contact.whatsapp.display}</a>
          </div>
        </div>
      </section>
    </>
  );
}
