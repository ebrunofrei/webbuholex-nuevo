"use client";

import Link from "next/link";
import { useState } from "react";
import type { TemplateMarketplaceProduct } from "@/types/template-marketplace";
import styles from "./home-experience.module.css";

export function HomeProductShowcase({ product }: { product: TemplateMarketplaceProduct }) {
  const [selectedId, setSelectedId] = useState(product.contractVersions[0]?.id);
  const selected = product.contractVersions.find((version) => version.id === selectedId) ?? product.contractVersions[0];

  return (
    <article className={styles.productShowcase}>
      <div className={styles.productVisual} aria-hidden="true">
        <span className={styles.productSheetBack} />
        <span className={styles.productSheetMiddle} />
        <span className={styles.productSheetFront}><b>BL</b><i /><i /><i /><small>{product.code}</small></span>
      </div>
      <div className={styles.productCopy}>
        <div className={styles.productTopline}><span>Vista previa editorial</span><small>{product.code}</small></div>
        <h2>{product.commercialTitle}</h2>
        <p>{product.shortDescription}</p>
        <dl className={styles.productFacts}>
          <div><dt>Jurisdicción</dt><dd>{product.jurisdiction}</dd></div>
          <div><dt>Versión jurídica</dt><dd>{product.version}</dd></div>
          <div><dt>Contenido</dt><dd>{product.packageCounts.contracts} contratos · {product.packageCounts.annexes} anexos</dd></div>
        </dl>
        <div className={styles.versionSelector} aria-label="Versiones contractuales">
          {product.contractVersions.map((version) => <button key={version.id} type="button" aria-pressed={version.id === selected?.id} onClick={() => setSelectedId(version.id)}>{version.shortName}</button>)}
        </div>
        {selected ? <div className={styles.versionSummary} aria-live="polite"><strong>{selected.name}</strong><p>{selected.description}</p></div> : null}
        <p className={styles.auxiliary}>Incluye Guía de Uso y Personalización y Checklist Previo a la Firma.</p>
        <div className={styles.productActions}><Link href={product.href}>Ver ficha completa <span aria-hidden="true">→</span></Link><strong>Próximamente disponible</strong></div>
      </div>
    </article>
  );
}
