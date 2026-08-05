import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { WorkspaceNavigation } from "@/components/workspace/workspace-navigation";
import styles from "./workspace-shell.module.css";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}><WorkspaceHeader /><WorkspaceNavigation /><section className={styles.content}>{children}</section></div>;
}
