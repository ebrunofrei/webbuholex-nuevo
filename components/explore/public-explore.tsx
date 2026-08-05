import Link from "next/link";
import styles from "./public-explore.module.css";

const publicDestinations = [
  { title: "Jurisprudencia", description: "Se prepara un corpus estructurado de resoluciones y criterios jurídicos.", href: "/jurisprudencia/", status: "En preparación" },
  { title: "Manuales y guías", description: "Recursos de consulta y orientación general.", href: "/biblioteca/", status: "En preparación" },
  { title: "Legislación", description: "Códigos y normativa organizada.", href: "/codigos/", status: "En preparación" },
  { title: "Plantillas y productos", description: "Conoce las categorías y documentos que BúhoLex prepara para futuras publicaciones.", href: "/plantillas/", status: "Vista informativa" },
  { title: "Servicios", description: "Servicios jurídicos, empresariales, administrativos, técnicos y digitales.", href: "/servicios/", status: "Disponible" },
  { title: "Herramientas públicas", description: "Se prepara un asistente para orientación jurídica digital básica.", href: "/asistente/", status: "En preparación" },
  { title: "Artículos", description: "Análisis y contenidos editoriales.", href: "/blog/", status: "En preparación" },
  { title: "Institución", description: "Identidad, criterios y responsabilidad.", href: "/nosotros/", status: "Disponible" },
  { title: "Contacto", description: "Canales corporativos autorizados de BúhoLex.", href: "/contacto/", status: "Disponible" },
] as const;

function statusTone(status: (typeof publicDestinations)[number]["status"]) {
  if (status === "Disponible") return "available";
  if (status === "En preparación") return "preparation";
  if (status === "Vista informativa") return "informative";
  return "upcoming";
}

export function PublicExplore() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="explore-title"><div className={styles.container}><p>INFORMACIÓN PÚBLICA</p><h1 id="explore-title">Explora BúhoLex</h1><h2>Accede a servicios profesionales, información institucional y recursos jurídicos disponibles o en preparación.</h2><div><span>Acceso libre</span><span>Sin cuenta</span></div></div></section>
      <nav className={styles.directory} aria-label="Directorio de información pública"><div className={styles.container}>{publicDestinations.map(({ title, description, href, status }, index) => <Link key={href} href={href}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div><strong>{title}</strong><small>{description}</small><em data-status={statusTone(status)}>{status}</em></div><b aria-hidden="true">→</b></Link>)}</div></nav>
    </>
  );
}
