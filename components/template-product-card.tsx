import Link from "next/link";
import type { TemplateMarketplaceProduct } from "@/types/template-marketplace";

export function TemplateProductCard({ product }: { product: TemplateMarketplaceProduct }) {
  return (
    <article className="catalog-product-card" data-product={product.id}>
      <div className="catalog-card-topline">
        <span>{product.availabilityLabel}</span>
        <small>{product.code}</small>
      </div>
      <div className="catalog-card-tags"><span>{product.matter}</span><span>{product.jurisdiction}</span><span>v{product.version}</span></div>
      <h2>{product.commercialTitle}</h2>
      <p>{product.shortDescription}</p>
      <dl>
        <div><dt>Tipo</dt><dd>{product.documentType}</dd></div>
        <div><dt>Contenido</dt><dd>{product.packageCounts.contracts} contratos · {product.packageCounts.annexes} anexos</dd></div>
        <div><dt>Revisión</dt><dd>{product.reviewedAt}</dd></div>
      </dl>
      <Link className="catalog-card-link" href={product.href}>
        Explorar la ficha <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
