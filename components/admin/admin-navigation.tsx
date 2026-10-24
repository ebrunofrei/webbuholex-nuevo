"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/types/navigation";
import styles from "./admin-shell.module.css";

export function AdminNavigation({ items }: { items: readonly NavigationItem[] }) {
  const pathname = usePathname();

  return (
    <nav className={styles.navigation} aria-label="Navegación de administración">
      <ul>
        {items
          .filter((item) => item.visibility !== "hidden")
          .map((item) => {
            const current =
              item.activeMatch === "exact"
                ? pathname === item.href || pathname === `${item.href}/`
                : pathname.startsWith(item.href.replace(/\/$/, ""));

            return (
              <li key={item.id}>
                <Link href={item.href} aria-current={current ? "page" : undefined}>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
      </ul>
    </nav>
  );
}
