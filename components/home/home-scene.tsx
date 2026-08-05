import Image from "next/image";
import Link from "next/link";
import type { HomeHeroScene } from "@/types/home";
import styles from "./home-hero-slider.module.css";

function SceneVisual({ scene, priority }: { scene: HomeHeroScene; priority: boolean }) {
  if (scene.visual === "owl") {
    return (
      <div className={styles.owlVisual}>
        <span className={styles.owlHalo} aria-hidden="true" />
        <Image src="/brand/buho-institucional.png" alt="Búho institucional de BúhoLex con balanza y libro jurídico" width={784} height={1059} priority={priority} sizes="(max-width: 720px) 68vw, 390px" />
      </div>
    );
  }

  if (scene.visual === "documents" || scene.visual === "product") {
    return (
      <div className={`${styles.documentVisual} ${scene.visual === "product" ? styles.productVisual : ""}`} role="img" aria-label={scene.visual === "product" ? "Representación editorial del producto de arrendamiento" : "Representación abstracta de documentos jurídicos controlados"}>
        <span className={styles.documentBack} aria-hidden="true" />
        <span className={styles.documentMiddle} aria-hidden="true" />
        <span className={styles.documentFront} aria-hidden="true">
          <i />
          <i />
          <i />
          <b>{scene.visual === "product" ? "BL-LEG-CON-001" : "BÚHOLEX"}</b>
        </span>
        <span className={styles.documentSeal} aria-hidden="true">BL</span>
      </div>
    );
  }

  return (
    <div className={styles.professionalVisual} role="img" aria-label="Composición abstracta de estrategia jurídica y evaluación profesional">
      <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
      <b aria-hidden="true">§</b>
    </div>
  );
}

export function HomeScene({ scene, priority }: { scene: HomeHeroScene; priority: boolean }) {
  return (
    <div className={styles.scene} role="group" aria-roledescription="diapositiva" aria-label={`${scene.number} de 04`}>
      <div className={styles.copy}>
        <p className={styles.label}>{scene.label}</p>
        <h1>{scene.title}</h1>
        <p className={styles.description}>{scene.description}</p>
        {scene.status ? <p className={styles.status}>{scene.status}</p> : null}
        <Link className={styles.action} href={scene.href}>{scene.action}<span aria-hidden="true">→</span></Link>
      </div>
      <div className={styles.visual}><SceneVisual scene={scene} priority={priority} /></div>
      <div className={styles.sceneNumber} aria-hidden="true">{scene.number}</div>
    </div>
  );
}
