import Link from "next/link";
import type { AccessBoundary } from "@/types/access";
import styles from "./future-access-page.module.css";

export function FutureAccessPage({ eyebrow, title, description, status, boundaries, mode }: { eyebrow: string; title: string; description: string; status: string; boundaries: readonly AccessBoundary[]; mode: "login" | "space" }) {
  const statusLabel = (boundary: AccessBoundary) => boundary.id === "public" ? "Disponible sin cuenta" : "Se habilitará próximamente";
  return (
    <section className={styles.page} aria-labelledby="future-access-title"><div className={styles.container}>
      <div className={styles.intro}><p>{eyebrow}</p><h1 id="future-access-title">{title}</h1><span>{status}</span><p>{description}</p></div>
      <div className={styles.boundaries}>
        {boundaries.map((boundary, index) => <article key={boundary.id}><span>0{index + 1}</span><h2>{boundary.label}</h2><p>{statusLabel(boundary)}</p><ul>{boundary.capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul></article>)}
      </div>
      <div className={styles.actions}>{mode === "space" ? <><Link href="/iniciar-sesion/">INGRESAR</Link><Link href="/explorar/">VOLVER A INFORMACIÓN PÚBLICA</Link></> : <><Link href="/explorar/">VOLVER A INFORMACIÓN PÚBLICA</Link><Link href="/espacio/">CONOCER EL ESPACIO INTELIGENTE</Link></>}</div>
      <p className={styles.note}>{mode === "login" ? "Los recursos públicos continúan disponibles sin registro." : "Presentación pública: las herramientas personales requieren una sesión válida."}</p>
    </div></section>
  );
}
