import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata("Privacidad", "Recurso legal fuera de publicación hasta su aprobación.", "/privacidad/");

export default function PrivacyPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <><PageHero eyebrow="REVISIÓN LEGAL LOCAL" title="Privacidad" description="Este recurso permanece fuera de publicación hasta contar con aprobación legal." status="Solo visible en desarrollo" /><section className="content-section"><article className="container legal-copy"><h2>Canal corporativo</h2><p>Las consultas institucionales sobre privacidad pueden dirigirse a <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>.</p><p>No se presenta una política definitiva ni se describen tratamientos que todavía no han sido aprobados.</p></article></section></>;
}
