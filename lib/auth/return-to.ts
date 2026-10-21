import { jurisprudencePublicSlugSchema } from "@/lib/schemas/jurisprudence-public-search-gateway";

export const DEFAULT_SAFE_RETURN_TO = "/app";
const workspaceFallback = DEFAULT_SAFE_RETURN_TO;

/**
 * Sanitizes an internal returnTo destination.
 *
 * Authorized return targets:
 * 1. Workspace routes: /app and /app/*
 * 2. Jurisprudence analysis route: /jurisprudencia/<VALID_PUBLIC_SLUG>?intent=analyze
 *
 * All other targets, including external domains, protocol-relative paths,
 * schemes, backslash redirects, unsupported intents, invalid slugs,
 * extra parameters, or canonical record identifiers fall back to "/app".
 */
export function sanitizeSafeReturnTo(value: string | null | undefined): string {
  if (!value || typeof value !== "string") return workspaceFallback;
  const candidate = value.trim();
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /%2f|%5c/i.test(candidate) ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return workspaceFallback;
  }

  try {
    decodeURIComponent(candidate);
  } catch {
    return workspaceFallback;
  }

  try {
    const parsed = new URL(candidate, "https://workspace.buholex.invalid");
    if (parsed.origin !== "https://workspace.buholex.invalid") return workspaceFallback;

    // 1. Existing workspace destinations (/app and /app/*) - preserve existing semantics
    if (parsed.pathname === "/app" || parsed.pathname.startsWith("/app/")) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    // 2. Jurisprudence analysis destination (/jurisprudencia/<valid-slug>?intent=analyze)
    const jurisMatch = /^\/jurisprudencia\/([^/]+)$/.exec(parsed.pathname);
    if (jurisMatch) {
      // Reject any fragment on the jurisprudence analysis route
      if (candidate.includes("#") || parsed.hash) return workspaceFallback;

      const rawSlug = jurisMatch[1];
      const parsedSlug = jurisprudencePublicSlugSchema.safeParse(rawSlug);
      if (!parsedSlug.success) return workspaceFallback;

      // Harden against dot-segments or normalization discrepancies (e.g. /jurisprudencia/foo/../<slug>)
      const [rawPath] = candidate.split(/[?#]/);
      if (rawPath !== `/jurisprudencia/${parsedSlug.data}`) return workspaceFallback;

      // Exact allowlisting: query must be strictly "?intent=analyze" with no additional/duplicate/canonical parameters
      if (parsed.search !== "?intent=analyze") return workspaceFallback;

      return `/jurisprudencia/${parsedSlug.data}?intent=analyze`;
    }

    return workspaceFallback;
  } catch {
    return workspaceFallback;
  }
}

export function sanitizeWorkspaceReturnTo(value: string | null | undefined): string {
  return sanitizeSafeReturnTo(value);
}

export function buildLoginRedirect(returnTo: string | null | undefined): string {
  const safeReturnTo = sanitizeSafeReturnTo(returnTo);
  return `/iniciar-sesion?${new URLSearchParams({ returnTo: safeReturnTo }).toString()}`;
}

export function buildAuth0LoginPath(returnTo: string | null | undefined): string {
  const safeReturnTo = sanitizeSafeReturnTo(returnTo);
  return `/auth/login?${new URLSearchParams({ returnTo: safeReturnTo }).toString()}`;
}

export function buildLoginPath(returnTo: string | null | undefined): string {
  const safeReturnTo = sanitizeSafeReturnTo(returnTo);
  return `/auth/login?${new URLSearchParams({ returnTo: safeReturnTo }).toString()}`;
}

export function buildLogoutPath(returnTo: string | null | undefined = DEFAULT_SAFE_RETURN_TO): string {
  const safeReturnTo = sanitizeSafeReturnTo(returnTo);
  return `/auth/logout?${new URLSearchParams({ returnTo: safeReturnTo }).toString()}`;
}
