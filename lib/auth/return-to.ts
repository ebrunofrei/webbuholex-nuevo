const workspaceFallback = "/app";

export function sanitizeWorkspaceReturnTo(value: string | null | undefined): string {
  if (!value) return workspaceFallback;
  const candidate = value.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\") || /%2f|%5c/i.test(candidate) || /[\u0000-\u001f\u007f]/.test(candidate)) return workspaceFallback;

  try {
    const parsed = new URL(candidate, "https://workspace.buholex.invalid");
    if (parsed.origin !== "https://workspace.buholex.invalid") return workspaceFallback;
    if (parsed.pathname !== "/app" && !parsed.pathname.startsWith("/app/")) return workspaceFallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return workspaceFallback;
  }
}

export function buildLoginRedirect(returnTo: string | null | undefined): string {
  const safeReturnTo = sanitizeWorkspaceReturnTo(returnTo);
  return `/iniciar-sesion?${new URLSearchParams({ returnTo: safeReturnTo }).toString()}`;
}
