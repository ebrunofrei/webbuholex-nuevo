// @vitest-environment node

import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { publicServices } from "@/data/services";
import { AnonymousJurisprudenceAuthenticator } from "@/lib/jurisprudence-authentication-port";
import {
  JURISPRUDENCE_OPERATION_PERMISSIONS,
  JURISPRUDENCE_ROLE_PERMISSIONS,
  authorizeJurisprudenceOperation,
  defaultJurisprudenceAuthorizationPolicy,
  getPermissionsForJurisprudenceRoles,
  hasJurisprudencePermission,
  isJurisprudencePrincipalExpired,
  validateJurisprudencePrincipal,
} from "@/lib/jurisprudence-authorization-policy";
import { createJurisprudenceInternalApi } from "@/lib/jurisprudence-application-factory";
import { InMemoryJurisprudenceRepository } from "@/lib/in-memory-jurisprudence-repository";
import { createJurisprudenceRouteHandlers } from "@/lib/jurisprudence-route-handler-factory";
import { evaluateJurisprudenceRouteMountReadiness } from "@/lib/jurisprudence-route-readiness";
import {
  createAnonymousPublicJurisprudenceRouteHandlers,
  createSecuredJurisprudenceRouteHandlers,
} from "@/lib/jurisprudence-secured-handler-factory";
import { jurisprudencePermissionSchema, jurisprudencePrincipalSchema } from "@/lib/schemas/jurisprudence-security";
import { SqliteJurisprudenceRepository } from "@/lib/sqlite-jurisprudence-repository";
import { createFictitiousJurisprudenceRecord } from "@/tests/helpers/jurisprudence-record-fixture";
import { TestJurisprudenceAuthenticator } from "@/tests/helpers/test-jurisprudence-authenticator";
import type { JurisprudenceRouteHandlers } from "@/types/jurisprudence-http";
import type { JurisprudenceNewRecord, JurisprudenceRepositoryDependencies } from "@/types/jurisprudence-repository";
import type {
  JurisprudenceAuthenticationResult,
  JurisprudencePrincipal,
  JurisprudenceRole,
  JurisprudenceSecurityLogEvent,
  SecuredJurisprudenceRouteHandlers,
} from "@/types/jurisprudence-security";

const NOW = "2026-07-29T18:00:00.000Z";

function principal(
  roles: readonly JurisprudenceRole[],
  overrides: { subjectId?: string | null; expiresAt?: string } = {},
): JurisprudencePrincipal {
  return {
    kind: "human",
    subjectId: overrides.subjectId ?? "opaque-test-subject-11e",
    roles,
    authenticationLevel: "test_only",
    issuedAt: "2026-07-29T17:00:00.000Z",
    provider: "test_harness",
    ...(overrides.expiresAt === undefined ? {} : { expiresAt: overrides.expiresAt }),
  };
}

function authenticated(
  roles: readonly JurisprudenceRole[],
  overrides: { subjectId?: string | null; expiresAt?: string } = {},
): JurisprudenceAuthenticationResult {
  return { status: "authenticated", principal: principal(roles, overrides) };
}

function request(url = "https://not-mounted.invalid/jurisprudence", init: RequestInit = {}): Request {
  return new Request(url, { ...init, headers: new Headers(init.headers) });
}

function bodyRequest(body: unknown, method: "POST" | "PUT" = "POST", headers: Record<string, string> = {}): Request {
  return request("https://not-mounted.invalid/jurisprudence", {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function payload(response: Response): Promise<Record<string, unknown>> {
  return response.json() as Promise<Record<string, unknown>>;
}

async function responseRecordId(response: Response): Promise<string> {
  const body = await payload(response);
  const data = body.data;
  if (data === null || typeof data !== "object" || !("id" in data) || typeof data.id !== "string") {
    throw new Error(`La respuesta no contiene un id seguro: ${JSON.stringify(body)}`);
  }
  return data.id;
}

function dependencies(prefix: string): JurisprudenceRepositoryDependencies {
  let id = 0;
  let second = 0;
  return {
    generateId: () => `${prefix}-security-${++id}`,
    now: () => new Date(Date.UTC(2026, 6, 29, 18, 0, second++)).toISOString(),
  };
}

function securityRecord(seed: number): JurisprudenceNewRecord {
  const record = createFictitiousJurisprudenceRecord(seed);
  return { ...record, search: { ...record.search, editorialRelevance: seed % 101 } };
}

function publicSecurityRecord(seed: number): JurisprudenceNewRecord {
  const record = securityRecord(seed);
  return {
    ...record,
    editorialStatus: "verified",
    publicationStatus: "published",
    source: {
      ...record.source,
      type: "official_judiciary",
      name: "Fuente oficial ficticia exclusiva para pruebas",
      url: `https://official-source.invalid/security-${seed}`,
      publishedAt: "2026-01-15T00:00:00.000Z",
      retrievedAt: "2026-07-29T10:00:00.000Z",
      verificationStatus: "verified",
      verifiedAt: "2026-07-29T10:30:00.000Z",
      verifiedBy: "opaque-test-verifier",
      verificationNotes: "Verificación ficticia exclusiva de tests.",
      evidenceReference: `TEST-SECURITY-EVIDENCE-${seed}`,
    },
  };
}

function baseHandlers(repository: InMemoryJurisprudenceRepository | SqliteJurisprudenceRepository): JurisprudenceRouteHandlers {
  return createJurisprudenceRouteHandlers({
    api: createJurisprudenceInternalApi({ repository }),
    now: () => NOW,
    requestIdGenerator: () => "security_http_request_11e",
  });
}

function countingHandlers() {
  const calls = {
    search: 0,
    create: 0,
  };
  const success = () => Promise.resolve(new Response(JSON.stringify({ ok: true, data: {}, meta: { requestId: "counting_request", generatedAt: NOW } }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  }));
  const handlers: JurisprudenceRouteHandlers = {
    public: {
      search: () => { calls.search += 1; return success(); },
      detail: () => success(),
    },
    internal: {
      create: () => { calls.create += 1; return success(); },
      update: () => success(),
      getInternal: () => success(),
      listInternal: () => success(),
      history: () => success(),
      evaluatePublication: () => success(),
    },
    close: () => Promise.resolve(),
  };
  return { handlers, calls };
}

interface OpenedSecurityHandlers {
  secured: SecuredJurisprudenceRouteHandlers;
  logs: JurisprudenceSecurityLogEvent[];
}

const opened: SecuredJurisprudenceRouteHandlers[] = [];
function secure(
  handlers: JurisprudenceRouteHandlers,
  result: JurisprudenceAuthenticationResult,
  allowTestPrincipals = true,
): OpenedSecurityHandlers {
  const logs: JurisprudenceSecurityLogEvent[] = [];
  const secured = createSecuredJurisprudenceRouteHandlers({
    handlers,
    authenticator: new TestJurisprudenceAuthenticator(result),
    authorizationPolicy: defaultJurisprudenceAuthorizationPolicy,
    allowTestPrincipals,
    clock: () => NOW,
    requestIdGenerator: () => "security_request_11e",
    logger: { log: (event) => logs.push(event) },
  });
  opened.push(secured);
  return { secured, logs };
}

afterEach(async () => {
  await Promise.all(opened.splice(0).map((handlers) => handlers.close()));
});

describe("principal y autenticación jurisprudencial", () => {
  it("acepta un principal opaco, tipado y sin datos personales", () => {
    expect(jurisprudencePrincipalSchema.parse(principal(["jurisprudence_reader"]))).toMatchObject({ kind: "human" });
  });

  it("acepta un principal service opaco y explícito", () => {
    const service: JurisprudencePrincipal = {
      kind: "service",
      subjectId: "opaque-service-subject-11e",
      roles: ["system_service"],
      authenticationLevel: "authenticated",
      issuedAt: NOW,
      provider: "future_identity_provider",
    };
    expect(validateJurisprudencePrincipal(service)).toBe(true);
  });

  it("exige que anonymous carezca de subjectId, roles y proveedor", () => {
    expect(validateJurisprudencePrincipal({ kind: "anonymous", subjectId: null, roles: [], authenticationLevel: "anonymous", issuedAt: NOW })).toBe(true);
    expect(validateJurisprudencePrincipal({ kind: "anonymous", subjectId: "forbidden-subject", roles: [], authenticationLevel: "anonymous", issuedAt: NOW })).toBe(false);
  });

  it("rechaza roles desconocidos y propiedades adicionales", () => {
    expect(jurisprudencePrincipalSchema.safeParse({ ...principal([]), roles: ["root"] }).success).toBe(false);
    expect(jurisprudencePrincipalSchema.safeParse({ ...principal([]), email: "not-allowed@example.invalid" }).success).toBe(false);
  });

  it("rechaza permisos desconocidos", () => {
    expect(jurisprudencePermissionSchema.safeParse("jurisprudence.internal.everything").success).toBe(false);
  });

  it("rechaza subjectId con apariencia de correo", () => {
    expect(jurisprudencePrincipalSchema.safeParse(principal([], { subjectId: "person@example.invalid" })).success).toBe(false);
  });

  it("distingue expiración sin mutar el principal", () => {
    const expiring = principal([], { expiresAt: "2026-07-29T17:30:00.000Z" });
    expect(isJurisprudencePrincipalExpired(expiring, NOW)).toBe(true);
    expect(expiring.expiresAt).toBe("2026-07-29T17:30:00.000Z");
  });

  it("el autenticador anónimo ignora headers de identidad", async () => {
    const authenticator = new AnonymousJurisprudenceAuthenticator(() => NOW);
    const result = await authenticator.authenticate();
    expect(result).toEqual({ status: "anonymous", principal: { kind: "anonymous", subjectId: null, roles: [], authenticationLevel: "anonymous", issuedAt: NOW } });
  });
});

describe("matriz role-permission y default deny", () => {
  const expectedPermissions: Readonly<Record<JurisprudenceRole, readonly string[]>> = {
    jurisprudence_reader: ["jurisprudence.public.search", "jurisprudence.public.read_detail", "jurisprudence.internal.list", "jurisprudence.internal.read"],
    jurisprudence_editor: ["jurisprudence.public.search", "jurisprudence.public.read_detail", "jurisprudence.internal.list", "jurisprudence.internal.read", "jurisprudence.internal.create", "jurisprudence.internal.update_editorial"],
    jurisprudence_reviewer: ["jurisprudence.public.search", "jurisprudence.public.read_detail", "jurisprudence.internal.list", "jurisprudence.internal.read", "jurisprudence.internal.read_history", "jurisprudence.internal.evaluate_publication"],
    jurisprudence_publisher: ["jurisprudence.public.search", "jurisprudence.public.read_detail", "jurisprudence.internal.list", "jurisprudence.internal.read", "jurisprudence.internal.read_history", "jurisprudence.internal.evaluate_publication", "jurisprudence.internal.publish", "jurisprudence.internal.unpublish"],
    jurisprudence_auditor: ["jurisprudence.internal.list", "jurisprudence.internal.read", "jurisprudence.internal.read_history", "jurisprudence.internal.audit"],
    jurisprudence_admin: ["jurisprudence.public.search", "jurisprudence.public.read_detail", "jurisprudence.internal.list", "jurisprudence.internal.read", "jurisprudence.internal.read_history", "jurisprudence.internal.evaluate_publication", "jurisprudence.internal.create", "jurisprudence.internal.update_editorial", "jurisprudence.internal.update_source", "jurisprudence.internal.publish", "jurisprudence.internal.unpublish", "jurisprudence.internal.audit", "jurisprudence.internal.close_service"],
    system_service: ["jurisprudence.internal.list", "jurisprudence.internal.read", "jurisprudence.internal.close_service"],
  };
  const roleCases: readonly JurisprudenceRole[] = [
    "jurisprudence_reader",
    "jurisprudence_editor",
    "jurisprudence_reviewer",
    "jurisprudence_publisher",
    "jurisprudence_auditor",
    "jurisprudence_admin",
    "system_service",
  ];

  it.each(roleCases)(
    "mantiene exacta la matriz para %s",
    (role) => {
      expect([...JURISPRUDENCE_ROLE_PERMISSIONS[role]].sort()).toEqual([...expectedPermissions[role]].sort());
    },
  );

  it("no contiene comodines", () => {
    expect(JSON.stringify(JURISPRUDENCE_ROLE_PERMISSIONS)).not.toContain("*");
  });

  it("mapea cada operación a un permiso explícito", () => {
    expect(Object.keys(JURISPRUDENCE_OPERATION_PERMISSIONS)).toHaveLength(10);
    expect(JURISPRUDENCE_OPERATION_PERMISSIONS.update_source).toBe("jurisprudence.internal.update_source");
  });

  it("documenta cada permiso enumerado en al menos un rol", () => {
    const documented = new Set(Object.values(expectedPermissions).flat());
    expect(jurisprudencePermissionSchema.options.filter((permission) => !documented.has(permission))).toEqual([]);
  });

  it("concede al lector solo lectura pública e interna básica", () => {
    const permissions = getPermissionsForJurisprudenceRoles(["jurisprudence_reader"]);
    expect(permissions.has("jurisprudence.internal.read")).toBe(true);
    expect(permissions.has("jurisprudence.internal.create")).toBe(false);
  });

  it("separa actualización editorial y de fuente", () => {
    const editor = principal(["jurisprudence_editor"]);
    expect(hasJurisprudencePermission(editor, "jurisprudence.internal.update_editorial")).toBe(true);
    expect(hasJurisprudencePermission(editor, "jurisprudence.internal.update_source")).toBe(false);
  });

  it("el auditor carece de mutación", () => {
    const permissions = getPermissionsForJurisprudenceRoles(["jurisprudence_auditor"]);
    expect(permissions.has("jurisprudence.internal.audit")).toBe(true);
    expect(permissions.has("jurisprudence.internal.create")).toBe(false);
  });

  it("reviewer evalúa e inspecciona historial, pero no crea", () => {
    const reviewer = principal(["jurisprudence_reviewer"]);
    expect(hasJurisprudencePermission(reviewer, "jurisprudence.internal.evaluate_publication")).toBe(true);
    expect(hasJurisprudencePermission(reviewer, "jurisprudence.internal.read_history")).toBe(true);
    expect(hasJurisprudencePermission(reviewer, "jurisprudence.internal.create")).toBe(false);
  });

  it("publisher solo reserva permisos sin crear handlers inexistentes", () => {
    const permissions = getPermissionsForJurisprudenceRoles(["jurisprudence_publisher"]);
    expect(permissions.has("jurisprudence.internal.publish")).toBe(true);
    expect(JURISPRUDENCE_OPERATION_PERMISSIONS).not.toHaveProperty("publish");
  });

  it("system_service conserva un conjunto mínimo", () => {
    expect([...getPermissionsForJurisprudenceRoles(["system_service"])].sort()).toEqual([
      "jurisprudence.internal.close_service",
      "jurisprudence.internal.list",
      "jurisprudence.internal.read",
    ]);
  });

  it("admin enumera permisos sin bypass", () => {
    const permissions = getPermissionsForJurisprudenceRoles(["jurisprudence_admin"]);
    expect(permissions.has("jurisprudence.internal.close_service")).toBe(true);
    expect([...permissions]).not.toContain("*");
  });

  it("permite solo las dos operaciones públicas al anónimo", () => {
    const anonymous: JurisprudencePrincipal = { kind: "anonymous", subjectId: null, roles: [], authenticationLevel: "anonymous", issuedAt: NOW };
    expect(authorizeJurisprudenceOperation({ principal: anonymous, operation: "search_public", evaluatedAt: NOW, allowTestPrincipals: false })).toMatchObject({ allowed: true, reasonCode: "ANONYMOUS_ALLOWED" });
    expect(authorizeJurisprudenceOperation({ principal: anonymous, operation: "list_internal", evaluatedAt: NOW, allowTestPrincipals: false })).toMatchObject({ allowed: false, reasonCode: "AUTHENTICATION_REQUIRED" });
  });

  it("ninguna operación interna queda accidentalmente pública", () => {
    const anonymous: JurisprudencePrincipal = { kind: "anonymous", subjectId: null, roles: [], authenticationLevel: "anonymous", issuedAt: NOW };
    const internalOperations = [
      "list_internal",
      "get_internal",
      "create_record",
      "update_editorial",
      "update_source",
      "evaluate_publication",
      "get_history",
      "close",
    ] as const;
    for (const operation of internalOperations) {
      expect(authorizeJurisprudenceOperation({ principal: anonymous, operation, evaluatedAt: NOW, allowTestPrincipals: false }).allowed).toBe(false);
    }
  });

  it("test_only requiere habilitación explícita", () => {
    expect(authorizeJurisprudenceOperation({ principal: principal(["jurisprudence_reader"]), operation: "list_internal", evaluatedAt: NOW, allowTestPrincipals: false })).toMatchObject({ allowed: false, reasonCode: "INVALID_PRINCIPAL" });
  });

  it("deniega principal expirado", () => {
    const decision = authorizeJurisprudenceOperation({ principal: principal(["jurisprudence_admin"], { expiresAt: "2026-07-29T17:30:00.000Z" }), operation: "create_record", evaluatedAt: NOW, allowTestPrincipals: true });
    expect(decision).toMatchObject({ allowed: false, reasonCode: "EXPIRED_PRINCIPAL" });
  });
});

describe("guard no montado", () => {
  it("permite búsqueda pública anónima y conserva requestId", async () => {
    const handlers = baseHandlers(new InMemoryJurisprudenceRepository(dependencies("anonymous")));
    const { secured } = secure(handlers, { status: "anonymous", principal: { kind: "anonymous", subjectId: null, roles: [], authenticationLevel: "anonymous", issuedAt: NOW } });
    const response = await secured.public.search(request("https://not-mounted.invalid/search", { headers: { "x-request-id": "valid_request_11e" } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("valid_request_11e");
  });

  it("permite detalle público al anónimo", async () => {
    const counted = countingHandlers();
    const { secured } = secure(counted.handlers, { status: "anonymous", principal: { kind: "anonymous", subjectId: null, roles: [], authenticationLevel: "anonymous", issuedAt: NOW } });
    expect((await secured.public.detail(request(), { slug: "detalle-publicable-ficticio" })).status).toBe(200);
  });

  it("deniega listado interno al anónimo con 401", async () => {
    const handlers = baseHandlers(new InMemoryJurisprudenceRepository(dependencies("anonymous-deny")));
    const { secured } = secure(handlers, { status: "anonymous", principal: { kind: "anonymous", subjectId: null, roles: [], authenticationLevel: "anonymous", issuedAt: NOW } });
    const response = await secured.internal.listInternal(request());
    expect(response.status).toBe(401);
    expect(await payload(response)).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
  });

  it("anónimo no puede crear ni actualizar", async () => {
    const counted = countingHandlers();
    const anonymous: JurisprudenceAuthenticationResult = { status: "anonymous", principal: { kind: "anonymous", subjectId: null, roles: [], authenticationLevel: "anonymous", issuedAt: NOW } };
    const { secured } = secure(counted.handlers, anonymous);
    expect((await secured.internal.create(bodyRequest({}))).status).toBe(401);
    expect((await secured.internal.update(bodyRequest({ expectedVersion: 1, changeKind: "editorial_update", record: securityRecord(510) }, "PUT"), { id: "opaque-record" })).status).toBe(401);
    expect(counted.calls.create).toBe(0);
  });

  it("responde 401 a autenticación rechazada y no añade esquema ficticio", async () => {
    const { secured, logs } = secure(baseHandlers(new InMemoryJurisprudenceRepository(dependencies("rejected"))), { status: "rejected", reason: "invalid_credentials" });
    const response = await secured.internal.listInternal(request());
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBeNull();
    expect(logs).toContainEqual(expect.objectContaining({ phase: "authentication_rejected", resultCode: "INVALID_CREDENTIALS" }));
  });

  it("rechaza incoherencia entre resultado anónimo y principal humano", async () => {
    const result: JurisprudenceAuthenticationResult = {
      status: "anonymous",
      principal: principal(["jurisprudence_admin"]),
    };
    const { secured } = secure(baseHandlers(new InMemoryJurisprudenceRepository(dependencies("mismatch"))), result);
    expect((await secured.internal.listInternal(request())).status).toBe(401);
  });

  it("responde 503 cuando el autenticador no está configurado", async () => {
    const { secured, logs } = secure(baseHandlers(new InMemoryJurisprudenceRepository(dependencies("unavailable"))), { status: "unavailable", reason: "not_configured" });
    expect((await secured.internal.listInternal(request())).status).toBe(503);
    expect(logs).toContainEqual(expect.objectContaining({ phase: "authorization_error", resultCode: "AUTHENTICATOR_UNAVAILABLE" }));
  });

  it("traduce un fallo de política sin revelar su causa", async () => {
    const logs: JurisprudenceSecurityLogEvent[] = [];
    const handlers = createSecuredJurisprudenceRouteHandlers({
      handlers: baseHandlers(new InMemoryJurisprudenceRepository(dependencies("policy-error"))),
      authenticator: new TestJurisprudenceAuthenticator(authenticated(["jurisprudence_reader"])),
      authorizationPolicy: { authorize: () => { throw new Error("private policy internals"); } },
      allowTestPrincipals: true,
      clock: () => NOW,
      requestIdGenerator: () => "policy_error_request",
      logger: { log: (event) => logs.push(event) },
    });
    opened.push(handlers);
    const response = await handlers.internal.listInternal(request());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await payload(response))).not.toContain("private policy internals");
    expect(logs).toContainEqual(expect.objectContaining({ phase: "authorization_error", resultCode: "POLICY_ERROR" }));
  });

  it("responde 403 a un autenticado sin permiso", async () => {
    const { secured } = secure(baseHandlers(new InMemoryJurisprudenceRepository(dependencies("forbidden"))), authenticated(["jurisprudence_reader"]));
    const response = await secured.internal.create(bodyRequest({ record: securityRecord(501) }, "POST", { "idempotency-key": "security-create-501" }));
    expect(response.status).toBe(403);
  });

  it("una denegación no invoca el handler", async () => {
    const counted = countingHandlers();
    const { secured } = secure(counted.handlers, authenticated(["jurisprudence_reader"]));
    expect((await secured.internal.create(bodyRequest({}))).status).toBe(403);
    expect(counted.calls.create).toBe(0);
  });

  it("una autorización invoca el handler exactamente una vez", async () => {
    const counted = countingHandlers();
    const { secured } = secure(counted.handlers, authenticated(["jurisprudence_editor"]));
    expect((await secured.internal.create(bodyRequest({}))).status).toBe(200);
    expect(counted.calls.create).toBe(1);
  });

  it("reader lee internamente pero no crea", async () => {
    const counted = countingHandlers();
    const { secured } = secure(counted.handlers, authenticated(["jurisprudence_reader"]));
    expect((await secured.internal.getInternal(request(), { id: "opaque-record" })).status).toBe(200);
    expect((await secured.internal.create(bodyRequest({}))).status).toBe(403);
  });

  it("reviewer evalúa e inspecciona historial sin crear", async () => {
    const counted = countingHandlers();
    const { secured } = secure(counted.handlers, authenticated(["jurisprudence_reviewer"]));
    expect((await secured.internal.evaluatePublication(request(), { id: "opaque-record" })).status).toBe(200);
    expect((await secured.internal.history(request(), { id: "opaque-record" })).status).toBe(200);
    expect((await secured.internal.create(bodyRequest({}))).status).toBe(403);
  });

  it("auditor consulta historial y no muta", async () => {
    const counted = countingHandlers();
    const { secured } = secure(counted.handlers, authenticated(["jurisprudence_auditor"]));
    expect((await secured.internal.history(request(), { id: "opaque-record" })).status).toBe(200);
    expect((await secured.internal.create(bodyRequest({}))).status).toBe(403);
  });

  it("permite crear al editor con memoria", async () => {
    const { secured } = secure(baseHandlers(new InMemoryJurisprudenceRepository(dependencies("editor"))), authenticated(["jurisprudence_editor"]));
    const response = await secured.internal.create(bodyRequest({ record: securityRecord(502) }, "POST", { "idempotency-key": "security-create-502" }));
    expect(response.status).toBe(201);
  });

  it("mantiene indistinguibles detalle privado e inexistente y permite el publicable", async () => {
    const handlers = baseHandlers(new InMemoryJurisprudenceRepository(dependencies("public-detail")));
    const editor = secure(handlers, authenticated(["jurisprudence_editor"])).secured;
    await editor.internal.create(bodyRequest({ record: securityRecord(511) }, "POST", { "idempotency-key": "security-private-511" }));
    await handlers.internal.create(bodyRequest({ record: publicSecurityRecord(512) }, "POST", { "idempotency-key": "security-public-512" }));
    const anonymous = secure(handlers, { status: "anonymous", principal: { kind: "anonymous", subjectId: null, roles: [], authenticationLevel: "anonymous", issuedAt: NOW } }).secured;
    const privateResponse = await anonymous.public.detail(request(), { slug: "fixture-no-publicable-511" });
    const missingResponse = await anonymous.public.detail(request(), { slug: "missing-record" });
    const publicResponse = await anonymous.public.detail(request(), { slug: "fixture-no-publicable-512" });
    expect(privateResponse.status).toBe(404);
    expect(missingResponse.status).toBe(404);
    expect((await payload(privateResponse)).error).toEqual((await payload(missingResponse)).error);
    expect(publicResponse.status).toBe(200);
  });

  it("create protegido no permite publicar indirectamente", async () => {
    const { secured } = secure(baseHandlers(new InMemoryJurisprudenceRepository(dependencies("no-indirect-publish"))), authenticated(["jurisprudence_admin"]));
    const response = await secured.internal.create(bodyRequest({ record: publicSecurityRecord(515) }, "POST", { "idempotency-key": "security-public-515" }));
    expect(response.status).toBe(403);
  });

  it("refina update por changeKind sin consumir el body original", async () => {
    const record = securityRecord(503);
    const { secured } = secure(baseHandlers(new InMemoryJurisprudenceRepository(dependencies("update"))), authenticated(["jurisprudence_editor"]));
    const created = await secured.internal.create(bodyRequest({ record }, "POST", { "idempotency-key": "security-create-503" }));
    const createdPayload = await payload(created);
    const data = createdPayload.data;
    expect(data).toBeTypeOf("object");
    if (data === null || typeof data !== "object" || !("id" in data) || typeof data.id !== "string") throw new Error("La creación no devolvió id.");
    const response = await secured.internal.update(bodyRequest({ expectedVersion: 1, changeKind: "editorial_update", record }, "PUT"), { id: data.id });
    expect(response.status).toBe(200);
  });

  it("deniega source_update al editor", async () => {
    const record = securityRecord(504);
    const { secured } = secure(baseHandlers(new InMemoryJurisprudenceRepository(dependencies("source-denied"))), authenticated(["jurisprudence_editor"]));
    const response = await secured.internal.update(bodyRequest({ expectedVersion: 1, changeKind: "source_update", record }, "PUT"), { id: "opaque-record-id" });
    expect(response.status).toBe(403);
  });

  it("acepta source_update para admin y deja el conflicto al dominio", async () => {
    const record = securityRecord(505);
    const { secured } = secure(baseHandlers(new InMemoryJurisprudenceRepository(dependencies("source-admin"))), authenticated(["jurisprudence_admin"]));
    const response = await secured.internal.update(bodyRequest({ expectedVersion: 1, changeKind: "source_update", record }, "PUT"), { id: "missing-record-id" });
    expect(response.status).toBe(404);
  });

  it("rechaza changeKind inválido sin debilitar el esquema", async () => {
    const { secured } = secure(baseHandlers(new InMemoryJurisprudenceRepository(dependencies("bad-update"))), authenticated(["jurisprudence_admin"]));
    const response = await secured.internal.update(bodyRequest({ expectedVersion: 1, changeKind: "all", record: securityRecord(506) }, "PUT"), { id: "opaque-record-id" });
    expect(response.status).toBe(400);
  });

  it("no deriva identidad de x-user-id, x-role ni x-admin", async () => {
    const authenticator = new AnonymousJurisprudenceAuthenticator(() => NOW);
    const handlers = createSecuredJurisprudenceRouteHandlers({ handlers: baseHandlers(new InMemoryJurisprudenceRepository(dependencies("headers"))), authenticator, authorizationPolicy: defaultJurisprudenceAuthorizationPolicy, clock: () => NOW, requestIdGenerator: () => "security_header_request" });
    opened.push(handlers);
    const response = await handlers.internal.listInternal(request(undefined, { headers: { "x-user-id": "root", "x-role": "jurisprudence_admin", "x-admin": "true" } }));
    expect(response.status).toBe(401);
  });

  it("el envelope denegado no revela roles, subjectId ni permiso", async () => {
    const { secured } = secure(baseHandlers(new InMemoryJurisprudenceRepository(dependencies("safe-envelope"))), authenticated(["jurisprudence_reader"]));
    const source = JSON.stringify(await payload(await secured.internal.create(bodyRequest({}, "POST"))));
    expect(source).not.toMatch(/jurisprudence_reader|opaque-test-subject|requiredPermission|roles|subjectId|policyVersion|reasonCode|invalid_credentials|stack|headers|token/);
  });

  it("el logging de autorización es mínimo", async () => {
    const { secured, logs } = secure(baseHandlers(new InMemoryJurisprudenceRepository(dependencies("logs"))), authenticated(["jurisprudence_reader"]));
    await secured.internal.create(bodyRequest({ officialText: "texto jurídico que no debe registrarse", token: "forbidden-token" }, "POST", { authorization: "Bearer forbidden" }));
    const source = JSON.stringify(logs);
    expect(source).not.toMatch(/officialText|texto jurídico|subjectId|roles|requiredPermission|idempotency|forbidden-token|Bearer|body|query|cookie/i);
    expect(source).not.toMatch(/["']Authorization["']\s*:/i);
    for (const event of logs) {
      expect(event).not.toHaveProperty("Authorization");
      expect(event).not.toHaveProperty("authorization");
      expect(event).not.toHaveProperty("headers");
      expect(event).not.toHaveProperty("token");
      expect(Object.keys(event).sort()).toEqual([
        "operation",
        "phase",
        "policyVersion",
        "principalKind",
        "requestId",
        "resultCode",
        "status",
      ]);
    }
  });

  it("closeService exige permiso y dispose pertenece al propietario", async () => {
    const { secured } = secure(baseHandlers(new InMemoryJurisprudenceRepository(dependencies("close"))), authenticated(["jurisprudence_admin"]));
    expect((await secured.internal.closeService(request())).status).toBe(200);
    expect((await secured.public.search(request())).status).toBe(503);
    await secured.close();
  });

  it("la factory pública solo expone lectura pública y close", async () => {
    const handlers = createAnonymousPublicJurisprudenceRouteHandlers({
      handlers: baseHandlers(new InMemoryJurisprudenceRepository(dependencies("public-factory"))),
      authorizationPolicy: defaultJurisprudenceAuthorizationPolicy,
      clock: () => NOW,
      requestIdGenerator: () => "public_factory_request",
    });
    expect(Object.keys(handlers).sort()).toEqual(["close", "public"]);
    expect(Object.keys(handlers.public).sort()).toEqual(["detail", "search"]);
    await handlers.close();
  });

  it("la factory interna no expone autenticador, policy, API ni repositorio", () => {
    const { secured } = secure(baseHandlers(new InMemoryJurisprudenceRepository(dependencies("encapsulation"))), authenticated(["jurisprudence_admin"]));
    expect(Object.keys(secured).sort()).toEqual(["close", "internal", "public"]);
    expect(secured).not.toHaveProperty("authenticator");
    expect(secured).not.toHaveProperty("authorizationPolicy");
    expect(secured).not.toHaveProperty("api");
    expect(secured).not.toHaveProperty("repository");
  });
});

describe("equivalencia e integración de adaptadores", () => {
  it.each([
    ["memoria", () => new InMemoryJurisprudenceRepository(dependencies("matrix-memory"))],
    ["sqlite-memory", () => new SqliteJurisprudenceRepository(":memory:", dependencies("matrix-sqlite"))],
  ] as const)("aplica el mismo guard con %s", async (name, repositoryFactory) => {
    const { secured } = secure(baseHandlers(repositoryFactory()), authenticated(["jurisprudence_editor"]));
    const response = await secured.internal.create(bodyRequest({ record: securityRecord(507) }, "POST", { "idempotency-key": "security-create-507" }));
    expect(name).toMatch(/memoria|sqlite-memory/);
    expect(response.status).toBe(201);
  });

  it("preserva idempotencia de create y versión optimista de update", async () => {
    const record = securityRecord(514);
    const { secured } = secure(
      baseHandlers(new InMemoryJurisprudenceRepository(dependencies("idempotency-version"))),
      authenticated(["jurisprudence_editor"]),
    );
    const createRequest = () => bodyRequest({ record }, "POST", { "idempotency-key": "security-idempotency-514" });
    const first = await secured.internal.create(createRequest());
    const retry = await secured.internal.create(createRequest());
    const id = await responseRecordId(first);
    expect(await responseRecordId(retry)).toBe(id);
    const changed = { ...record, editorialContent: { ...record.editorialContent, editorialSummary: "Cambio ficticio de seguridad." } };
    const updated = await secured.internal.update(bodyRequest({ expectedVersion: 1, changeKind: "editorial_update", record: changed }, "PUT"), { id });
    const conflict = await secured.internal.update(bodyRequest({ expectedVersion: 1, changeKind: "editorial_update", record: changed }, "PUT"), { id });
    expect(updated.status).toBe(200);
    expect(conflict.status).toBe(409);
  });

  it("persiste en archivo SQLite, cierra, reabre, lee y limpia", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "buholex-security-11e-"));
    const databasePath = path.join(directory, "security.sqlite");
    let first: SecuredJurisprudenceRouteHandlers | null = null;
    let reopened: SecuredJurisprudenceRouteHandlers | null = null;
    try {
      first = secure(
        baseHandlers(new SqliteJurisprudenceRepository(databasePath, dependencies("disk-first"))),
        authenticated(["jurisprudence_editor"]),
      ).secured;
      const created = await first.internal.create(bodyRequest({ record: securityRecord(513) }, "POST", { "idempotency-key": "security-disk-513" }));
      const id = await responseRecordId(created);
      await first.close();

      reopened = secure(
        baseHandlers(new SqliteJurisprudenceRepository(databasePath, dependencies("disk-reopened"))),
        authenticated(["jurisprudence_reviewer"]),
      ).secured;
      expect((await reopened.internal.getInternal(request(), { id })).status).toBe(200);
      expect((await reopened.internal.history(request(), { id })).status).toBe(200);
    } finally {
      if (first !== null) await first.close();
      if (reopened !== null) await reopened.close();
      rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  });
});

describe("readiness y límites estáticos", () => {
  it("declara contratos listos pero ninguna ruta lista para montar", () => {
    const readiness = evaluateJurisprudenceRouteMountReadiness(NOW);
    expect(readiness).toMatchObject({ policyContractsReady: true, authorizationEngineReady: true, securedHandlersReadyForTesting: true, publicRoutesReadyToMount: false, internalRoutesReadyToMount: false, authenticationReal: false, endpointsMounted: false });
    expect(readiness.internalBlockers).toContain("authentication_provider_missing");
    expect(readiness.publicBlockers).toEqual(expect.arrayContaining([
      "public_source_data_missing",
      "privacy_policy_missing",
      "rate_limiting_missing",
      "persistence_lifecycle_missing",
      "production_database_missing",
      "availability_policy_missing",
    ]));
    expect(readiness.requirements.map((requirement) => requirement.id)).toHaveLength(16);
  });

  it("readiness no admite forceMount", () => {
    const source = readFileSync(path.join(process.cwd(), "lib", "jurisprudence-route-readiness.ts"), "utf8");
    expect(source).not.toMatch(/forceMount|override|ready\s*=\s*true/i);
  });

  it("no existen app/api ni route.ts", () => {
    const authorizedRouteFiles = [
    "app/api/admin/complaints/[complaintId]/responses/route.ts",
    "app/api/admin/complaints/[complaintId]/review/route.ts",
    "app/api/admin/complaints/[complaintId]/route.ts",
    "app/api/admin/complaints/route.ts",
    "app/api/admin/complaints/[complaintId]/request-information/route.ts",
    "app/api/admin/complaints/[complaintId]/resume-review/route.ts",
    "app/api/complaints/route.ts",
    "app/api/owl/admission/route.ts",
];
    const appRoot = path.join(process.cwd(), "app");
    const entries = readdirSync(appRoot, { recursive: true })
      .filter((entry): entry is string => typeof entry === "string");
    const routeFiles = entries
      .filter((entry) => path.basename(entry) === "route.ts")
      .map((entry) => path.relative(process.cwd(), path.join(appRoot, entry)).split(path.sep).join("/"));
    expect(routeFiles.sort()).toEqual(authorizedRouteFiles.sort());
    // jurisprudencia no crea rutas API propias
    expect(
      entries.filter((entry) => entry.replaceAll("\\", "/").startsWith("api/") && /jurisprudence/.test(entry)),
    ).toEqual([]);
  });

  it("seguridad no se importa desde app, components ni data", () => {
    const roots = ["app", "components", "data"];
    const sources = roots.flatMap((root) => readdirSync(path.join(process.cwd(), root), { recursive: true })
      .filter((entry): entry is string => typeof entry === "string" && /\.(ts|tsx)$/.test(entry))
      .map((entry) => readFileSync(path.join(process.cwd(), root, entry), "utf8")));
    expect(sources.join("\n")).not.toMatch(/jurisprudence-(security|authorization|authentication|secured-handler)/);
  });

  it("el autenticador de prueba no se importa en producción", () => {
    const roots = ["app", "components", "data", "lib", "types"];
    const sources = roots.flatMap((root) => readdirSync(path.join(process.cwd(), root), { recursive: true })
      .filter((entry): entry is string => typeof entry === "string" && /\.(ts|tsx)$/.test(entry))
      .map((entry) => readFileSync(path.join(process.cwd(), root, entry), "utf8")));
    expect(sources.join("\n")).not.toContain("TestJurisprudenceAuthenticator");
  });

  it("no reexporta seguridad desde barrels generales", () => {
    const roots = ["app", "components", "data", "lib", "types"];
    const indexFiles = roots.flatMap((root) => readdirSync(path.join(process.cwd(), root), { recursive: true })
      .filter((entry): entry is string => typeof entry === "string" && /(?:^|[\\/])index\.ts$/.test(entry))
      .map((entry) => path.join(process.cwd(), root, entry)));
    const source = indexFiles.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(source).not.toMatch(/jurisprudence-(security|authorization|authentication|secured-handler)/);
  });

  it("no incorpora proveedor real, JWT, cookies ni credenciales", () => {
    const files = [
      "types/jurisprudence-security.ts",
      "lib/jurisprudence-authentication-port.ts",
      "lib/jurisprudence-authorization-policy.ts",
      "lib/jurisprudence-security-guard.ts",
      "lib/jurisprudence-secured-handler-factory.ts",
    ];
    const source = files.map((file) => readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
    expect(source).not.toMatch(/NextAuth|Clerk|Supabase|Firebase|Cognito|jsonwebtoken|document\.cookie|cookies\(/i);
    expect(source).not.toMatch(/x-user-id.*get|x-role.*get|x-admin.*get/i);
    expect(source).not.toMatch(/Authorization\s*:|Bearer\s+[A-Za-z0-9._-]+|hardcoded.{0,20}(secret|token)/i);
  });

  it("no añade middleware jurisprudencial ni proveedor al manifiesto", () => {
    const middleware = readFileSync(path.join(process.cwd(), "middleware.ts"), "utf8");
    const packageSource = readFileSync(path.join(process.cwd(), "package.json"), "utf8");
    const lockSource = readFileSync(path.join(process.cwd(), "pnpm-lock.yaml"), "utf8");
    expect(middleware).not.toMatch(/jurisprudence|jurisprudencia/);
    expect(`${packageSource}\n${lockSource}`).not.toMatch(/next-auth|@clerk|supabase|firebase|cognito|jsonwebtoken/i);
  });

  it("la factory protegida no abre ni importa SQLite", () => {
    const source = readFileSync(path.join(process.cwd(), "lib", "jurisprudence-secured-handler-factory.ts"), "utf8");
    expect(source).not.toMatch(/node:sqlite|SqliteJurisprudenceRepository|databasePath|process\.env/);
  });

  it("mantiene /jurisprudencia desconectada", () => {
    const page = readFileSync(path.join(process.cwd(), "app", "jurisprudencia", "page.tsx"), "utf8");
    expect(page).not.toMatch(/jurisprudence-security|secured-handler|fetch\(/);
  });

  it("preserva los contratos comerciales protegidos", () => {
    const catalog = readFileSync(path.join(process.cwd(), "data", "template-catalog.ts"), "utf8");
    const webService = publicServices.find((service) => service.id === "SRV-WEB-001");
    expect(catalog).toMatch(/availabilityStatus\s*:\s*["']editorial_preview["']/);
    expect(catalog).toMatch(/publicationAuthorization\s*:\s*\{\s*authorized\s*:\s*false/);
    expect(catalog).toMatch(/licenseStatus\s*:\s*["']pending["']/);
    expect(catalog).toMatch(/publiclyVisible\s*:\s*false/);
    expect(catalog).toMatch(/downloadable\s*:\s*false/);
    expect(catalog).toMatch(/publicDownloadAuthorized\s*:\s*false/);
    expect(webService).toMatchObject({
      id: "SRV-WEB-001",
      allowsImmediatePayment: false,
      published: false,
    });
  });
});
