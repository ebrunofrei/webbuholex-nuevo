import Image from "next/image";
import Link from "next/link";
import styles from "./workspace-shell.module.css";

export function WorkspaceHeader() {
  return <header className={styles.header} data-shell="workspace"><Link href="/app/" aria-label="BúhoLex, inicio del espacio privado"><Image src="/brand/buho-institucional.png" alt="" width={42} height={42} /><span><strong>BúhoLex</strong><small>Espacio Virtual Inteligente</small></span></Link><div aria-label="Acciones futuras"><button type="button" disabled>Búsqueda global</button><button type="button" disabled>Notificaciones</button></div></header>;
}
