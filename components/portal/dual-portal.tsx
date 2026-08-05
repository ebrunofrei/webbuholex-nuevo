"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LegalTransparencyPanel } from "./legal-transparency-panel";
import styles from "./dual-portal.module.css";

export function DualPortal() {
  const [legalOpen, setLegalOpen] = useState(false);
  const [activeZone, setActiveZone] = useState<"public" | "intelligent" | null>(null);

  return (
    <div className={styles.portal}>
      <header className={styles.brandHeader}>
        <div><strong>BÚHOLEX</strong><span>PLATAFORMA JURÍDICA INTERACTIVA</span></div>
      </header>

      <div className={styles.choices} data-active={activeZone ?? "none"} aria-label="Elija una zona de BúhoLex">
        <Link className={`${styles.choice} ${styles.publicChoice}`} href="/explorar/" onPointerEnter={() => setActiveZone("public")} onPointerLeave={() => setActiveZone(null)} onFocus={() => setActiveZone("public")} onBlur={() => setActiveZone(null)}>
          <div><p>INFORMACIÓN PÚBLICA</p><h1>Conocimiento jurídico abierto</h1><span>Jurisprudencia, manuales, legislación, herramientas, productos y servicios de libre consulta.</span></div>
          <strong className={styles.choiceAction}>EXPLORAR <i aria-hidden="true">→</i></strong>
        </Link>

        <div className={styles.owl} data-active={activeZone ?? "none"}>
          <div className={styles.owlHalo}>
            <Image className={styles.owlImage} src="/brand/buho-institucional.png" alt="Búho institucional de BúhoLex" width={783} height={1057} priority sizes="(max-width: 820px) 150px, 250px" />
          </div>
        </div>

        <Link className={`${styles.choice} ${styles.intelligentChoice}`} href="/iniciar-sesion/" onPointerEnter={() => setActiveZone("intelligent")} onPointerLeave={() => setActiveZone(null)} onFocus={() => setActiveZone("intelligent")} onBlur={() => setActiveZone(null)}>
          <div><p>ESPACIO VIRTUAL INTELIGENTE</p><h2>Trabajo jurídico personalizado</h2><span>Análisis, proyectos, automatización y asistencia personalizada.</span><small>Acceso personal en preparación.</small></div>
          <strong className={styles.choiceAction}>INGRESAR <i aria-hidden="true">→</i></strong>
        </Link>
      </div>

      <button className={styles.legalControl} type="button" onClick={() => setLegalOpen(true)} aria-haspopup="dialog">Transparencia y marco legal</button>
      <LegalTransparencyPanel open={legalOpen} onClose={() => setLegalOpen(false)} />
    </div>
  );
}
