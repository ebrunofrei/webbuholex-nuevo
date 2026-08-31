import type { WorkspaceSession } from "@/types/auth";
import { auth0 } from "@/lib/auth/auth0";


export function extractValidMetadata(session: unknown): { sid: string; issuedAt: string; expiresAt: string | null } | null {
  if (!session || typeof session !== "object") return null;

  if (!("internal" in session)) return null;
  const internal = session.internal;
  if (!internal || typeof internal !== "object") return null;

  if (!("sid" in internal)) return null;
  const sid = internal.sid;
  if (typeof sid !== "string" || sid.trim() === "") return null;

  if (!("createdAt" in internal)) return null;
  const createdAt = internal.createdAt;
  if (typeof createdAt !== "number" || !Number.isFinite(createdAt) || createdAt <= 0) return null;
  const issuedDate = new Date(createdAt * 1000);
  if (Number.isNaN(issuedDate.getTime())) return null;

  let expiresAtStr: string | null = null;

  if ("sessionExpiresAt" in internal) {
    const sessionExpiresAt = internal.sessionExpiresAt;
    if (sessionExpiresAt !== undefined) {
      if (
        typeof sessionExpiresAt !== "number" ||
        !Number.isFinite(sessionExpiresAt) ||
        sessionExpiresAt <= 0 ||
        sessionExpiresAt < createdAt
      ) {
        return null;
      }
      const expiresDate = new Date(sessionExpiresAt * 1000);
      if (Number.isNaN(expiresDate.getTime())) return null;
      expiresAtStr = expiresDate.toISOString();
    }
  }

  return {
    sid,
    issuedAt: issuedDate.toISOString(),
    expiresAt: expiresAtStr,
  };
}

export async function getWorkspaceSession(): Promise<WorkspaceSession> {
  const session = await auth0.getSession();

  if (!session) {
    return {
      status: "not_configured",
      sessionId: null,
      providerSubjectId: null,
      issuedAt: null,
      expiresAt: null,
      provider: null,
    };
  }

  const meta = extractValidMetadata(session);
  if (!meta) {
    return {
      status: "not_configured",
      sessionId: null,
      providerSubjectId: null,
      issuedAt: null,
      expiresAt: null,
      provider: null,
    };
  }

  return {
    status: "authenticated",
    sessionId: meta.sid,
    providerSubjectId: session.user.sub ?? null,
    issuedAt: meta.issuedAt,
    expiresAt: meta.expiresAt,
    provider: "auth0",
  };
}
