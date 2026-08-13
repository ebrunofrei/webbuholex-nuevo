import "server-only";
import { getWorkspaceSession } from "@/lib/auth/session";
import { resolveTrustedAdminPrincipal, type ResolveTrustedAdminPrincipalResult } from "@/lib/authorization/authorization-resolver";
import { getAuthorizationDatabase } from "@/database/client";
import { createAuthorizationRepository } from "@/database/repositories/authorization.repository";

export async function authorizeAdminComplaintDetailRead(): Promise<ResolveTrustedAdminPrincipalResult> {
  const session = await getWorkspaceSession();
  const db = getAuthorizationDatabase();
  const repository = createAuthorizationRepository(db);

  return resolveTrustedAdminPrincipal(session, "complaints:read", repository);
}
