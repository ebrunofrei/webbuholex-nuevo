import "server-only";
import { z } from "zod";
import { getWorkspaceSession } from "@/lib/auth/session";
import { resolveTrustedAdminPrincipal, type ResolveTrustedAdminPrincipalResult } from "@/lib/authorization/authorization-resolver";
import { getAuthorizationDatabase } from "@/database/client";
import { createAuthorizationRepository } from "@/database/repositories/authorization.repository";
import { COMPLAINT_STATUSES } from "./complaint.constants";

export const ListAdminComplaintsHttpQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(COMPLAINT_STATUSES).optional(),
  cursor: z.string().trim().max(512).optional(),
}).strict();

export async function authorizeAdminComplaintsRead(): Promise<ResolveTrustedAdminPrincipalResult> {
  const session = await getWorkspaceSession();
  const db = getAuthorizationDatabase();
  const repository = createAuthorizationRepository(db);

  return resolveTrustedAdminPrincipal(session, "complaints:read", repository);
}
