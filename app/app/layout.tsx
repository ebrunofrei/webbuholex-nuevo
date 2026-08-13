import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { requireWorkspaceSession } from "@/lib/auth/workspace-guard";
import { getWorkspaceSession } from "@/lib/auth/session";
import { workspaceNavigation } from "@/data/navigation";
import { resolveAuthorizedNavigation } from "@/lib/authorization/navigation-resolver";
import { createAuthorizationRepository } from "@/database/repositories/authorization.repository";
import { getAuthorizationDatabase } from "@/database/client";

export default async function PrivateWorkspaceLayout({ children }: { children: React.ReactNode }) {
  await requireWorkspaceSession("/app");

  const session = await getWorkspaceSession();
  const db = getAuthorizationDatabase();
  const repository = createAuthorizationRepository(db);
  const navigationItems = await resolveAuthorizedNavigation(workspaceNavigation, session, repository);

  return <WorkspaceShell navigationItems={navigationItems}>{children}</WorkspaceShell>;
}
