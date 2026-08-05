import styles from "./future-access-page.module.css";

const capabilities = [
  ["Análisis documental", "Lectura y organización de documentos aportados con autorización."],
  ["Proyectos", "Continuidad de asuntos, recursos y decisiones dentro de una cuenta."],
  ["Automatizaciones", "Flujos repetibles con controles, trazabilidad y confirmación."],
  ["Productos y servicios", "Acceso futuro a adquisiciones y servicios efectivamente contratados."],
] as const;

export function IntelligentSpaceOverview() {
  return <section className={styles.overview} aria-labelledby="space-overview-title"><div className={styles.container}><div className={styles.overviewHeading}><p>PRESENTACIÓN PÚBLICA</p><h2 id="space-overview-title">Qué integrará el espacio personal</h2><span>Esta página explica capacidades. No guarda datos, no procesa consultas y no habilita herramientas privadas.</span></div><div className={styles.overviewGrid}>{capabilities.map(([title, description]) => <article key={title}><h3>{title}</h3><p>{description}</p></article>)}</div><aside><strong>Privacidad y seguridad</strong><p>La protección de cuentas y datos se activará antes de habilitar el acceso personal.</p></aside></div></section>;
}
