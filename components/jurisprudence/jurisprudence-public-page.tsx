"use client";

import Link from "next/link";
import { jurisprudenceInstitutions } from "@/data/jurisprudence-cognitive";
import type { JurisprudencePublicSearchGateway } from "@/types/jurisprudence-public-search-gateway";
import { JurisprudenceAssistedDemo } from "./jurisprudence-assisted-demo";
import { useState } from "react";
import { JurisprudencePublicSearch, type JurisprudencePublicSearchAction } from "./jurisprudence-public-search";
import { OwlAnalysisEntry } from "@/components/owl/owl-analysis-entry";
import styles from "./jurisprudence.module.css";

export function JurisprudencePublicPage({ searchGateway, searchAction }: { readonly searchGateway?: JurisprudencePublicSearchGateway; readonly searchAction?: JurisprudencePublicSearchAction } = {}) {
  const [mode, setMode] = useState<"search" | "analysis">("search");

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="jurisprudence-title">
        <div className={styles.container}>
          <p>JURISPRUDENCIA</p>
          <h1 id="jurisprudence-title">Jurisprudencia</h1>
          <h2>Consulta resoluciones incorporadas al catálogo público de BúhoLex mediante criterios estructurados. La disponibilidad depende de registros previamente revisados y habilitados.</h2>
          <div className={styles.heroActions}>
            <a href="#buscar">BUSCAR JURISPRUDENCIA</a>
            <a href="#criterios">EXPLORAR CRITERIOS</a>
            <a href="#fuentes">CONOCER LAS FUENTES</a>
          </div>
        </div>
      </section>

      <div className={styles.modeSelector} role="group" aria-label="Modo de consulta">
        <div className={styles.container} style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "-20px", marginBottom: "20px" }}>
          <button
            type="button"
            aria-pressed={mode === "search"}
            onClick={() => setMode("search")}
            className={mode === "search" ? styles.modeSelectorBtnActive : styles.modeSelectorBtn}
          >
            BUSCAR RESOLUCIONES
          </button>
          <button
            type="button"
            aria-pressed={mode === "analysis"}
            onClick={() => setMode("analysis")}
            className={mode === "analysis" ? styles.modeSelectorBtnActive : styles.modeSelectorBtn}
          >
            BÚHO ANALÍTICO
          </button>
          <button
            type="button"
            aria-disabled="true"
            className={styles.modeSelectorBtnDisabled}
          >
            TEMAS MÁS CONSULTADOS <span className={styles.futureBadge}>Próximamente</span>
          </button>
        </div>
      </div>

      {mode === "search" ? (
        <JurisprudencePublicSearch
          {...(searchGateway !== undefined ? { gateway: searchGateway } : {})}
          searchAction={searchAction}
        />
      ) : (
        <div className={styles.container} style={{ padding: "clamp(40px, 6vw, 64px) 0" }}>
          <OwlAnalysisEntry />
        </div>
      )}

      <section id="criterios" className={styles.criteriaSection} aria-labelledby="criteria-title">
        <div className={styles.container}>
          <div><p>LECTURA ESTRUCTURADA</p><h2 id="criteria-title">De la resolución al criterio verificable</h2></div>
          <ol>
            <li><strong>Identificación</strong><span>Institución, órgano, expediente, fecha, especialidad y materia.</span></li>
            <li><strong>Problema jurídico</strong><span>Pregunta jurídica separada del resumen y de la inferencia.</span></li>
            <li><strong>Fundamentos</strong><span>Ratio decidendi, fundamentos accesorios, votos y páginas.</span></li>
            <li><strong>Aplicabilidad</strong><span>Similitudes, diferencias, condiciones, riesgos y límites.</span></li>
          </ol>
          <p className={styles.limitation}>La aplicabilidad siempre será provisional: una resolución no se traslada automáticamente a otro caso.</p>
        </div>
      </section>

      <section id="fuentes" className={styles.sourcesSection} aria-labelledby="sources-title">
        <div className={styles.container}>
          <div><p>FUENTES Y PROCEDENCIA</p><h2 id="sources-title">Procedencia antes que automatización</h2><span>Cada ficha pública deberá identificar su institución y conservar una referencia documental previamente revisada.</span></div>
          <ul>{jurisprudenceInstitutions.map((institution) => <li key={institution.id}><strong>{institution.name}</strong><span>Referencia institucional sujeta a habilitación</span></li>)}</ul>
          <p>Solo se presentarán criterios y referencias cuya procedencia pueda verificarse.</p>
        </div>
      </section>

      <section className={styles.intelligentActions} aria-labelledby="intelligent-actions-title">
        <div className={styles.container}>
          <p>CAPACIDADES AVANZADAS</p>
          <h2 id="intelligent-actions-title">Analizar exige cuenta, fuentes verificadas y control editorial</h2>
          <div>{["Analizar una sentencia", "Comparar resoluciones", "Preguntar al Asistente", "Evaluar aplicabilidad"].map((label) => <Link key={label} href="/iniciar-sesion/">{label}<span aria-hidden="true">→</span></Link>)}</div>
        </div>
      </section>
      <div className={styles.container}><JurisprudenceAssistedDemo /></div>
    </main>
  );
}
