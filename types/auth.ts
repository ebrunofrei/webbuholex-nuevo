export type AuthStatus = "authenticated" | "unauthenticated" | "loading" | "not_configured";

export interface WorkspaceSession {
  status: AuthStatus;
  sessionId: string | null;
  providerSubjectId: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  provider: "auth0" | null;
}

export interface WorkspaceGuardDecision {
  allowed: boolean;
  status: AuthStatus;
  redirectTo: string | null;
  returnTo: string;
}
