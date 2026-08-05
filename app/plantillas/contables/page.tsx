import type { Metadata } from "next";
import { CatalogHero } from "@/components/catalog-hero";
import { TemplateCatalog } from "@/components/template-catalog";
import { createPageMetadata } from "@/lib/metadata";
export const metadata: Metadata = createPageMetadata("Plantillas contables", "Formatos contables con alcance y control editorial.", "/plantillas/contables/");
export default function AccountingTemplatesPage() { return <><CatalogHero eyebrow="Plantillas contables" title="Formatos con alcance administrativo definido" description="Consulta el catálogo real por materia, jurisdicción y disponibilidad." /><section className="catalog-page-section"><div className="container"><TemplateCatalog category="contable" /></div></section></>; }
