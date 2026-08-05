import { getPackageDocuments } from "@/lib/product-package-integrity";
import type { TemplateProduct } from "@/types/catalog";
import type { ProductDocumentAudience, ProductDocumentPurpose, ProductPackage } from "@/types/product-package";

const audienceLabels: Readonly<Record<ProductDocumentAudience, string>> = {
  internal: "Interno",
  customer: "Cliente",
  public_information: "Información pública",
};

const purposeLabels: Readonly<Record<ProductDocumentPurpose, string>> = {
  contract: "Contrato",
  annex: "Anexo",
  guide: "Guía",
  guide_source: "Fuente de guía",
  license_source: "Fuente de licencia",
  technical_sheet_source: "Fuente de ficha técnica",
  readme_source: "Fuente de Léeme",
  checklist: "Checklist",
  license: "Licencia",
  technical_sheet: "Ficha técnica",
  readme: "Léeme",
  master_source: "Fuente maestra",
};

export function ProductPackagePreview({ product, productPackage }: { product: TemplateProduct; productPackage: ProductPackage }) {
  const documents = getPackageDocuments(productPackage);
  const customerDocuments = documents.filter((document) => document.audience === "customer");
  const plannedDocuments = documents.filter((document) => document.status === "planned");
  const receivedDocuments = documents.filter((document) => ["received", "verified", "approved"].includes(document.status));
  const verifiedDocuments = documents.filter((document) => ["verified", "approved"].includes(document.status));
  const approvedDocuments = documents.filter((document) => document.status === "approved");
  const pendingAuxiliaryPurposes = new Set(documents.filter((document) => ["checklist", "license", "technical_sheet", "readme"].includes(document.purpose) && document.status === "planned").map((document) => document.purpose));
  const unresolvedRequirements = productPackage.requiredBeforePublication.filter((requirement) => !requirement.resolved);
  const publicDownloads = documents.filter((document) => document.downloadable && document.fileRef !== null).length;
  const publicRoutes = documents.filter((document) => document.publishable && document.publicAuthorized && document.downloadable && document.fileRef !== null).length;
  const showDevelopmentMetadata = process.env.NODE_ENV === "development";

  return (
    <section className="package-preview" aria-labelledby={`package-${product.code}`}>
      <div className="package-preview-heading"><div><p className="eyebrow">Control del paquete comercial</p><h3 id={`package-${product.code}`}>Inventario documental y preparación</h3></div><strong>Producto no publicable</strong></div>

      <dl className="package-summary">
        <div><dt>Código</dt><dd>{product.code}</dd></div>
        <div><dt>Título</dt><dd>{product.commercialTitle}</dd></div>
        <div><dt>Versión</dt><dd>{productPackage.packageVersion}</dd></div>
        <div><dt>Jurisdicción</dt><dd>{product.jurisdiction}</dd></div>
        <div><dt>Estado editorial</dt><dd>{product.editorialStatus}</dd></div>
        <div><dt>Estado del paquete</dt><dd>{productPackage.packageStatus}</dd></div>
        <div><dt>Documentos registrados</dt><dd>{documents.length}</dd></div>
        <div><dt>Recibidos</dt><dd>{receivedDocuments.length}</dd></div>
        <div><dt>Verificados</dt><dd>{verifiedDocuments.length}</dd></div>
        <div><dt>Aprobados</dt><dd>{approvedDocuments.length}</dd></div>
        <div><dt>Faltantes</dt><dd>{plannedDocuments.length}</dd></div>
        <div><dt>Disponibilidad pública</dt><dd>No disponible</dd></div>
        <div><dt>Archivos internos</dt><dd>{productPackage.internalFiles.length}</dd></div>
        <div><dt>Archivos para cliente</dt><dd>{customerDocuments.length}</dd></div>
        <div><dt>Documentos planificados</dt><dd>{plannedDocuments.length}</dd></div>
        <div><dt>Bloqueos pendientes</dt><dd>{unresolvedRequirements.length}</dd></div>
      </dl>

      <div className="package-indicators" aria-label="Indicadores calculados del paquete">
        <span><strong data-testid="contracts-count">{documents.filter((document) => document.purpose === "contract").length}</strong> contratos comerciales registrados</span>
        <span><strong data-testid="annexes-count">{documents.filter((document) => document.purpose === "annex").length}</strong> anexos registrados</span>
        <span><strong data-testid="guide-pdf-count">{documents.filter((document) => document.purpose === "guide" && document.format === "pdf").length}</strong> guía PDF prevista o incorporada</span>
        <span><strong data-testid="guide-source-count">{documents.filter((document) => document.purpose === "guide_source" && document.format === "docx").length}</strong> fuente Word interna</span>
        <span><strong data-testid="auxiliary-count">{pendingAuxiliaryPurposes.size}</strong> archivos auxiliares faltantes</span>
        <span><strong data-testid="downloads-count">{publicDownloads}</strong> descargas públicas</span>
        <span><strong data-testid="public-routes-count">{publicRoutes}</strong> rutas públicas</span>
      </div>

      <div className="package-table-wrap">
        <table className="package-file-table">
          <caption>Inventario de archivos del paquete {product.code}</caption>
          <thead><tr><th>Identificador</th><th>Nombre</th><th>Propósito</th><th>Audiencia</th><th>Formato</th><th>Estado</th><th>Referencia interna</th><th>Tamaño</th><th>Hash</th><th>Entregable</th><th>Descargable</th><th>Autorización</th><th>Observaciones</th></tr></thead>
          <tbody>{documents.map((document) => <tr key={document.id}><td>{document.id}</td><td>{document.fileName}</td><td>{purposeLabels[document.purpose]}</td><td>{audienceLabels[document.audience]}</td><td>{document.format === "docx" ? "Word editable" : "PDF"}</td><td>{document.status}</td><td>{document.fileRef ? "Referencia privada verificada" : "Pendiente"}</td><td>{document.fileMetadata ? `${document.fileMetadata.byteSize} bytes` : "Pendiente"}</td><td>{showDevelopmentMetadata && document.fileMetadata ? document.fileMetadata.sha256.slice(0, 12) : "Pendiente"}</td><td>{document.deliverable ? "Sí" : "No"}</td><td>{document.downloadable ? "Sí" : "No"}</td><td>{document.publicAuthorized ? "Autorizado" : "Pendiente"}</td><td>{document.observations}</td></tr>)}</tbody>
        </table>
      </div>

      <section className="package-blockers" aria-labelledby={`package-blockers-${product.code}`}><h4 id={`package-blockers-${product.code}`}>Bloqueos obligatorios ({unresolvedRequirements.length})</h4><ul>{unresolvedRequirements.map((requirement) => <li key={requirement.code}><strong>{requirement.label}</strong><span>{requirement.description}</span><code>{requirement.code}</code></li>)}</ul></section>
      <p className="package-safety-note">Sin descargas · Sin rutas públicas · Sin entrega activa · Plantilla maestra protegida</p>
    </section>
  );
}
