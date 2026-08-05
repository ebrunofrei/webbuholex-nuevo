import { TemplateCatalogExplorer } from "@/components/template-catalog-explorer";
import { templateCatalog } from "@/data/template-catalog";
import { getProductPackageByCode } from "@/data/product-packages";
import { isTemplateProductPubliclyAvailable } from "@/lib/catalog-visibility";
import { buildTemplateMarketplaceProduct } from "@/lib/template-marketplace";
import type { ProductCategory } from "@/types/catalog";

export function TemplateCatalog({ category, includeEditorialPreview = process.env.NODE_ENV === "development" }: { category?: ProductCategory; includeEditorialPreview?: boolean }) {
  const products = templateCatalog.flatMap((product) => {
    const productPackage = getProductPackageByCode(product.code);
    if (!productPackage || (category && product.category !== category)) return [];
    const visible = isTemplateProductPubliclyAvailable(product, productPackage)
      || (includeEditorialPreview && product.availabilityStatus === "editorial_preview");
    return visible ? [buildTemplateMarketplaceProduct(product, productPackage)] : [];
  });
  return <TemplateCatalogExplorer products={products} initialCategory={category ?? "all"} />;
}
