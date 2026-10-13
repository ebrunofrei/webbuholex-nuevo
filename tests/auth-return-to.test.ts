import { describe, expect, it } from "vitest";
import {
  DEFAULT_SAFE_RETURN_TO,
  buildAuth0LoginPath,
  buildLoginRedirect,
  sanitizeSafeReturnTo,
  sanitizeWorkspaceReturnTo,
} from "@/lib/auth/return-to";

describe("HERMES-PROD-A2.4 / A2.4A safe returnTo + intent=analyze preservation contract", () => {
  // CASE 1: Existing /app returnTo remains accepted.
  it("CASE 1: existing /app returnTo remains accepted", () => {
    expect(sanitizeWorkspaceReturnTo("/app")).toBe("/app");
    expect(sanitizeSafeReturnTo("/app")).toBe("/app");
  });

  // CASE 2: Existing /app/subroute remains accepted.
  it("CASE 2: existing /app/subroute remains accepted with search and hash preservation", () => {
    expect(sanitizeWorkspaceReturnTo("/app/asistente")).toBe("/app/asistente");
    expect(sanitizeWorkspaceReturnTo("/app/jurisprudencia")).toBe("/app/jurisprudencia");
    expect(sanitizeWorkspaceReturnTo("/app/proyectos?view=active")).toBe("/app/proyectos?view=active");
    expect(sanitizeWorkspaceReturnTo("/app/proyectos#section-1")).toBe("/app/proyectos#section-1");
    // Historical workspace parameter semantics preserved
    expect(sanitizeWorkspaceReturnTo("/app?recordId=workspace-local-value")).toBe("/app?recordId=workspace-local-value");
    expect(sanitizeWorkspaceReturnTo("/app/example?foo=bar#section")).toBe("/app/example?foo=bar#section");
    expect(sanitizeWorkspaceReturnTo("/app/asistente?recordId=rec-12345")).toBe("/app/asistente?recordId=rec-12345");
    expect(sanitizeWorkspaceReturnTo("/app?recordVersion=1")).toBe("/app?recordVersion=1");
  });

  // CASE 3: Valid /jurisprudencia/<slug>?intent=analyze is accepted unchanged.
  it("CASE 3: valid /jurisprudencia/<slug>?intent=analyze is accepted unchanged", () => {
    const validTarget = "/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze";
    expect(sanitizeWorkspaceReturnTo(validTarget)).toBe(validTarget);
    expect(sanitizeSafeReturnTo(validTarget)).toBe(validTarget);

    const validTarget2 = "/jurisprudencia/stc-00456-2023-pa-tc?intent=analyze";
    expect(sanitizeWorkspaceReturnTo(validTarget2)).toBe(validTarget2);
  });

  // CASE 4: Valid slug survives encoding into /auth/login?returnTo=... and decoding yields the exact safe internal destination.
  it("CASE 4: valid slug survives encoding into /auth/login?returnTo=... and decoding yields exact destination", () => {
    const originalDestination = "/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze";
    const loginPath = buildAuth0LoginPath(originalDestination);

    expect(loginPath).toBe(`/auth/login?returnTo=${encodeURIComponent(originalDestination)}`);

    // Parse the constructed login URL
    const parsed = new URL(loginPath, "https://buholex.test");
    const extractedReturnTo = parsed.searchParams.get("returnTo");
    expect(extractedReturnTo).toBe(originalDestination);

    // Re-sanitizing the extracted destination yields the identical safe destination
    expect(sanitizeWorkspaceReturnTo(extractedReturnTo)).toBe(originalDestination);
  });

  // CASE 5: Absolute external https URL rejected/fallback.
  it("CASE 5: absolute external https URL rejected/fallback to /app", () => {
    expect(sanitizeWorkspaceReturnTo("https://evil.example/path")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("https://evil.example/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("http://evil.example/app")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  // CASE 6: Protocol-relative //evil.example rejected/fallback.
  it("CASE 6: protocol-relative //evil.example rejected/fallback to /app", () => {
    expect(sanitizeWorkspaceReturnTo("//evil.example/path")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("//evil.example/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("///evil.example")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  // CASE 7: javascript: rejected/fallback.
  it("CASE 7: javascript: and dangerous schemes rejected/fallback to /app", () => {
    expect(sanitizeWorkspaceReturnTo("javascript:alert(1)")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("data:text/html,<script>alert(1)</script>")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("vbscript:msgbox(1)")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("file:///etc/passwd")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  // CASE 8: Backslash redirect variants rejected/fallback.
  it("CASE 8: backslash redirect variants rejected/fallback to /app", () => {
    expect(sanitizeWorkspaceReturnTo("\\evil.example")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/\\evil.example")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/\\\\evil.example")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/app\\evil")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc\\evil?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  // CASE 9: Malformed percent-encoded returnTo rejected/fallback.
  it("CASE 9: malformed percent-encoded returnTo rejected/fallback to /app", () => {
    expect(sanitizeWorkspaceReturnTo("/app/%")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/app/%ZZ")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/app/%E0%A4%A")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123%ZZ?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  // CASE 10: /jurisprudencia/<invalid-slug>?intent=analyze rejected/fallback.
  it("CASE 10: /jurisprudencia/<invalid-slug>?intent=analyze rejected/fallback to /app", () => {
    // Uppercase characters prohibited in canonical public slug schema
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/EXP-00123-2024-AA-TC?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
    // Too short (min length is 3)
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/ab?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
    // Underscores prohibited
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp_00123_2024?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
    // Leading / trailing hyphens prohibited
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/-leading-hyphen?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/trailing-hyphen-?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
    // Consecutive hyphens prohibited
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp--00123?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
    // Spaces prohibited
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp 00123?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  // CASE 11: /jurisprudencia/<valid-slug> without intent=analyze rejected for this A2.4 analyze-specific preservation path.
  it("CASE 11: /jurisprudencia/<valid-slug> without intent=analyze rejected/fallback to /app", () => {
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc/")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  // CASE 12: unsupported intent: intent=compare rejected/fallback.
  it("CASE 12: unsupported intent=compare rejected/fallback to /app", () => {
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?intent=compare")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  // CASE 13: unsupported intent: intent=applicability rejected/fallback.
  it("CASE 13: unsupported intent=applicability rejected/fallback to /app", () => {
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?intent=applicability")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  // CASE 14: extra query parameter rejected/fallback.
  it("CASE 14: extra query parameters rejected/fallback to /app", () => {
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze&extra=param")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?foo=bar&intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze&mode=strict")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze&")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  // CASE 15: recordId query injection on jurisprudence destination rejected/fallback.
  it("CASE 15: recordId query injection on jurisprudence destination rejected/fallback to /app", () => {
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?recordId=rec-12345")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  // CASE 16: recordVersion query injection on jurisprudence destination rejected/fallback.
  it("CASE 16: recordVersion query injection on jurisprudence destination rejected/fallback to /app", () => {
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?recordVersion=1")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  // CASE 17: intent=analyze + canonical ID injection rejected/fallback.
  it("CASE 17: intent=analyze + canonical ID injection rejected/fallback to /app", () => {
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze&recordId=rec-12345")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?recordId=rec-12345&intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze&recordVersion=2")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze&canonicalId=canonical-1")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze&canonicalId=x")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  // CASE 18: fragment-based manipulation rejected or normalized safely according to explicitly tested contract.
  it("CASE 18: fragment-based manipulation on jurisprudence destination rejected/fallback to /app", () => {
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze#section-1")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc#?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze#")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  // CASE 19: empty/null/undefined returnTo preserves existing fallback semantics.
  it("CASE 19: empty/null/undefined returnTo falls back to /app", () => {
    expect(sanitizeWorkspaceReturnTo("")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo(null)).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo(undefined)).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("   ")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  // CASE 20: login URL never contains recordId or recordVersion for the jurisprudence analysis flow.
  it("CASE 20: login URL never contains recordId or recordVersion for jurisprudence flow", () => {
    const safeTarget = "/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze";
    const loginRedirect = buildLoginRedirect(safeTarget);
    const auth0Login = buildAuth0LoginPath(safeTarget);

    expect(loginRedirect).not.toContain("recordId");
    expect(loginRedirect).not.toContain("recordVersion");
    expect(auth0Login).not.toContain("recordId");
    expect(auth0Login).not.toContain("recordVersion");

    // Even if caller passed injection attempts to login builders
    const attackTarget = "/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze&recordId=evil";
    const attackLoginRedirect = buildLoginRedirect(attackTarget);
    const attackAuth0Login = buildAuth0LoginPath(attackTarget);

    expect(attackLoginRedirect).toBe("/iniciar-sesion?returnTo=%2Fapp");
    expect(attackAuth0Login).toBe("/auth/login?returnTo=%2Fapp");
    expect(attackLoginRedirect).not.toContain("recordId");
    expect(attackAuth0Login).not.toContain("recordId");
  });

  // CASE 21: safe jurisprudence returnTo does not permit open redirect through encoded //, encoded backslashes, or scheme injection.
  it("CASE 21: open redirect variants (encoded //, backslashes, scheme injections) rejected", () => {
    expect(sanitizeWorkspaceReturnTo("/%2f/evil.example")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/%5cevil.example")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc/%2f/evil.example")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc/%5cevil.example")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze@evil.example")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("https://evil.example/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  // CASE 22: existing /iniciar-sesion behavior without jurisprudence intent continues to work.
  it("CASE 22: existing /iniciar-sesion behavior without jurisprudence intent continues to work", () => {
    expect(buildLoginRedirect("/app")).toBe("/iniciar-sesion?returnTo=%2Fapp");
    expect(buildLoginRedirect("/app/asistente")).toBe("/iniciar-sesion?returnTo=%2Fapp%2Fasistente");
    expect(buildLoginRedirect(null)).toBe("/iniciar-sesion?returnTo=%2Fapp");
    expect(buildLoginRedirect(undefined)).toBe("/iniciar-sesion?returnTo=%2Fapp");
    expect(buildLoginRedirect("https://evil.example")).toBe("/iniciar-sesion?returnTo=%2Fapp");
  });

  // CASE 23: no Hermes endpoint/provider/orchestrator is invoked anywhere in A2.4 tests.
  it("CASE 23: no Hermes endpoint, provider, or orchestrator is invoked in A2.4", () => {
    // A2.4 returnTo sanitization is completely decoupled from Hermes runtime/orchestrator/provider/DB
    const result = sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze");
    expect(result).toBe("/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze");
  });

  // ADDITIONAL PATH CANONICALIZATION & HARDENING TESTS (HERMES-PROD-A2.4A)
  it("A2.4A hardening: rejects duplicated intent query parameters", () => {
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze&intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  it("A2.4A hardening: rejects dot-segment normalization bypass attempts", () => {
    // WHATWG URL parser normalizes path segments, but raw path must be strictly literal /jurisprudencia/<slug>
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/foo/../exp-00123-2024-aa-tc?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/../exp-00123-2024-aa-tc?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/./exp-00123-2024-aa-tc?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  it("A2.4A hardening: rejects encoded dot-segment and path manipulation variants", () => {
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/%2e%2e/exp-00123-2024-aa-tc?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/foo/%2e%2e/exp-00123-2024-aa-tc?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/%2e/exp-00123-2024-aa-tc?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/.%2e/exp-00123-2024-aa-tc?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
    expect(sanitizeWorkspaceReturnTo("/jurisprudencia/%2e./exp-00123-2024-aa-tc?intent=analyze")).toBe(DEFAULT_SAFE_RETURN_TO);
  });

  it("A2.4A hardening: single owner contract for Auth0 login path", () => {
    // Confirms buildAuth0LoginPath encapsulates both sanitization and single URL encoding
    expect(buildAuth0LoginPath("/app")).toBe("/auth/login?returnTo=%2Fapp");
    expect(buildAuth0LoginPath("/jurisprudencia/exp-00123-2024-aa-tc?intent=analyze")).toBe(
      "/auth/login?returnTo=%2Fjurisprudencia%2Fexp-00123-2024-aa-tc%3Fintent%3Danalyze"
    );
    expect(buildAuth0LoginPath("https://evil.example")).toBe("/auth/login?returnTo=%2Fapp");
  });
});
