import type { Metadata } from "next";
import { CatalogHero } from "@/components/catalog-hero";
import { TemplateCatalog } from "@/components/template-catalog";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("Plantillas jurídicas", "Explora documentos jurídicos con alcance, versión y advertencias claras.", "/plantillas/");

export default function TemplatesPage() {
  return <><CatalogHero eyebrow="Catálogo jurídico digital" title="Documentos para decidir y formalizar con claridad" description="Explora plantillas con jurisdicción, alcance, versiones y advertencias visibles antes de elegir." /><section className="catalog-page-section"><div className="container"><TemplateCatalog /></div></section></>;
}
