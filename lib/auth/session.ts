import type { WorkspaceSession } from "@/types/auth";
import { auth0 } from "@/lib/auth/auth0";

export async function getWorkspaceSession(): Promise<WorkspaceSession> {
  const session = await auth0.getSession();

  if (!session) {
    return {
      status: "not_configured", // Mantener como fallback genérico cuando no hay sesión
      sessionId: null,
      providerSubjectId: null,
      issuedAt: null,
      expiresAt: null,
      provider: null,
    };
  }

  return {
    status: "authenticated",
    sessionId: null, // B5B.3A no asume un internal session Id todavía
    providerSubjectId: session.user.sub ?? null,
    issuedAt: null,
    expiresAt: null,
    provider: "auth0",
  };
}
