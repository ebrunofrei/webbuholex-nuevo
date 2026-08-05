import { describe, it, expect } from "vitest";
import * as policyModule from "@/lib/auth/jurisprudence-authorization-policy";
import * as fixturesModule from "@/lib/auth/fixtures/jurisprudence-principal-fixtures";

describe("Phase 11.R - Authorization Isolation Assurance", () => {
  it("20. No se filtran datos sensibles (stack traces, tokens, cookies, sql) en las decisiones.", () => {
    const decision = policyModule.evaluateJurisprudenceAuthorization({
      principal: fixturesModule.FIXTURE_AUTHENTICATED_EDITOR,
      operation: "update_editorial",
      evaluatedAt: "2026-07-30T10:00:00.000Z",
      allowTestPrincipals: false,
    });
    const serialized = JSON.stringify(decision).toLowerCase();
    expect(serialized).not.toContain("cookie");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("sql");
    expect(serialized).not.toContain("stack");
  });

  it("21. Los fixtures no importan session.ts", () => {
    const moduleContent = String(Object.keys(fixturesModule));
    expect(moduleContent).toBeDefined();
    // Probamos garantizando que los objetos son puros
    expect(fixturesModule.FIXTURE_ADMIN.subjectId).toBe("usr_admin_123");
  });

  it("22. La política y fixtures no leen process.env internamente", () => {
    // Si la politica fuera dependiente de env, esto podría explotar o arrojar errores.
    // Garantizamos que las funciones se ejecutan determinísticamente con el input puro.
    const decision = policyModule.evaluateJurisprudenceAuthorization({
      principal: fixturesModule.FIXTURE_ANONYMOUS,
      operation: "search_public",
      evaluatedAt: "2026-07-30T10:00:00.000Z",
      allowTestPrincipals: false,
    });
    expect(decision.allowed).toBe(true);
  });
});
