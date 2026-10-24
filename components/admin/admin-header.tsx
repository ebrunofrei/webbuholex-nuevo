import Image from "next/image";
import Link from "next/link";
import styles from "./admin-shell.module.css";

export function AdminHeader() {
  return (
    <header className={styles.header} data-shell="admin">
      <Link href="/admin" aria-label="BúhoLex, inicio del panel de administración">
        <Image src="/brand/buho-institucional.png" alt="" width={42} height={42} />
        <span>
          <strong>BúhoLex Admin</strong>
          <small>Operaciones Internas</small>
        </span>
      </Link>
    </header>
  );
}
