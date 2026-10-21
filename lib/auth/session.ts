import type { WorkspaceSession } from "@/types/auth";
import { auth0 } from "@/lib/auth/auth0";
import { getAuthProvider } from "@/lib/auth/provider";
import { getSupabaseWorkspaceSession } from "@/lib/auth/supabase-session";


/**
 * Evaluates whether Auth0 is configured in the environment.
 * Requires: AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET, APP_BASE_URL.
 * Returns a strict boolean with zero secret leakage or logging.
 */
export function isAuth0Configured(env: Record<string, string | undefined> = process.env): boolean {
  const domain = env.AUTH0_DOMAIN?.trim();
  const clientId = env.AUTH0_CLIENT_ID?.trim();
  const clientSecret = env.AUTH0_CLIENT_SECRET?.trim();
  const secret = env.AUTH0_SECRET?.trim();
  const appBaseUrl = env.APP_BASE_URL?.trim();

  return Boolean(domain && clientId && clientSecret && secret && appBaseUrl);
}

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

export async function getAuth0WorkspaceSession(): Promise<WorkspaceSession> {
  if (!isAuth0Configured()) {
    return {
      status: "not_configured",
      sessionId: null,
      providerSubjectId: null,
      issuedAt: null,
      expiresAt: null,
      provider: null,
    };
  }

  const session = await auth0.getSession();

  if (!session) {
    return {
      status: "unauthenticated",
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
      status: "unauthenticated",
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

export async function getWorkspaceSession(): Promise<WorkspaceSession> {
  const provider = getAuthProvider();

  if (provider === "supabase") {
    return await getSupabaseWorkspaceSession();
  }

  return await getAuth0WorkspaceSession();
}
