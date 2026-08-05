"use client";

import Link from "next/link";
import { useState } from "react";
import { jurisprudenceDemoModes } from "@/data/jurisprudence-cognitive";
import type { JurisprudenceQueryMode } from "@/types/jurisprudence";
import styles from "./jurisprudence.module.css";

export function JurisprudenceAssistedDemo() {
  const [activeMode, setActiveMode] = useState<JurisprudenceQueryMode>("search");
  const active = jurisprudenceDemoModes.find((mode) => mode.id === activeMode) ?? jurisprudenceDemoModes[0];

  return (
    <section className={styles.assistedDemo} aria-labelledby="assisted-demo-title">
      <div className={styles.demoIntro}><p>DEMOSTRACIÓN LOCAL</p><h2 id="assisted-demo-title">Jurisprudencia Asistida</h2><span>Estos modos describen el flujo futuro. No ejecutan análisis ni muestran resoluciones simuladas.</span></div>
      <div className={styles.modeTabs} role="tablist" aria-label="Modos de jurisprudencia asistida">
        {jurisprudenceDemoModes.map((mode) => <button key={mode.id} id={`mode-${mode.id}`} type="button" role="tab" aria-selected={activeMode === mode.id} aria-controls="mode-panel" onClick={() => setActiveMode(mode.id)}>{mode.label}</button>)}
      </div>
      {active ? <div id="mode-panel" role="tabpanel" aria-labelledby={`mode-${active.id}`} className={styles.modePanel}><div><span>{active.premium ? "CAPACIDAD AVANZADA" : "ACCESO PÚBLICO"}</span><h3>{active.label}</h3><p>{active.description}</p><small>{active.example}</small></div>{active.premium ? <Link href="/iniciar-sesion/">CONOCER EL ACCESO FUTURO</Link> : <Link href="/jurisprudencia/#buscar">IR A BÚSQUEDA PÚBLICA</Link>}</div> : null}
    </section>
  );
}
