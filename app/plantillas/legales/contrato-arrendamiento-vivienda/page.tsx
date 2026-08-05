import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TemplateProductExperience } from "@/components/template-product-experience";
import { rentalHousingProductPackage } from "@/data/product-packages";
import { rentalHousingContract } from "@/data/template-catalog";
import { createPageMetadata } from "@/lib/metadata";
import { buildTemplateMarketplaceProduct } from "@/lib/template-marketplace";

export const metadata: Metadata = createPageMetadata(rentalHousingContract.commercialTitle, rentalHousingContract.shortDescription, `/plantillas/legales/${rentalHousingContract.slug}/`);

export default function RentalHousingContractPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <TemplateProductExperience product={buildTemplateMarketplaceProduct(rentalHousingContract, rentalHousingProductPackage)} />;
}
