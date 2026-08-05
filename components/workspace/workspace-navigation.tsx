"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { workspaceNavigation } from "@/data/navigation";
import styles from "./workspace-shell.module.css";

export function WorkspaceNavigation() {
  const pathname = usePathname();
  return <nav className={styles.navigation} aria-label="Navegación del espacio privado"><ul>{workspaceNavigation.filter((item) => item.visibility !== "hidden").map((item) => { const current = item.activeMatch === "exact" ? pathname === "/app" || pathname === "/app/" : pathname.startsWith(item.href.replace(/\/$/, "")); return <li key={item.id}><Link href={item.href} aria-current={current ? "page" : undefined}><span>{item.label}</span>{item.visibility === "reserved" ? <small>Próximamente</small> : null}</Link></li>; })}</ul></nav>;
}
