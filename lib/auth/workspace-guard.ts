import { redirect } from "next/navigation";
import { buildLoginRedirect, sanitizeWorkspaceReturnTo } from "@/lib/auth/return-to";
import { getWorkspaceSession } from "@/lib/auth/session";
import type { WorkspaceGuardDecision } from "@/types/auth";

export function evaluateWorkspaceAccess(returnTo: string): WorkspaceGuardDecision {
  const session = getWorkspaceSession();
  const safeReturnTo = sanitizeWorkspaceReturnTo(returnTo);
  const allowed = session.status === "authenticated";
  return { allowed, status: session.status, redirectTo: allowed ? null : buildLoginRedirect(safeReturnTo), returnTo: safeReturnTo };
}

export function requireWorkspaceSession(returnTo: string): void {
  const decision = evaluateWorkspaceAccess(returnTo);
  if (!decision.allowed && decision.redirectTo) redirect(decision.redirectTo);
}
