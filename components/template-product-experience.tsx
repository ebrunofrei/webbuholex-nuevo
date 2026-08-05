"use client";

import Link from "next/link";
import { useState } from "react";
import type { ContractVersionId } from "@/types/catalog";
import type { TemplateMarketplaceProduct } from "@/types/template-marketplace";

function List({ items }: { items: readonly string[] }) {
  return <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

export function TemplateProductExperience({ product }: { product: TemplateMarketplaceProduct }) {
  const [selectedVersionId, setSelectedVersionId] = useState<ContractVersionId>(product.contractVersions[0]?.id ?? "ordinary");
  const selectedVersion = product.contractVersions.find((version) => version.id === selectedVersionId) ?? product.contractVersions[0];
  if (!selectedVersion) return null;

  const indexLinks = [
    ["resumen", "Resumen"],
    ["versiones", "Versiones"],
    ["contenido", "Contenido"],
    ["alcance", "Alcance"],
    ["formalidades", "Formalidades"],
    ["preguntas", "Preguntas frecuentes"],
  ] as const;

  return (
    <>
      <header className="product-public-hero" id="resumen">
        <div className="container product-public-hero-grid">
          <div>
            <div className="product-breadcrumb"><Link href="/plantillas/">Plantillas</Link><span>/</span><Link href="/plantillas/legales/">Legales</Link><span>/</span><strong>{product.code}</strong></div>
            <span className="preview-badge">{product.availabilityLabel}</span>
            <p className="eyebrow">{product.matter} · {product.jurisdiction}</p>
            <h1>{product.commercialTitle}</h1>
            <p className="product-public-lead">{product.shortDescription}</p>
            <div className="product-public-facts"><span><small>Versión jurídica</small><strong>{product.version}</strong></span><span><small>Revisión</small><strong>{product.reviewedAt}</strong></span><span><small>Próxima revisión</small><strong>{product.nextReviewAt}</strong></span></div>
          </div>
          <aside className="product-hero-summary" aria-label="Resumen del producto">
            <span className="summary-number">{product.packageCounts.customerDocuments}</span>
            <strong>documentos destinados al cliente</strong>
            <dl><div><dt>Contratos</dt><dd>{product.packageCounts.contracts}</dd></div><div><dt>Anexos</dt><dd>{product.packageCounts.annexes}</dd></div><div><dt>Formato</dt><dd>{product.deliveryFormatLabel}</dd></div></dl>
          </aside>
        </div>
      </header>

      <div className="container product-mobile-index"><details><summary>Índice de la ficha</summary><nav>{indexLinks.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav></details></div>

      <div className="container product-public-layout">
        <nav className="product-page-index" aria-label="Índice de la ficha">{indexLinks.map(([id, label], index) => <a key={id} href={`#${id}`}><span>0{index + 1}</span>{label}</a>)}</nav>

        <div className="product-public-content">
          <section className="product-introduction" aria-labelledby="product-description-title"><p className="eyebrow">Descripción del producto</p><h2 id="product-description-title">Un paquete modular para documentar el arrendamiento</h2><p>{product.fullDescription}</p><div className="product-authorship"><span><small>Autor institucional</small><strong>{product.institutionalAuthor}</strong></span><span><small>Coautor</small><strong>{product.coauthor}</strong></span></div></section>

          <section className="product-version-section" id="versiones" aria-labelledby="version-selector-title">
            <p className="eyebrow">Selector contractual</p><h2 id="version-selector-title">Elige la versión que deseas explorar</h2>
            <div className="version-selector" role="group" aria-label="Versiones contractuales">{product.contractVersions.map((version) => <button key={version.id} type="button" aria-pressed={selectedVersion.id === version.id} onClick={() => setSelectedVersionId(version.id)}><span>{version.shortName}</span><small>{selectedVersion.id === version.id ? "Seleccionada" : "Ver detalle"}</small></button>)}</div>
            <div className="sr-only" aria-live="polite" aria-atomic="true">Versión seleccionada: {selectedVersion.name}.</div>
            <article className="selected-version" data-selected-version={selectedVersion.id}>
              <div><p className="eyebrow">Versión seleccionada</p><h3>{selectedVersion.name}</h3><p>{selectedVersion.description}</p></div>
              <div className="selected-version-grid"><section><h4>Supuestos de uso</h4><List items={selectedVersion.useCases} /></section><section><h4>Formalidades</h4><List items={selectedVersion.formalities} /></section><section><h4>Advertencias</h4><List items={selectedVersion.warnings} /></section><section><h4>Documentos vinculados</h4><List items={selectedVersion.linkedDocuments} /></section></div>
              <div className="recommended-annexes"><strong>Anexos recomendados para revisar</strong><List items={selectedVersion.recommendedAnnexes} /></div>
            </article>
          </section>

          <section className="product-accordion-section" id="contenido" aria-labelledby="included-title"><p className="eyebrow">Inventario para el usuario</p><h2 id="included-title">Contenido incluido</h2>
            <details><summary><span>Contratos editables</span><strong>{product.contracts.length}</strong></summary><List items={product.contracts} /></details>
            <details><summary><span>Anexos editables</span><strong>{product.annexes.length}</strong></summary><ol>{product.annexes.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ol></details>
            <details><summary><span>Documentos auxiliares</span><strong>{product.auxiliaryDocuments.length}</strong></summary><List items={product.auxiliaryDocuments} /><p className="accordion-note">La ficha técnica y comercial es información pública futura; no es un archivo descargable del paquete.</p></details>
          </section>

          <section className="product-scope-section" id="alcance" aria-labelledby="scope-title"><p className="eyebrow">Uso responsable</p><h2 id="scope-title">Público, alcance y exclusiones</h2><div className="product-scope-grid"><article><h3>Para quién está pensado</h3><List items={product.publicAudience} /></article><article><h3>Qué cubre</h3><List items={product.scope} /></article><article className="scope-exclusions"><h3>Qué no cubre</h3><List items={product.exclusions} /></article></div></section>

          <section className="product-accordion-section" id="formalidades" aria-labelledby="formalities-title"><p className="eyebrow">Antes de utilizar</p><h2 id="formalities-title">Formalidades y riesgos de uso</h2>
            <details><summary><span>Requisitos formales</span><strong>{product.formalRequirements.length}</strong></summary><List items={product.formalRequirements} /></details>
            <details><summary><span>Advertencias jurídicas</span><strong>{product.warnings.length}</strong></summary><List items={product.warnings} /></details>
            <details><summary><span>Supuestos de uso</span><strong>{product.useCases.length}</strong></summary><List items={product.useCases} /></details>
          </section>

          <section className="product-accordion-section" id="preguntas" aria-labelledby="faq-title"><p className="eyebrow">Preguntas frecuentes</p><h2 id="faq-title">Lo esencial antes de elegir</h2>{product.frequentlyAskedQuestions.map((item) => <details key={item.question}><summary><span>{item.question}</span><b aria-hidden="true">+</b></summary><p>{item.answer}</p></details>)}</section>
          <Link href="/plantillas/">Volver al catálogo de plantillas</Link>
        </div>

        <aside className="product-commercial-summary" aria-labelledby="commercial-summary-title">
          <span className="preview-badge">{product.availabilityLabel}</span>
          <h2 id="commercial-summary-title">{product.commercialTitle}</h2>
          <p>{product.packageCounts.contracts} contratos editables, {product.packageCounts.annexes} anexos y documentos auxiliares.</p>
          <dl><div><dt>Jurisdicción</dt><dd>{product.jurisdiction}</dd></div><div><dt>Versión</dt><dd>{product.version}</dd></div><div><dt>Licencia</dt><dd>Pendiente</dd></div><div><dt>Precio</dt><dd>Pendiente</dd></div></dl>
          <Link href="/consulta-profesional/" className="button product-disabled-action">Solicitar personalización</Link>
          <p className="commercial-pending-note">Vista previa editorial. No disponible para compra o descarga.</p>
          <div className="commercial-safety"><span>Sin compra activa</span><span>Sin descarga pública</span></div>
        </aside>
      </div>
    </>
  );
}
