import type { Metadata } from "next";
import { CatalogHero } from "@/components/catalog-hero";
import { TemplateCatalog } from "@/components/template-catalog";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("Plantillas legales", "Documentos legales con alcance, versiones y control editorial.", "/plantillas/legales/");

export default function LegalTemplatesPage() {
  return <><CatalogHero eyebrow="Plantillas legales" title="Estructuras jurídicas para casos concretos" description="Compara el alcance y las versiones disponibles antes de revisar la ficha completa de cada producto." /><section className="catalog-page-section"><div className="container"><TemplateCatalog category="legal" /></div></section></>;
}
