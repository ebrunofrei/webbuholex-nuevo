// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { publicServices } from "@/data/services";
import {
  loadAuthenticationConfiguration,
  parseAuthenticationConfiguration,
} from "@/lib/authentication-configuration";
import { ProviderBackedJurisprudenceAuthenticator } from "@/lib/provider-backed-jurisprudence-authenticator";
import {
  authenticationConfigurationSchema,
  authenticationSecretReferenceSchema,
} from "@/lib/schemas/authentication-configuration";
import { jurisprudencePrincipalSchema } from "@/lib/schemas/jurisprudence-security";
import {
  TestExternalIdentityProviderAdapter,
  TestJurisprudenceRoleAssignmentRepository,
} from "@/tests/helpers/test-external-identity-provider";
import type {
  ActiveAuthenticationConfiguration,
  ExternalIdentityResolution,
} from "@/types/authentication-configuration";

const NOW = "2026-07-29T18:00:00.000Z";

function testConfiguration(
  overrides: Partial<ActiveAuthenticationConfiguration> = {},
): ActiveAuthenticationConfiguration {
  return {
    status: "configured_for_test",
    providerKind: "auth0_oidc",
    issuer: "https://identity.example.invalid/",
    clientId: "test-client-id",
    audience: "https://api.example.invalid",
    sessionStrategy: "stateful",
    cookie: {
      name: "buholex_test_session",
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    },
    absoluteTtlSeconds: 28_800,
    idleTtlSeconds: 1_800,
    allowedOrigins: ["https://app.example.invalid"],
    environment: "test",
    roleSource: "internal_repository",
    clientSecretReference: { kind: "environment", key: "AUTH_CLIENT_SECRET" },
    sessionSecretReference: { kind: "environment", key: "AUTH_SESSION_SECRET" },
    ...overrides,
  };
}

function verifiedIdentity(overrides: Partial<Extract<ExternalIdentityResolution, { status: "verified" }>> = {}): ExternalIdentityResolution {
  return {
    status: "verified",
    providerKind: "auth0_oidc",
    subjectId: "opaque-subject-11f",
    sessionReference: "opaque-session-11f",
    issuer: "https://identity.example.invalid/",
    audiences: ["https://api.example.invalid"],
    issuedAt: "2026-07-29T17:00:00.000Z",
    expiresAt: "2026-07-29T19:00:00.000Z",
    authenticationLevel: "authenticated",
    roleAssignmentVersion: 1,
    signatureVerified: true,
    claimsValidated: true,
    ...overrides,
  };
}

function authenticator(
  resolution: ExternalIdentityResolution = verifiedIdentity(),
  configuration: ActiveAuthenticationConfiguration = testConfiguration(),
) {
  const provider = new TestExternalIdentityProviderAdapter(resolution);
  const roles = new TestJurisprudenceRoleAssignmentRepository(["jurisprudence_reader"]);
  const instance = new ProviderBackedJurisprudenceAuthenticator({
    configuration,
    provider,
    roles,
    now: () => NOW,
  });
  return { instance, provider, roles };
}

describe("configuración neutral de autenticación", () => {
  it("representa configuración ausente sin simular identidad", () => {
    expect(loadAuthenticationConfiguration({})).toEqual({ status: "not_configured" });
  });

  it("acepta una configuración válida exclusivamente de prueba", () => {
    expect(parseAuthenticationConfiguration(testConfiguration()).status).toBe("configured_for_test");
  });

  it("rechaza campos desconocidos", () => {
    expect(authenticationConfigurationSchema.safeParse({ ...testConfiguration(), clientSecret: "forbidden" }).success).toBe(false);
  });

  it.each([
    ["audience inválida", { audience: "" }],
    ["TTL absoluto inválido", { absoluteTtlSeconds: 10 }],
    ["TTL ocioso mayor", { absoluteTtlSeconds: 900, idleTtlSeconds: 901 }],
  ] as const)("rechaza %s", (_label, override) => {
    expect(authenticationConfigurationSchema.safeParse(testConfiguration(override)).success).toBe(false);
  });

  it("rechaza issuer inválido con un error Zod asociado a issuer y sin lanzar TypeError", () => {
    const invalidConfiguration = testConfiguration({ issuer: "no-es-una-url" });
    let result: ReturnType<typeof authenticationConfigurationSchema.safeParse> | undefined;
    expect(() => {
      result = authenticationConfigurationSchema.safeParse(invalidConfiguration);
    }).not.toThrow();
    expect(result?.success).toBe(false);
    if (result !== undefined && !result.success) {
      expect(JSON.stringify(result.error.issues)).toContain('"path":["issuer"]');
    }
  });

  it("rechaza issuer HTTP fuera del entorno de prueba", () => {
    const production = {
      ...testConfiguration(),
      status: "configured",
      environment: "production",
      issuer: "http://identity.example.invalid/",
      cookie: { ...testConfiguration().cookie, secure: true, name: "__Host-buholex_session" },
    };
    const result = authenticationConfigurationSchema.safeParse(production);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain('"path":["issuer"]');
    }
  });

  it("rechaza cookie insegura y sin prefijo __Host- en producción", () => {
    const production = {
      ...testConfiguration(),
      status: "configured",
      environment: "production",
      cookie: { ...testConfiguration().cookie, secure: false, name: "buholex_session" },
    };
    expect(authenticationConfigurationSchema.safeParse(production).success).toBe(false);
  });

  it("acepta cookie HttpOnly, Secure y __Host- en producción", () => {
    const production = {
      ...testConfiguration(),
      status: "configured",
      environment: "production",
      cookie: { ...testConfiguration().cookie, secure: true, name: "__Host-buholex_session" },
    };
    expect(authenticationConfigurationSchema.safeParse(production).success).toBe(true);
  });

  it("rechaza referencias secretas públicas y secretos planos", () => {
    expect(authenticationSecretReferenceSchema.safeParse({ kind: "environment", key: "NEXT_PUBLIC_AUTH_SECRET" }).success).toBe(false);
    expect(authenticationConfigurationSchema.safeParse({ ...testConfiguration(), clientSecret: "plaintext" }).success).toBe(false);
  });

  it("acepta referencias opacas de secreto sin resolverlas", () => {
    expect(authenticationSecretReferenceSchema.parse({ kind: "managed_secret_store", key: "auth/buholex/session" })).toEqual({
      kind: "managed_secret_store",
      key: "auth/buholex/session",
    });
  });

  it("mantiene providerKind, sesión y roleSource cerrados", () => {
    expect(authenticationConfigurationSchema.safeParse({ ...testConfiguration(), providerKind: "custom" }).success).toBe(false);
    expect(authenticationConfigurationSchema.safeParse({ ...testConfiguration(), sessionStrategy: "jwt" }).success).toBe(false);
    expect(authenticationConfigurationSchema.safeParse({ ...testConfiguration(), roleSource: "header" }).success).toBe(false);
  });

  it("la carga explícita no consulta process.env", () => {
    const source = readFileSync(path.join(process.cwd(), "lib", "authentication-configuration.ts"), "utf8");
    expect(source).not.toContain("process.env");
  });
});

describe("decisión documental condicionada del proveedor", () => {
  const auditPath = path.join(process.cwd(), "docs", "phase-11-f-authentication-provider-audit.md");
  const matrixPath = path.join(process.cwd(), "docs", "phase-11-f-auth-provider-decision-matrix.md");
  const adrPath = path.join(
    process.cwd(),
    "docs",
    "adr",
    "ADR-016-authentication-provider-session-and-secret-strategy.md",
  );

  it("registra Auth0 4.26.0 como recomendación condicionada, no como selección", () => {
    const source = `${readFileSync(matrixPath, "utf8")}\n${readFileSync(adrPath, "utf8")}`;
    expect(source).toContain("@auth0/nextjs-auth0@4.26.0");
    expect(source).toMatch(/recomendación condicionada pendiente de autorización/i);
    expect(source).toMatch(/selección institucional (?:no realizada|del proveedor)/i);
    expect(source).toMatch(/proveedor no (?:está )?aprobado/i);
  });

  it("documenta literalmente las seis dependencias directas de runtime", () => {
    const source = readFileSync(auditPath, "utf8");
    const dependencies = [
      "@edge-runtime/cookies@^5.0.1",
      "@panva/hkdf@^1.2.1",
      "jose@^6.0.11",
      "oauth4webapi@^3.8.2",
      "openid-client@^6.8.0",
      "swr@^2.2.5",
    ];
    for (const dependency of dependencies) expect(source).toContain(dependency);
  });

  it("distingue compatibilidad de Next.js e incompatibilidad de React y React DOM", () => {
    const source = readFileSync(auditPath, "utf8");
    expect(source).toMatch(/Next\.js es compatible/i);
    expect(source).toMatch(/React y React DOM no satisfacen/i);
    expect(source).toContain("Next.js 15.5.9");
    expect(source).toContain("React 19.1.1");
    expect(source).toContain("React DOM 19.1.1");
  });

  it("el ADR 016 refleja el estado histórico de no autorización ni instalación", () => {
    const adrSource = readFileSync(adrPath, "utf8");
    expect(adrSource).toMatch(/dependencia no está autorizada ni instalada/i);
    expect(adrSource).toMatch(/autenticación real no existe/i);
    expect(adrSource).toMatch(/no hay endpoints montados/i);
  });
});

describe("adaptación neutral del proveedor al principal 11.E", () => {
  it("produce un principal autenticado opaco con roles del servidor", async () => {
    const { instance } = authenticator();
    const result = await instance.authenticate(new Request("https://app.example.invalid/private"));
    expect(result).toMatchObject({
      status: "authenticated",
      principal: {
        subjectId: "opaque-subject-11f",
        roles: ["jurisprudence_reader"],
        provider: "future_identity_provider",
      },
    });
    if (result.status === "authenticated") {
      expect(result.principal.expiresAt).toBe("2026-07-29T19:00:00.000Z");
      expect(Object.hasOwn(result.principal, "expiresAt")).toBe(true);
      expect(jurisprudencePrincipalSchema.safeParse(result.principal).success).toBe(true);
      expect(JSON.stringify(result.principal)).not.toMatch(/@|email|DNI|phone|token|cookie/i);
    }
  });

  it("omite expiresAt en un principal anónimo válido y no filtra datos del proveedor", async () => {
    const result = await authenticator({ status: "anonymous" }).instance.authenticate(
      new Request("https://app.example.invalid"),
    );
    expect(result.status).toBe("anonymous");
    if (result.status === "anonymous") {
      expect(Object.hasOwn(result.principal, "expiresAt")).toBe(false);
      expect(jurisprudencePrincipalSchema.safeParse(result.principal).success).toBe(true);
      expect(result.principal).toEqual({
        kind: "anonymous",
        subjectId: null,
        roles: [],
        authenticationLevel: "anonymous",
        issuedAt: NOW,
      });
    }
  });

  it("no deriva roles de headers", async () => {
    const { instance } = authenticator();
    const result = await instance.authenticate(new Request("https://app.example.invalid/private", {
      headers: { "x-role": "jurisprudence_admin", "x-user-id": "admin", "x-admin": "true" },
    }));
    expect(result).toMatchObject({ status: "authenticated", principal: { roles: ["jurisprudence_reader"] } });
  });

  it.each([
    ["issuer incorrecto", verifiedIdentity({ issuer: "https://wrong.example.invalid/" })],
    ["audience incorrecta", verifiedIdentity({ audiences: ["https://wrong.example.invalid"] })],
    ["identidad expirada", verifiedIdentity({ expiresAt: "2026-07-29T17:30:00.000Z" })],
  ] as const)("rechaza %s", async (_label, resolution) => {
    expect(await authenticator(resolution).instance.authenticate(new Request("https://app.example.invalid")))
      .toEqual({ status: "rejected", reason: "invalid_principal" });
  });

  it("rechaza una identidad suspendida", async () => {
    const setup = authenticator();
    setup.provider.identityStatus = { status: "suspended" };
    expect(await setup.instance.authenticate(new Request("https://app.example.invalid")))
      .toEqual({ status: "rejected", reason: "invalid_principal" });
  });

  it("rechaza un sujeto desactivado internamente", async () => {
    const setup = authenticator();
    setup.roles.active = false;
    expect(await setup.instance.authenticate(new Request("https://app.example.invalid")))
      .toEqual({ status: "rejected", reason: "invalid_principal" });
  });

  it("rechaza roles desconocidos en tiempo de ejecución", async () => {
    const setup = authenticator();
    Object.defineProperty(setup.roles, "roles", { value: ["root"], writable: true });
    expect(await setup.instance.authenticate(new Request("https://app.example.invalid")))
      .toEqual({ status: "rejected", reason: "invalid_principal" });
  });

  it("rechaza una versión de roles obsoleta", async () => {
    const setup = authenticator();
    setup.roles.version = 2;
    expect(await setup.instance.authenticate(new Request("https://app.example.invalid")))
      .toEqual({ status: "rejected", reason: "invalid_principal" });
  });

  it("traduce caída del proveedor a unavailable sin filtrar errores", async () => {
    const setup = authenticator({ status: "unavailable", reason: "infrastructure_error" });
    expect(await setup.instance.authenticate(new Request("https://app.example.invalid")))
      .toEqual({ status: "unavailable", reason: "infrastructure_error" });
  });

  it("preserva el acceso anónimo sin crear identidad", async () => {
    const result = await authenticator({ status: "anonymous" }).instance.authenticate(new Request("https://app.example.invalid"));
    expect(result).toMatchObject({ status: "anonymous", principal: { subjectId: null, roles: [] } });
  });

  it("cierra de forma idempotente y rechaza operaciones posteriores", async () => {
    const setup = authenticator();
    await setup.instance.close();
    await setup.instance.close();
    expect(setup.provider.closed).toBe(true);
    expect(await setup.instance.authenticate(new Request("https://app.example.invalid")))
      .toEqual({ status: "unavailable", reason: "infrastructure_error" });
  });
});

describe("sesión, revocación y controles estáticos", () => {
  it("define sesión stateful, TTL absoluto, inactividad y cookie segura", () => {
    const configuration = testConfiguration();
    expect(configuration).toMatchObject({
      sessionStrategy: "stateful",
      absoluteTtlSeconds: 28_800,
      idleTtlSeconds: 1_800,
      cookie: { httpOnly: true, sameSite: "lax", path: "/" },
    });
  });

  it("permite revocación individual y global mediante el puerto", async () => {
    const setup = authenticator();
    expect(await setup.provider.revokeSession("opaque-session-11f")).toEqual({ status: "revoked" });
    expect(await setup.provider.revokeAllSessions("opaque-subject-11f")).toEqual({ status: "revoked" });
    expect(setup.provider.revokedSessions).toEqual(["opaque-session-11f"]);
    expect(setup.provider.revokedSubjects).toEqual(["opaque-subject-11f"]);
  });

  it("la estrategia CSRF exige SameSite y orígenes exactos", () => {
    const configuration = testConfiguration();
    expect(configuration.cookie.sameSite).toBe("lax");
    expect(configuration.allowedOrigins).toEqual(["https://app.example.invalid"]);
  });

  it("no añade SDK, secretos, JWT, cookies activas ni almacenamiento cliente", () => {
    const files = [
      "types/authentication-configuration.ts",
      "lib/schemas/authentication-configuration.ts",
      "lib/authentication-configuration.ts",
      "lib/provider-backed-jurisprudence-authenticator.ts",
    ];
    const source = files.map((file) => readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
    expect(source).not.toMatch(/from ["'](?:@auth0|next-auth|better-auth|@clerk|@supabase)/);
    expect(source).not.toMatch(/localStorage|document\.cookie|Set-Cookie|jsonwebtoken|algorithm\s*:\s*["']none/i);
    expect(source).not.toMatch(/x-role.*get|x-user-id.*get|x-admin.*get|development.{0,20}(bypass|admin)/i);
    expect(source).not.toMatch(/clientSecret\s*:\s*string|secret\s*:\s*["'][^"']+["']/i);
  });

  it("no modifica manifiestos ni incorpora otras dependencias de autenticación", () => {
    const packageSource = readFileSync(path.join(process.cwd(), "package.json"), "utf8");
    const lockSource = readFileSync(path.join(process.cwd(), "pnpm-lock.yaml"), "utf8");
    expect(`${packageSource}\n${lockSource}`).not.toMatch(/next-auth|better-auth|@clerk\/nextjs|@supabase\/ssr/);
  });

  it("no crea app/api, route.ts ni conexión con jurisprudencia", () => {
    const authorizedRouteFiles = [
      "app/api/admin/complaints/[complaintId]/responses/route.ts",
      "app/api/complaints/route.ts",
      "app/api/owl/admission/route.ts",
    ];
    const entries = readdirSync(path.join(process.cwd(), "app"), { recursive: true })
      .filter((entry): entry is string => typeof entry === "string");
    const routeFiles = entries
      .filter((entry) => path.basename(entry) === "route.ts")
      .map((entry) => path.relative(process.cwd(), path.join(process.cwd(), "app", entry)).split(path.sep).join("/"));
    expect(routeFiles.sort()).toEqual(authorizedRouteFiles.sort());
    // autenticación no crea rutas API propias de jurisprudencia
    expect(entries.some((entry) => entry.replaceAll("\\", "/").startsWith("api/") && /jurisprudence/.test(entry))).toBe(false);
    const page = readFileSync(path.join(process.cwd(), "app", "jurisprudencia", "page.tsx"), "utf8");
    expect(page).not.toMatch(/authentication-configuration|provider-backed|fetch\(/);
  });

  it("no importa contratos de autenticación desde UI ni barrels públicos", () => {
    const roots = ["app", "components", "data"];
    const source = roots.flatMap((root) => readdirSync(path.join(process.cwd(), root), { recursive: true })
      .filter((entry): entry is string => typeof entry === "string" && /\.(ts|tsx)$/.test(entry))
      .map((entry) => readFileSync(path.join(process.cwd(), root, entry), "utf8"))).join("\n");
    expect(source).not.toMatch(/authentication-configuration|provider-backed-jurisprudence-authenticator/);
  });

  it("preserva SRV-WEB-001", () => {
    expect(publicServices.find((service) => service.id === "SRV-WEB-001")).toMatchObject({
      price: null,
      currency: null,
      responsible: null,
      requiresEvaluation: true,
      allowsImmediatePayment: false,
      published: false,
    });
  });

  it("preserva BL-LEG-CON-001 y sus controles de archivo", () => {
    const catalog = readFileSync(path.join(process.cwd(), "data", "template-catalog.ts"), "utf8");
    expect(catalog).toMatch(/availabilityStatus\s*:\s*["']editorial_preview["']/);
    expect(catalog).toMatch(/publicationAuthorization\s*:\s*\{\s*authorized\s*:\s*false/);
    expect(catalog).toMatch(/licenseStatus\s*:\s*["']pending["']/);
    expect(catalog).toMatch(/publiclyVisible\s*:\s*false/);
    expect(catalog).toMatch(/downloadable\s*:\s*false/);
    expect(catalog).toMatch(/publicDownloadAuthorized\s*:\s*false/);
  });
});
