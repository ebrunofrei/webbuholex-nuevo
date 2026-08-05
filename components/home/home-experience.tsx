import Link from "next/link";
import { HomeHeroSlider } from "./home-hero-slider";
import { HomeProductShowcase } from "./home-product-showcase";
import { HomeTemplateSearch } from "./home-template-search";
import { legalServices } from "@/data/content";
import type { HomeHeroScene, HomeViewModel } from "@/types/home";
import type { TemplateMarketplaceProduct } from "@/types/template-marketplace";
import styles from "./home-experience.module.css";

const needs = [
  ["01", "Orientación", "Ordene los hechos, la materia y la urgencia.", "/asistente/"],
  ["02", "Documentos", "Explore soluciones con alcance y versión definidos.", "/plantillas/"],
  ["03", "Intervención profesional", "Solicite evaluación para estrategia o defensa.", "/consulta-profesional/"],
] as const;

const controls = ["Fuentes verificadas", "Jurisdicción identificada", "Versiones controladas", "Vigencia revisada"] as const;

export function HomeExperience({ products, viewModel, scenes, showHero = true }: { products: readonly TemplateMarketplaceProduct[]; viewModel: HomeViewModel; scenes: readonly HomeHeroScene[]; showHero?: boolean }) {
  const product = products[0];
  return (
    <>
      {showHero ? <HomeHeroSlider scenes={scenes} /> : null}

      <section className={styles.searchSection} aria-labelledby="quick-search-title"><div className={styles.container}><div className={styles.searchIntro}><p>CATÁLOGO JURÍDICO</p><h2 id="quick-search-title">Encuentre un documento por su necesidad</h2></div><HomeTemplateSearch products={viewModel.products} /></div></section>

      <section className={styles.productSection} aria-label="Producto jurídico destacado"><div className={styles.container}>{product ? <HomeProductShowcase product={product} /> : <div className={styles.emptyProduct}><h2>Catálogo en preparación</h2><p>Los productos aparecerán únicamente después de completar los controles editoriales y comerciales.</p></div>}</div></section>

      <section className={styles.needsSection} aria-labelledby="needs-title"><div className={styles.container}><div className={styles.sideHeading}><p>EMPIECE POR SU NECESIDAD</p><h2 id="needs-title">Una ruta distinta para cada decisión</h2></div><div className={styles.needList}>{needs.map(([number, title, description, href]) => <Link href={href} key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div><b aria-hidden="true">→</b></Link>)}</div></div></section>

      <section className={styles.categoriesSection} aria-labelledby="categories-title"><div className={styles.container}><div className={styles.sectionHeading}><p>ÁREAS DOCUMENTALES</p><h2 id="categories-title">Tres categorías, solo productos reales</h2></div><div className={styles.categoryTrack}>{viewModel.categories.map((category, index) => <Link href={category.href} key={category.category}><span>0{index + 1}</span><div><strong>{category.title}</strong><small>{category.statusLabel}</small></div></Link>)}</div></div></section>

      <section className={styles.editorialSection} aria-labelledby="editorial-title"><div className={styles.container}><div className={styles.editorialVisual} aria-hidden="true"><span>V</span><span>J</span><span>F</span><span>✓</span></div><div className={styles.editorialCopy}><p>CRITERIO EDITORIAL</p><h2 id="editorial-title">Un documento no se publica solo porque existe</h2><p>BúhoLex diferencia jurisdicción, identifica vigencia y controla cada versión antes de presentar un producto.</p><ul>{controls.map((control) => <li key={control}>{control}</li>)}</ul></div></div></section>

      <section className={styles.assistantSection} aria-labelledby="assistant-title"><div className={styles.container}><div><p>ASISTENTE LEGAL BÚHOLEX</p><h2 id="assistant-title">Primero, claridad sobre el problema</h2><p>Solicita hechos esenciales, materia, jurisdicción, urgencia y plazos. No promete resultados ni sustituye la evaluación profesional.</p><Link href="/asistente/">Consultar al Asistente Legal <span aria-hidden="true">→</span></Link></div><ol>{legalServices.map((service, index) => <li key={service.id}><span>0{index + 1}</span><strong>{service.name}</strong><p>{service.summary}</p></li>)}</ol></div></section>

      <section className={styles.jurisprudenceSection} aria-labelledby="jurisprudence-title"><div className={styles.container}><p>COLECCIÓN EN VALIDACIÓN</p><h2 id="jurisprudence-title">Jurisprudencia con fuente, contexto y límites</h2><div><p>La colección distinguirá hechos, problema jurídico, fundamentos y aplicabilidad. No se publicarán citas sin fuente verificada.</p><Link href="/jurisprudencia/">Conocer el enfoque editorial <span aria-hidden="true">→</span></Link></div></div></section>

      <section className={styles.finalSection} aria-labelledby="final-title"><div className={styles.container}><h2 id="final-title">Elija la ruta adecuada antes de actuar</h2><div><Link href="/asistente/">Consultar</Link><Link href="/plantillas/">Explorar plantillas</Link><Link href="/consulta-profesional/">Solicitar atención</Link></div></div></section>
    </>
  );
}
