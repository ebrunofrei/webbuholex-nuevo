import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { createPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site-config";
import { buildWhatsAppUrl } from "@/lib/contact-links";

export const metadata: Metadata = createPageMetadata("Contacto", "Canal corporativo autorizado de BúhoLex y EMCCON.", "/contacto/");

export default function ContactPage() {
  return <><PageHero eyebrow="Contacto" title="Hablemos por el canal adecuado" description="Utilice los canales corporativos para información institucional o coordinación de atención." status="Canales corporativos autorizados" /><section className="content-section"><div className="container contact-authorized"><article><p className="eyebrow">CORREO CORPORATIVO</p><h2><a className="contact-email" href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a></h2><p>Información institucional, privacidad y coordinación general.</p></article><article><p className="eyebrow">WHATSAPP BUSINESS CORPORATIVO</p><h2><a href={buildWhatsAppUrl()}>{siteConfig.contact.whatsapp.display}</a></h2><p>{siteConfig.contact.whatsapp.label}. No envíe documentos ni información sensible antes de recibir indicaciones.</p></article><p>La solicitud de atención profesional estructura su mensaje y se envía a través de estos canales. No almacenamos datos en la plataforma.</p></div></section></>;
}
