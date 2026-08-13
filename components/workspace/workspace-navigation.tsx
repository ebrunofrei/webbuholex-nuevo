"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/types/navigation";
import styles from "./workspace-shell.module.css";

export function WorkspaceNavigation({ items }: { items: readonly NavigationItem[] }) {
  const pathname = usePathname();
  return <nav className={styles.navigation} aria-label="Navegación del espacio privado"><ul>{items.filter((item) => item.visibility !== "hidden").map((item) => { const current = item.activeMatch === "exact" ? pathname === "/app" || pathname === "/app/" : pathname.startsWith(item.href.replace(/\/$/, "")); return <li key={item.id}><Link href={item.href} aria-current={current ? "page" : undefined}><span>{item.label}</span>{item.visibility === "reserved" ? <small>Próximamente</small> : null}</Link></li>; })}</ul></nav>;
}
