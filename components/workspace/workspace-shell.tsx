import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { WorkspaceNavigation } from "@/components/workspace/workspace-navigation";
import type { NavigationItem } from "@/types/navigation";
import styles from "./workspace-shell.module.css";

export function WorkspaceShell({ children, navigationItems }: { children: React.ReactNode, navigationItems?: readonly NavigationItem[] }) {
  return <div className={styles.shell}><WorkspaceHeader /><WorkspaceNavigation items={navigationItems || []} /><section className={styles.content}>{children}</section></div>;
}
