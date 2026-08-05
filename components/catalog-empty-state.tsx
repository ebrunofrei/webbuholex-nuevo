import Link from "next/link";
import type { ProductCategory } from "@/types/catalog";

interface CatalogEmptyStateProps {
  category?: ProductCategory;
}

const categoryLabels: Readonly<Record<ProductCategory, string>> = {
  legal: "legales",
  empresarial: "empresariales",
  contable: "contables",
};

export function CatalogEmptyState({ category }: CatalogEmptyStateProps) {
  const label = category ? `plantillas ${categoryLabels[category]}` : "plantillas verificadas";
  return (
    <section className="catalog-empty" aria-labelledby="catalog-empty-title">
      <span className="empty-index" aria-hidden="true">00</span>
      <div>
        <p className="eyebrow">Inventario real requerido</p>
        <h2 id="catalog-empty-title">Todavía no hay {label} publicadas</h2>
        <p>Antes de aparecer aquí, cada documento debe ser anonimizado, revisado jurídicamente, contrastado con la normativa vigente y autorizado para publicación.</p>
        <div className="empty-actions">
          <Link className="button" href="/consulta-profesional/">Solicitar una solución documental</Link>
          <Link className="text-link" href="/contacto/">Proponer material para revisión <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </section>
  );
}
