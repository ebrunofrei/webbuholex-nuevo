import type { WorkspaceSession } from "@/types/auth";

export function getWorkspaceSession(): WorkspaceSession {
  return {
    status: "not_configured",
    sessionId: null,
    subjectId: null,
    issuedAt: null,
    expiresAt: null,
    provider: null,
  };
}
