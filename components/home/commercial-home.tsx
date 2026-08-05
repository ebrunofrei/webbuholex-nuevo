"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./commercial-home.module.css";

export function CommercialHome() {
  return (
    <main className={styles.home}>
      <header className={styles.brandHeader}>
        <h1 className={styles.heroTitle}>Bienvenido a tu plataforma jurídica interactiva</h1>
      </header>
      <div className={styles.heroDualContainer}>
        <Link className={`${styles.choice} ${styles.publicChoice}`} href="/explorar/">
          <div className={styles.choiceContent}>
            <p>ÁREA PÚBLICA</p>
            <h2>Acceder a tu Información pública</h2>
            <span>Jurisprudencia, servicios profesionales, recursos jurídicos y canales de atención.</span>
            <strong className={styles.choiceAction}>EXPLORAR <i aria-hidden="true">→</i></strong>
          </div>
        </Link>

        <div className={styles.owlContainer} aria-hidden="true">
          <div className={styles.owl}>
            <div className={styles.owlHalo}>
              <Image className={styles.owlImage} src="/brand/buho-institucional.png" alt="" width={783} height={1057} priority sizes="(max-width: 1023px) 150px, (max-width: 1200px) 200px, 250px" />
            </div>
          </div>
          <p className={styles.owlSlogan}>Derecho, tecnología y criterio profesional en un solo espacio.</p>
        </div>

        <Link className={`${styles.choice} ${styles.intelligentChoice}`} href="/asistente/">
          <div className={styles.choiceContent}>
            <p>INNOVACIÓN INTERNA</p>
            <h2>Espacio IA legal</h2>
            <span>Orientación jurídica y herramientas inteligentes para acompañar su experiencia en BúhoLex.</span>
            <small>En desarrollo</small>
            <strong className={styles.choiceAction}>INGRESAR <i aria-hidden="true">→</i></strong>
          </div>
        </Link>
      </div>
    </main>
  );
}
