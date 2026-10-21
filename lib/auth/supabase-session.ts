import "server-only";

import type { WorkspaceSession } from "@/types/auth";
import { createSupabaseServerClient, getSupabaseEnv } from "./supabase-server";

function isJsonObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

/**
 * Parses JWT payload without verification (safe for extracting non-secret claims like session_id/iat/exp
 * on tokens retrieved directly from authenticated SSR session context).
 */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payloadPart = parts[1];
    if (typeof payloadPart !== "string") return null;

    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (isJsonObject(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export interface MinimalSupabaseUser {
  readonly id?: string;
  readonly created_at?: string;
}

export interface MinimalSupabaseSession {
  readonly access_token?: string;
  readonly expires_at?: number;
  readonly user?: MinimalSupabaseUser;
}

/**
 * Maps Supabase authenticated session and user to the neutral WorkspaceSession representation.
 * If Supabase session has no explicit session_id claim in JWT, sessionId remains null (never invented).
 */
export function mapSupabaseSessionToWorkspaceSession(
  session: MinimalSupabaseSession | null | undefined
): WorkspaceSession {
  if (!session || !session.user) {
    return {
      status: "unauthenticated",
      sessionId: null,
      providerSubjectId: null,
      issuedAt: null,
      expiresAt: null,
      provider: null,
    };
  }

  const userId = session.user.id;
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    return {
      status: "unauthenticated",
      sessionId: null,
      providerSubjectId: null,
      issuedAt: null,
      expiresAt: null,
      provider: null,
    };
  }

  let sessionId: string | null = null;
  let issuedAt: string | null = null;
  let expiresAt: string | null = null;

  if (typeof session.access_token === "string" && session.access_token.trim() !== "") {
    const payload = parseJwtPayload(session.access_token);
    if (payload) {
      if (typeof payload.session_id === "string" && payload.session_id.trim() !== "") {
        sessionId = payload.session_id.trim();
      }

      if (typeof payload.iat === "number" && Number.isFinite(payload.iat) && payload.iat > 0) {
        const d = new Date(payload.iat * 1000);
        if (!Number.isNaN(d.getTime())) {
          issuedAt = d.toISOString();
        }
      }

      if (typeof payload.exp === "number" && Number.isFinite(payload.exp) && payload.exp > 0) {
        const d = new Date(payload.exp * 1000);
        if (!Number.isNaN(d.getTime())) {
          expiresAt = d.toISOString();
        }
      }
    }
  }

  if (!issuedAt && typeof session.user.created_at === "string" && session.user.created_at.trim() !== "") {
    const d = new Date(session.user.created_at);
    if (!Number.isNaN(d.getTime())) {
      issuedAt = d.toISOString();
    }
  }

  if (!expiresAt && typeof session.expires_at === "number" && Number.isFinite(session.expires_at) && session.expires_at > 0) {
    const d = new Date(session.expires_at * 1000);
    if (!Number.isNaN(d.getTime())) {
      expiresAt = d.toISOString();
    }
  }

  return {
    status: "authenticated",
    sessionId,
    providerSubjectId: userId.trim(),
    issuedAt,
    expiresAt,
    provider: "supabase",
  };
}

/**
 * Resolves WorkspaceSession via Supabase SSR client.
 * Returns not_configured if Supabase env is missing, unauthenticated if no user,
 * or authenticated WorkspaceSession if authenticated.
 */
export async function getSupabaseWorkspaceSession(): Promise<WorkspaceSession> {
  const env = getSupabaseEnv();
  if (!env) {
    return {
      status: "not_configured",
      sessionId: null,
      providerSubjectId: null,
      issuedAt: null,
      expiresAt: null,
      provider: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      status: "not_configured",
      sessionId: null,
      providerSubjectId: null,
      issuedAt: null,
      expiresAt: null,
      provider: null,
    };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return {
      status: "unauthenticated",
      sessionId: null,
      providerSubjectId: null,
      issuedAt: null,
      expiresAt: null,
      provider: null,
    };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session ?? { user: userData.user };

  return mapSupabaseSessionToWorkspaceSession({
    ...session,
    user: userData.user,
  });
}
