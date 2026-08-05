import { ProductPackagePreview } from "@/components/product-package-preview";
import type { TemplateProduct } from "@/types/catalog";
import type { ProductPackage } from "@/types/product-package";

export function TemplateEditorialPreview({ product, productPackage }: { product: TemplateProduct; productPackage: ProductPackage }) {
  return (
    <article className="product-editorial-preview" aria-labelledby={`preview-${product.code}`}>
      <header className="editorial-preview-header">
        <div><p className="eyebrow">Vista editorial local · No publicada</p><h2 id={`preview-${product.code}`}>{product.commercialTitle}</h2><p>{product.shortDescription}</p></div>
        <div className="editorial-preview-status"><span>{product.code}</span><strong>Aprobación interna</strong><small>Disponibilidad: vista previa editorial</small></div>
      </header>

      <dl className="editorial-product-meta">
        <div><dt>Jurisdicción</dt><dd>{product.jurisdiction}</dd></div>
        <div><dt>Materia</dt><dd>{product.matter}</dd></div>
        <div><dt>Formato</dt><dd>Word editable</dd></div>
        <div><dt>Versión jurídica</dt><dd>{product.version}</dd></div>
        <div><dt>Revisión</dt><dd>{product.reviewedAt}</dd></div>
        <div><dt>Estado</dt><dd>{product.editorialStatus}</dd></div>
        <div><dt>Estado comercial</dt><dd>No disponible</dd></div>
        <div><dt>Visibilidad</dt><dd>{product.availabilityStatus}</dd></div>
      </dl>

      <section className="editorial-description" aria-labelledby={`description-${product.code}`}><h3 id={`description-${product.code}`}>Descripción</h3><p>{product.fullDescription}</p></section>

      <section className="editorial-rights-state" aria-labelledby={`rights-${product.code}`}>
        <div className="editorial-rights-heading">
          <div><p className="eyebrow">Formalización editorial y patrimonial</p><h3 id={`rights-${product.code}`}>Autoría, revisión y titularidad</h3></div>
          <strong>Respaldo corporativo privado verificado</strong>
        </div>
        <dl>
          <div><dt>Autor institucional</dt><dd>{product.intellectualProperty.institutionalAuthor}</dd></div>
          <div><dt>Coautor y elaboración jurídica</dt><dd>{product.intellectualProperty.coauthor}</dd></div>
          <div><dt>Responsable editorial</dt><dd>{product.editorialOwnerId}</dd></div>
          <div><dt>Revisor jurídico</dt><dd>{product.versionHistory.find((entry) => entry.version === product.version)?.reviewerId}</dd></div>
          <div><dt>Titular de derechos patrimoniales</dt><dd>{product.intellectualProperty.rightsHolder}</dd></div>
          <div><dt>Marca de comercialización</dt><dd>{product.intellectualProperty.brand}</dd></div>
          <div><dt>Autoría</dt><dd>{product.intellectualProperty.authorshipStatus === "formalized" ? "Formalizada" : "Pendiente"}</dd></div>
          <div><dt>Cesión patrimonial</dt><dd>{product.intellectualProperty.rightsTransferStatus === "documented" ? "Documentada" : "Pendiente"}</dd></div>
        </dl>
        <p>El respaldo permanece en custodia privada: no forma parte del paquete, no se entrega y no tiene acceso público.</p>
      </section>

      <div className="editorial-detail-grid">
        <section><h3>Contenido incluido</h3><ul>{product.includedItems.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section><h3>Supuestos de uso</h3><ul>{product.useCases.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section><h3>Exclusiones</h3><ul>{product.exclusions.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section><h3>Advertencias</h3><ul>{product.warnings.map((item) => <li key={item}>{item}</li>)}</ul></section>
      </div>

      <section className="editorial-personalization"><h3>Casos que pueden requerir personalización</h3><p>La personalización no está activa como servicio comercial.</p><ul>{product.personalizationCases.map((item) => <li key={item}>{item}</li>)}</ul></section>

      <div className="editorial-commercial-state">
        <section><h3>Precio</h3><strong>Pendiente de aprobación</strong><p>No se ha registrado importe ni moneda.</p></section>
        <section><h3>Licencia</h3><strong>Pendiente de aprobación</strong><p>{product.licenseSummary}</p></section>
      </div>

      <ProductPackagePreview product={product} productPackage={productPackage} />

      <section className="editorial-history"><h3>Historial editorial</h3><ol>{product.versionHistory.map((entry) => <li key={entry.version}><strong>{entry.version}</strong><span>{entry.changes.join(" ")}</span>{entry.reviewedAt ? <time dateTime={entry.reviewedAt}>{entry.reviewedAt}</time> : <small>Fecha no proporcionada</small>}</li>)}</ol></section>
    </article>
  );
}
