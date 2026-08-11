import { redirect } from "next/navigation";
import { buildLoginRedirect, sanitizeWorkspaceReturnTo } from "@/lib/auth/return-to";
import { getWorkspaceSession } from "@/lib/auth/session";
import type { WorkspaceGuardDecision } from "@/types/auth";

export async function evaluateWorkspaceAccess(returnTo: string): Promise<WorkspaceGuardDecision> {
  const session = await getWorkspaceSession();
  const safeReturnTo = sanitizeWorkspaceReturnTo(returnTo);
  const allowed = session.status === "authenticated";
  return { allowed, status: session.status, redirectTo: allowed ? null : buildLoginRedirect(safeReturnTo), returnTo: safeReturnTo };
}

export async function requireWorkspaceSession(returnTo: string): Promise<void> {
  const decision = await evaluateWorkspaceAccess(returnTo);
  if (!decision.allowed && decision.redirectTo) redirect(decision.redirectTo);
}
