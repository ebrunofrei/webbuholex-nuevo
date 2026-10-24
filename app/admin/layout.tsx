import { requireWorkspaceSession } from "@/lib/auth/workspace-guard";
import { getWorkspaceSession } from "@/lib/auth/session";
import { adminNavigation } from "@/data/navigation";
import { resolveAuthorizedNavigation } from "@/lib/authorization/navigation-resolver";
import { createAuthorizationRepository } from "@/database/repositories/authorization.repository";
import { getAuthorizationDatabase } from "@/database/client";
import { resolveAdminOperatorEligibility } from "@/lib/authorization/authorization-resolver";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminBackofficeLayout({ children }: { children: React.ReactNode }) {
  await requireWorkspaceSession("/admin");

  const session = await getWorkspaceSession();
  const db = getAuthorizationDatabase();
  const repository = createAuthorizationRepository(db);

  const eligibility = await resolveAdminOperatorEligibility(session, repository);

  if (eligibility.kind !== "authorized") {
    redirect("/app");
  }

  const navigationItems = await resolveAuthorizedNavigation(adminNavigation, session, repository);

  return <AdminShell navigationItems={navigationItems}>{children}</AdminShell>;
}
