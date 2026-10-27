import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requireWorkspaceSession } from "@/lib/auth/workspace-guard";
import { workspaceNavigation } from "@/data/navigation";

export default async function PrivateWorkspaceLayout({ children }: { children: React.ReactNode }) {
  await requireWorkspaceSession("/app");

  const navigationItems = workspaceNavigation.filter((item) => item.visibility !== "hidden");

  return <WorkspaceShell navigationItems={navigationItems}>{children}</WorkspaceShell>;
}
