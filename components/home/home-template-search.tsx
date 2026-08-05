"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { HomeTemplateSuggestion } from "@/types/home";
import styles from "./home-experience.module.css";

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

export function HomeTemplateSearch({ products }: { products: readonly HomeTemplateSuggestion[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalize(query);
  const matches = useMemo(() => products.filter((product) => normalize(`${product.title} ${product.code} ${product.matter}`).includes(normalizedQuery)), [normalizedQuery, products]);

  return (
    <div className={styles.searchBox}>
      <label htmlFor="home-template-search">Buscar plantillas</label>
      <div className={styles.searchField}>
        <span aria-hidden="true">⌕</span>
        <input id="home-template-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, código o materia" autoComplete="off" />
      </div>
      {normalizedQuery ? (
        <div className={styles.searchResults} aria-live="polite">
          <strong>{matches.length === 1 ? "1 coincidencia" : `${matches.length} coincidencias`}</strong>
          {matches.length ? <ul>{matches.map((product) => <li key={product.id}><Link href={product.href}><span><b>{product.title}</b><small>{product.code} · {product.matter}</small></span><i aria-hidden="true">→</i></Link></li>)}</ul> : <p>No encontramos una plantilla con ese criterio.</p>}
        </div>
      ) : <p className={styles.searchHint}><strong>{products.length}</strong> {products.length === 1 ? "producto real registrado" : "productos reales registrados"}</p>}
    </div>
  );
}
