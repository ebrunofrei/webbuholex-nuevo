import styles from "./workspace-shell.module.css";

export function WorkspacePlaceholder({ title, description }: { title: string; description: string }) {
  return <section className={styles.placeholder}><p>ESPACIO VIRTUAL INTELIGENTE</p><h1>{title}</h1><span>{description}</span><strong>Módulo en preparación. Próximamente disponible.</strong></section>;
}
