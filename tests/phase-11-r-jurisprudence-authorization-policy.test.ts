import { describe, it, expect } from "vitest";
import {
  evaluateJurisprudenceAuthorization,
  hasEffectiveJurisprudencePermission,
  deriveEffectiveJurisprudencePermissions,
} from "@/lib/auth/jurisprudence-authorization-policy";
import {
  FIXTURE_ANONYMOUS,
  FIXTURE_TEST_ONLY,
  FIXTURE_AUTHENTICATED_READER,
  FIXTURE_AUTHENTICATED_EDITOR,
  FIXTURE_REVIEWER,
  FIXTURE_PUBLISHER,
  FIXTURE_PUBLISHER_WEAK,
  FIXTURE_AUDITOR,
  FIXTURE_ADMIN,
  FIXTURE_SYSTEM_SERVICE,
  FIXTURE_INVALID_ROLE,
} from "@/lib/auth/fixtures/jurisprudence-principal-fixtures";
import type { JurisprudencePermission } from "@/types/jurisprudence-security";


describe("Phase 11.R - Jurisprudence Authorization Policy Kernel", () => {
  const MOCK_DATE = "2026-07-30T10:00:00.000Z";

  it("1. Una operación desconocida se deniega.", () => {
    const decision = evaluateJurisprudenceAuthorization({
      principal: FIXTURE_ADMIN,
      operation: "invented_operation_123",
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("POLICY_ERROR");
  });

  it("2. Un principal inválido se deniega.", () => {
    const decision = evaluateJurisprudenceAuthorization({
      principal: { kind: "human", authenticationLevel: "authenticated" }, // missing roles
      operation: "get_public_detail",
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("INVALID_PRINCIPAL");
  });

  it("3. Un principal anónimo no puede crear registros.", () => {
    const decision = evaluateJurisprudenceAuthorization({
      principal: FIXTURE_ANONYMOUS,
      operation: "create_record",
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("AUTHENTICATION_REQUIRED");
  });

  it("4. Un principal anónimo no puede evaluar publicaciones.", () => {
    const decision = evaluateJurisprudenceAuthorization({
      principal: FIXTURE_ANONYMOUS,
      operation: "evaluate_publication",
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("AUTHENTICATION_REQUIRED");
  });

  it("5. Un principal test_only no obtiene bypass si no está habilitado allowTestPrincipals.", () => {
    const decision = evaluateJurisprudenceAuthorization({
      principal: FIXTURE_TEST_ONLY,
      operation: "search_public",
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("INVALID_PRINCIPAL");
  });

  it("6. Un reader puede ejecutar únicamente operaciones autorizadas por sus permisos.", () => {
    const decision1 = evaluateJurisprudenceAuthorization({
      principal: FIXTURE_AUTHENTICATED_READER,
      operation: "get_internal",
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    });
    expect(decision1.allowed).toBe(true);
    expect(decision1.reasonCode).toBe("ALLOWED");

    const decision2 = evaluateJurisprudenceAuthorization({
      principal: FIXTURE_AUTHENTICATED_READER,
      operation: "create_record",
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    });
    expect(decision2.allowed).toBe(false);
    expect(decision2.reasonCode).toBe("MISSING_PERMISSION");
  });

  it("7. Un reader no posee jurisprudence.internal.publish.", () => {
    expect(
      hasEffectiveJurisprudencePermission(FIXTURE_AUTHENTICATED_READER, "jurisprudence.internal.publish")
    ).toBe(false);
  });

  it("8. Un editor no recibe automáticamente jurisprudence.internal.publish.", () => {
    expect(
      hasEffectiveJurisprudencePermission(FIXTURE_AUTHENTICATED_EDITOR, "jurisprudence.internal.publish")
    ).toBe(false);
  });

  it("9. Un reviewer puede ejecutar solo operaciones asociadas a revisión.", () => {
    const decision1 = evaluateJurisprudenceAuthorization({
      principal: FIXTURE_REVIEWER,
      operation: "evaluate_publication",
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    });
    expect(decision1.allowed).toBe(true);

    const decision2 = evaluateJurisprudenceAuthorization({
      principal: FIXTURE_REVIEWER,
      operation: "update_editorial",
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    });
    expect(decision2.allowed).toBe(false);
    expect(decision2.reasonCode).toBe("MISSING_PERMISSION");
  });

  it("10. Un publisher puede poseer jurisprudence.internal.publish dentro de sus permisos efectivos.", () => {
    expect(
      hasEffectiveJurisprudencePermission(FIXTURE_PUBLISHER, "jurisprudence.internal.publish")
    ).toBe(true);
  });

  it("11. Un publisher sin nivel de autenticación suficiente es denegado.", () => {
    // Intentando realizar una operación que requiera autenticación, aunque tenga el rol, carece de authLevel
    const decision = evaluateJurisprudenceAuthorization({
      principal: FIXTURE_PUBLISHER_WEAK,
      operation: "get_internal",
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("AUTHENTICATION_REQUIRED");
  });

  it("12. Un auditor no puede modificar ni publicar.", () => {
    expect(hasEffectiveJurisprudencePermission(FIXTURE_AUDITOR, "jurisprudence.internal.publish")).toBe(false);
    expect(hasEffectiveJurisprudencePermission(FIXTURE_AUDITOR, "jurisprudence.internal.update_editorial")).toBe(false);

    // Y no puede operar sobre esas rutas
    const decision = evaluateJurisprudenceAuthorization({
      principal: FIXTURE_AUDITOR,
      operation: "update_editorial",
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    });
    expect(decision.allowed).toBe(false);
  });

  it("13. Un admin recibe únicamente permisos definidos por la matriz, no permisos inventados.", () => {
    const perms = deriveEffectiveJurisprudencePermissions(FIXTURE_ADMIN);
    expect(perms.has("jurisprudence.internal.close_service")).toBe(true);
    // Cast to check negative
    expect(perms.has("jurisprudence.internal.unknown" as unknown as JurisprudencePermission)).toBe(false);
  });

  it("14. system_service se limita a operaciones expresamente permitidas.", () => {
    const decisionCreate = evaluateJurisprudenceAuthorization({
      principal: FIXTURE_SYSTEM_SERVICE,
      operation: "create_record",
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    });
    expect(decisionCreate.allowed).toBe(true);

    const decisionHistory = evaluateJurisprudenceAuthorization({
      principal: FIXTURE_SYSTEM_SERVICE,
      operation: "get_history", // service role doesn't have read_history in the default matrix implementation
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    });
    expect(decisionHistory.allowed).toBe(false);
  });

  it("15. La política aplica default deny con roles inválidos.", () => {
    const decision = evaluateJurisprudenceAuthorization({
      principal: FIXTURE_INVALID_ROLE,
      operation: "get_internal",
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("MISSING_PERMISSION");
  });

  it("16. Autenticación no equivale a autorización.", () => {
    const decision = evaluateJurisprudenceAuthorization({
      principal: {
        kind: "human",
        subjectId: "foo",
        authenticationLevel: "authenticated",
        roles: [],
        issuedAt: MOCK_DATE,
      },
      operation: "create_record",
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe("MISSING_PERMISSION");
  });

  it("17. Dos invocaciones iguales producen decisiones profundamente iguales.", () => {
    const input = {
      principal: FIXTURE_AUTHENTICATED_EDITOR,
      operation: "update_editorial",
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    };
    const decision1 = evaluateJurisprudenceAuthorization(input);
    const decision2 = evaluateJurisprudenceAuthorization(input);
    expect(decision1).toEqual(decision2);
  });

  it("18. El input no se muta.", () => {
    const inputStr = JSON.stringify(FIXTURE_AUTHENTICATED_EDITOR);
    evaluateJurisprudenceAuthorization({
      principal: FIXTURE_AUTHENTICATED_EDITOR,
      operation: "update_editorial",
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    });
    expect(JSON.stringify(FIXTURE_AUTHENTICATED_EDITOR)).toBe(inputStr);
  });

  it("19. La salida es JSON serializable.", () => {
    const decision = evaluateJurisprudenceAuthorization({
      principal: FIXTURE_AUTHENTICATED_EDITOR,
      operation: "update_editorial",
      evaluatedAt: MOCK_DATE,
      allowTestPrincipals: false,
    });
    const serialized = JSON.stringify(decision);
    const parsed = JSON.parse(serialized);
    expect(parsed).toEqual(decision);
  });
});
