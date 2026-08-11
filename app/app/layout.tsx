import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requireWorkspaceSession } from "@/lib/auth/workspace-guard";

export default async function PrivateWorkspaceLayout({ children }: { children: React.ReactNode }) {
  await requireWorkspaceSession("/app");
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
