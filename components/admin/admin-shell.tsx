import { AdminHeader } from "./admin-header";
import { AdminNavigation } from "./admin-navigation";
import type { NavigationItem } from "@/types/navigation";
import styles from "./admin-shell.module.css";

export function AdminShell({
  children,
  navigationItems,
}: {
  children: React.ReactNode;
  navigationItems?: readonly NavigationItem[];
}) {
  return (
    <div className={styles.shell}>
      <AdminHeader />
      <AdminNavigation items={navigationItems || []} />
      <section className={styles.content}>{children}</section>
    </div>
  );
}
