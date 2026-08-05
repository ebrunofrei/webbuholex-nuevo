"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TemplateProductCard } from "@/components/template-product-card";
import type { ProductCategory } from "@/types/catalog";
import type { TemplateMarketplaceProduct } from "@/types/template-marketplace";

const categoryOptions: ReadonlyArray<{ value: "all" | ProductCategory; label: string; href: string }> = [
  { value: "all", label: "Todas", href: "/plantillas/" },
  { value: "legal", label: "Legales", href: "/plantillas/legales/" },
  { value: "empresarial", label: "Empresariales", href: "/plantillas/empresariales/" },
  { value: "contable", label: "Contables", href: "/plantillas/contables/" },
];

export function TemplateCatalogExplorer({ products, initialCategory = "all" }: { products: readonly TemplateMarketplaceProduct[]; initialCategory?: "all" | ProductCategory }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ProductCategory>(initialCategory);
  const [matter, setMatter] = useState("all");
  const [jurisdiction, setJurisdiction] = useState("all");
  const [documentType, setDocumentType] = useState("all");
  const [availability, setAvailability] = useState("all");

  const options = useMemo(() => ({
    matters: [...new Set(products.map((product) => product.matter))],
    jurisdictions: [...new Set(products.map((product) => product.jurisdiction))],
    documentTypes: [...new Set(products.map((product) => product.documentType))],
    availability: [...new Set(products.map((product) => product.availabilityStatus))],
  }), [products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es-PE");
    return products.filter((product) => {
      const searchable = `${product.commercialTitle} ${product.code} ${product.matter}`.toLocaleLowerCase("es-PE");
      return (!normalizedQuery || searchable.includes(normalizedQuery))
        && (category === "all" || product.category === category)
        && (matter === "all" || product.matter === matter)
        && (jurisdiction === "all" || product.jurisdiction === jurisdiction)
        && (documentType === "all" || product.documentType === documentType)
        && (availability === "all" || product.availabilityStatus === availability);
    });
  }, [availability, category, documentType, jurisdiction, matter, products, query]);

  const reset = () => {
    setQuery("");
    setCategory(initialCategory);
    setMatter("all");
    setJurisdiction("all");
    setDocumentType("all");
    setAvailability("all");
  };

  return (
    <section className="catalog-explorer" aria-labelledby="catalog-results-title">
      <nav className="catalog-category-tabs" aria-label="Categorías de plantillas">
        {categoryOptions.map((option) => <Link key={option.value} href={option.href} aria-current={category === option.value ? "page" : undefined} onClick={() => setCategory(option.value)}>{option.label}</Link>)}
      </nav>

      <div className="catalog-controls">
        <label className="catalog-search"><span>Buscar plantillas</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, código o materia" /></label>
        <label><span>Categoría</span><select aria-label="Filtrar por categoría" value={category} onChange={(event) => setCategory(event.target.value as "all" | ProductCategory)}>{categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label><span>Materia</span><select aria-label="Filtrar por materia" value={matter} onChange={(event) => setMatter(event.target.value)}><option value="all">Todas</option>{options.matters.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <label><span>Jurisdicción</span><select aria-label="Filtrar por jurisdicción" value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)}><option value="all">Todas</option>{options.jurisdictions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <label><span>Tipo</span><select aria-label="Filtrar por tipo de documento" value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option value="all">Todos</option>{options.documentTypes.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <label><span>Disponibilidad</span><select aria-label="Filtrar por disponibilidad" value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="all">Todas</option>{options.availability.map((option) => <option key={option} value={option}>{option === "editorial_preview" ? "Vista previa editorial" : option}</option>)}</select></label>
      </div>

      <div className="catalog-results-heading"><div><p className="eyebrow">Colección BúhoLex</p><h2 id="catalog-results-title">Plantillas encontradas</h2></div><strong aria-live="polite">{filteredProducts.length} {filteredProducts.length === 1 ? "producto" : "productos"}</strong></div>
      {filteredProducts.length > 0
        ? <div className="catalog-product-grid">{filteredProducts.map((product) => <TemplateProductCard key={product.id} product={product} />)}</div>
        : <div className="catalog-empty-modern"><span aria-hidden="true">⌕</span><div><h3>No encontramos plantillas con esos criterios</h3><p>Prueba otra materia, jurisdicción o término de búsqueda.</p><button className="button button-secondary" type="button" onClick={reset}>Limpiar filtros</button></div></div>}
    </section>
  );
}
