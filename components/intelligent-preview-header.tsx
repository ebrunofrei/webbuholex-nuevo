"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./intelligent-preview-header.module.css";

export function IntelligentPreviewHeader() {
  return (
    <header className={styles.header} data-shell="intelligent">
      <div className={styles.container}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Link href="/" className={styles.brand} aria-label="BúhoLex, ir al portal">
            <Image src="/brand/buho-institucional.png" alt="" width={40} height={40} className={styles.logo} />
            <div className={styles.brandText}>
              <span className={styles.brandName}>BúhoLex</span>
              <span className={styles.brandTagline}>Espacio inteligente</span>
            </div>
          </Link>
          <span className={styles.statusBadge}>En preparación</span>
        </div>

        <nav className={styles.nav} aria-label="Navegación del espacio inteligente">
          <Link href="/" className={styles.navLink}>Inicio</Link>
          <Link href="/explorar/" className={styles.navLink}>Información pública</Link>
          <Link href="/consulta-profesional/" className={styles.cta}>Solicitar evaluación</Link>
        </nav>
      </div>
    </header>
  );
}
