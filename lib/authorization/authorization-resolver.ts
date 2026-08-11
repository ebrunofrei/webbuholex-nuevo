import "server-only";
import type { WorkspaceSession } from "@/types/auth";
import type { TrustedAdminPrincipal } from "@/lib/complaints/complaints-admin-runtime";
import type { AdminCapability } from "@/database/repositories/authorization.types";
import { OperatorAuthorizationRepository } from "@/database/repositories/authorization.repository";
import { AuthorizationPersistenceError } from "@/database/repositories/authorization.errors";

export type ResolveTrustedAdminPrincipalResult =
  | {
      kind: "authorized";
      principal: TrustedAdminPrincipal;
    }
  | { kind: "unauthenticated" }
  | { kind: "operator_not_mapped" }
  | { kind: "operator_inactive" }
  | { kind: "capability_missing" }
  | { kind: "authorization_unavailable" };

export async function resolveTrustedAdminPrincipal(
  session: WorkspaceSession,
  requiredCapability: AdminCapability,
  repository: OperatorAuthorizationRepository
): Promise<ResolveTrustedAdminPrincipalResult> {
  if (
    session.status !== "authenticated" ||
    session.provider !== "auth0" ||
    !session.providerSubjectId ||
    session.providerSubjectId.trim() === ""
  ) {
    return { kind: "unauthenticated" };
  }

  try {
    const result = await repository.resolveAuthorizedOperator(
      session.provider,
      session.providerSubjectId.trim(),
      requiredCapability
    );

    if (result.kind === "authorized") {
      return {
        kind: "authorized",
        principal: {
          operatorId: result.operatorId,
          identitySource: "authenticated_session",
        },
      };
    }

    return result;
  } catch (error) {
    if (error instanceof AuthorizationPersistenceError) {
      return { kind: "authorization_unavailable" };
    }
    throw error;
  }
}
