import type { Metadata } from "next";
import { CatalogHero } from "@/components/catalog-hero";
import { TemplateCatalog } from "@/components/template-catalog";
import { createPageMetadata } from "@/lib/metadata";
export const metadata: Metadata = createPageMetadata("Plantillas empresariales", "Documentos empresariales con alcance y control editorial.", "/plantillas/empresariales/");
export default function BusinessTemplatesPage() { return <><CatalogHero eyebrow="Plantillas empresariales" title="Documentos para organizar decisiones empresariales" description="Consulta el catálogo real por materia, jurisdicción y disponibilidad." /><section className="catalog-page-section"><div className="container"><TemplateCatalog category="empresarial" /></div></section></>; }
