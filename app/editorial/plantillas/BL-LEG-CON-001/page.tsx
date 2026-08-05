import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { TemplateEditorialPreview } from "@/components/template-editorial-preview";
import { rentalHousingProductPackage } from "@/data/product-packages";
import { rentalHousingContract } from "@/data/template-catalog";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("Panel editorial BL-LEG-CON-001", "Control editorial privado del producto.", "/editorial/plantillas/BL-LEG-CON-001/");

export default function RentalHousingEditorialPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <><PageHero eyebrow="Panel editorial privado" title="Control de BL-LEG-CON-001" description="Integridad, inventario y bloqueos de publicación separados de la experiencia del catálogo." status="Acceso local de desarrollo" /><section className="editorial-route"><div className="container"><TemplateEditorialPreview product={rentalHousingContract} productPackage={rentalHousingProductPackage} /></div></section></>;
}
