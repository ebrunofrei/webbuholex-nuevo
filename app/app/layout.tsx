import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requireWorkspaceSession } from "@/lib/auth/workspace-guard";

export default function PrivateWorkspaceLayout({ children }: { children: React.ReactNode }) {
  requireWorkspaceSession("/app");
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
