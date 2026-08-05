import Link from "next/link";
import styles from "./jurisprudence.module.css";

export function IntelligentSpaceJurisprudence() {
  const capabilities = ["Lectura veloz", "Preguntas sobre resoluciones", "Comparación", "Evaluación de aplicabilidad", "Líneas jurisprudenciales", "Citas verificables"];
  return <section className={styles.spacePreview} aria-labelledby="space-jurisprudence-title"><div className={styles.container}><div><p>JURISPRUDENCIA ASISTIDA</p><h2 id="space-jurisprudence-title">Comprender decisiones sin perder la fuente</h2><span>Estas capacidades se habilitarán dentro de un espacio personal. No se procesan documentos ni se simula una cuenta activa.</span><Link href="/jurisprudencia/">CONOCER LA ARQUITECTURA PÚBLICA</Link></div><ul>{capabilities.map((capability) => <li key={capability}>{capability}<span>Próximamente</span></li>)}</ul></div></section>;
}
