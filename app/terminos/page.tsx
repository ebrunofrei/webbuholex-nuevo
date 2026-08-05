import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createPageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata("Términos y condiciones", "Recurso legal fuera de publicación hasta su aprobación.", "/terminos/");

export default function TermsPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <><PageHero eyebrow="REVISIÓN LEGAL LOCAL" title="Términos y condiciones" description="Este recurso permanece fuera de publicación hasta contar con aprobación jurídica y comercial." status="Solo visible en desarrollo" /><section className="content-section"><article className="container legal-copy"><h2>Canal corporativo</h2><p>Las consultas institucionales pueden dirigirse a <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>.</p><p>No se presentan condiciones contractuales ni comerciales no aprobadas.</p></article></section></>;
}
