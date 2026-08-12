// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { publicServices } from "@/data/services";
import { rentalHousingContract } from "@/data/template-catalog";
import {
  AUTH0_COMPATIBILITY_ASSESSMENT,
  CURRENT_AUTHENTICATION_PROVIDER_AUTHORIZATION_INPUT,
  evaluateAuthenticationProviderAuthorization,
} from "@/lib/authentication-provider-authorization";
import { evaluateAuthenticationProviderImplementationReadiness } from "@/lib/authentication-provider-readiness";
import {
  authenticationProviderAuthorizationDecisionSchema,
  authenticationProviderAuthorizationInputSchema,
} from "@/lib/schemas/authentication-provider-authorization";
import type { AuthenticationProviderAuthorizationInput } from "@/types/authentication-provider-authorization";

const projectManifestSchema = z.object({
  engines: z.object({ node: z.literal("22.x") }),
  dependencies: z.object({
    next: z.literal("15.5.23"),
    react: z.literal("19.1.6"),
    "react-dom": z.literal("19.1.6"),
    zod: z.string(),
    "@auth0/nextjs-auth0": z.string().optional(),
    "drizzle-orm": z.string().optional(),
    postgres: z.string().optional(),
    "server-only": z.string().optional(),
  }).strict(),
}).passthrough();

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function allAuthorizationConditions(): AuthenticationProviderAuthorizationInput {
  return {
    institutionalAuthorizationGranted: true,
    providerSelected: true,
    providerApproved: true,
    institutionalOwnerDefined: true,
    contractAndCostReviewed: true,
    privacyReviewCompleted: true,
    dependencyChangeApproved: true,
    reactUpgradeApproved: true,
    reactDomUpgradeApproved: true,
    dependencyGraphReviewed: true,
    secretManagerDefined: true,
    productionSessionStoreDefined: true,
    deploymentDomainDefined: true,
    rejectionReasons: [],
  };
}

describe("compatibilidad de Auth0 y resolución mínima no ejecutada", () => {
  it("preserva la arquitectura aprobada de 11.F.1", () => {
    const previousAdr = readProjectFile("docs/adr/ADR-016-authentication-provider-session-and-secret-strategy.md");
    expect(previousAdr).toContain("approved_architecture");
    expect(previousAdr).toMatch(/37 archivos y 442 pruebas aprobadas/i);
    expect(previousAdr).toMatch(/rutas internas sin montar/i);
  });

  it("mantiene Auth0 4.26.0 como recomendación condicionada", () => {
    expect(AUTH0_COMPATIBILITY_ASSESSMENT.recommendedSdk).toBe("@auth0/nextjs-auth0@4.26.0");
  });

  it("clasifica Next.js 15.5.9 como compatible", () => {
    expect(AUTH0_COMPATIBILITY_ASSESSMENT).toMatchObject({
      current: { next: "15.5.9" },
      compatibility: { next: "compatible" },
    });
  });

  it("clasifica React 19.1.1 como incompatible", () => {
    expect(AUTH0_COMPATIBILITY_ASSESSMENT).toMatchObject({
      current: { react: "19.1.1" },
      compatibility: { react: "incompatible" },
    });
  });

  it("clasifica React DOM 19.1.1 como incompatible", () => {
    expect(AUTH0_COMPATIBILITY_ASSESSMENT).toMatchObject({
      current: { reactDom: "19.1.1" },
      compatibility: { reactDom: "incompatible" },
    });
  });

  it("propone 19.1.2 para React y React DOM como una sola resolución mínima", () => {
    expect(AUTH0_COMPATIBILITY_ASSESSMENT.minimumCandidateResolution).toEqual({
      react: "19.1.2",
      reactDom: "19.1.2",
      authorized: false,
      executed: false,
    });
  });

  it("no permite instalación forzada, legacy peers ni overrides", () => {
    expect(AUTH0_COMPATIBILITY_ASSESSMENT.forceInstallAllowed).toBe(false);
    const documentation = [
      "docs/phase-11-f-2-react-auth0-compatibility-assessment.md",
      "docs/phase-11-f-2-dependency-impact-and-rollback.md",
      "docs/adr/ADR-017-authentication-provider-authorization-gate.md",
    ].map(readProjectFile).join("\n");
    expect(documentation).toContain("--force");
    expect(documentation).toContain("--legacy-peer-deps");
    expect(documentation).toMatch(/overrides? de peers?/i);
    expect(documentation).toMatch(/prohibid[oa]s?/i);
  });

  it("confirma las versiones desde el manifiesto real", () => {
    const manifest = projectManifestSchema.parse(JSON.parse(readProjectFile("package.json")));
    expect(manifest.dependencies).toMatchObject({ next: "15.5.23", react: "19.1.6", "react-dom": "19.1.6" });
    expect(manifest.engines.node).toBe("22.x");
  });
});

describe("decisión discriminada y readiness institucional", () => {
  it("difiere cuando no hay autorización", () => {
    expect(evaluateAuthenticationProviderAuthorization(CURRENT_AUTHENTICATION_PROVIDER_AUTHORIZATION_INPUT)).toMatchObject({
      decision: "defer",
      safeState: "not_configured",
    });
  });

  it("enumera todos los bloqueos actuales", () => {
    const decision = evaluateAuthenticationProviderAuthorization(CURRENT_AUTHENTICATION_PROVIDER_AUTHORIZATION_INPUT);
    expect(decision.decision).toBe("defer");
    if (decision.decision === "defer") expect(decision.blockers).toHaveLength(11);
  });

  it("solo autoriza cuando todas las condiciones están completas", () => {
    const decision = evaluateAuthenticationProviderAuthorization(allAuthorizationConditions());
    expect(decision).toMatchObject({
      decision: "authorize",
      provider: "Auth0",
      package: "@auth0/nextjs-auth0",
      version: "4.26.0",
      reactTarget: "19.1.2",
      reactDomTarget: "19.1.2",
    });
    if (decision.decision === "authorize") expect(decision.conditions).toHaveLength(10);
  });

  it("nunca recomienda actualizar solo una de las dos dependencias", () => {
    const incomplete = { ...allAuthorizationConditions(), reactDomUpgradeApproved: false };
    expect(evaluateAuthenticationProviderAuthorization(incomplete)).toMatchObject({ decision: "defer" });
  });

  it("representa rechazo explícito con estado seguro", () => {
    const input = { ...CURRENT_AUTHENTICATION_PROVIDER_AUTHORIZATION_INPUT, rejectionReasons: ["Decisión institucional documentada."] };
    expect(evaluateAuthenticationProviderAuthorization(input)).toEqual({
      decision: "reject",
      reasons: ["Decisión institucional documentada."],
      safeState: "not_configured",
    });
  });

  it("rechaza propiedades de bypass", () => {
    expect(authenticationProviderAuthorizationInputSchema.safeParse({
      ...CURRENT_AUTHENTICATION_PROVIDER_AUTHORIZATION_INPUT,
      forceApprove: true,
    }).success).toBe(false);
  });

  it("valida estrictamente la unión de decisión", () => {
    expect(authenticationProviderAuthorizationDecisionSchema.safeParse({
      decision: "authorize",
      provider: "Auth0",
      package: "@auth0/nextjs-auth0",
      version: "4.26.0",
      reactTarget: "19.1.2",
      reactDomTarget: "19.1.2",
      conditions: [],
    }).success).toBe(false);
  });

  it("mantiene proveedor, dependencia y actualizaciones sin aprobar", () => {
    const readiness = evaluateAuthenticationProviderImplementationReadiness(CURRENT_AUTHENTICATION_PROVIDER_AUTHORIZATION_INPUT);
    expect(readiness).toMatchObject({
      providerSelected: false,
      providerApproved: false,
      dependencyChangeApproved: false,
      reactUpgradeApproved: false,
      reactDomUpgradeApproved: false,
      reactUpgradeExecuted: false,
      reactDomUpgradeExecuted: false,
    });
  });

  it("no habilita implementación ni montaje y no admite override", () => {
    expect(evaluateAuthenticationProviderImplementationReadiness(CURRENT_AUTHENTICATION_PROVIDER_AUTHORIZATION_INPUT)).toMatchObject({
      authenticationReal: false,
      endpointsMounted: false,
      readyForProviderImplementation: false,
      readyForRouteMount: false,
      overrideSupported: false,
    });
  });
});

describe("barreras estáticas y preservación del proyecto", () => {
  it("Auth0 4.26.0 está instalado según la autorización de B5B", () => {
    expect(`${readProjectFile("package.json")}\n${readProjectFile("pnpm-lock.yaml")}`).toContain("@auth0/nextjs-auth0");
  });

  it("restringe la importación del SDK recomendado a las capas autorizadas", () => {
    const roots = ["app", "components", "data", "types"];
    const sources = roots.flatMap((root) => readdirSync(path.join(process.cwd(), root), { recursive: true })
      .filter((entry): entry is string => typeof entry === "string" && /\.(ts|tsx)$/.test(entry))
      .map((entry) => readFileSync(path.join(process.cwd(), root, entry), "utf8"))).join("\n");
    expect(sources).not.toMatch(/from ["']@auth0\/nextjs-auth0/);
  });

  it("no crea app/api ni route.ts", () => {
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
    // autorización no crea rutas API propias de jurisprudencia
    expect(entries.some((entry) => entry.replaceAll("\\", "/").startsWith("api/") && /jurisprudence/.test(entry))).toBe(false);
  });

  it("mantiene /jurisprudencia desconectada", () => {
    const source = readProjectFile("app/jurisprudencia/page.tsx");
    expect(source).not.toMatch(/authentication-provider-authorization|@auth0|fetch\(/);
  });

  it("no crea secretos, cookies ni JWT", () => {
    const sources = [
      "types/authentication-provider-authorization.ts",
      "lib/schemas/authentication-provider-authorization.ts",
      "lib/authentication-provider-authorization.ts",
      "lib/authentication-provider-readiness.ts",
    ].map(readProjectFile).join("\n");
    expect(sources).not.toMatch(/process\.env|Set-Cookie|document\.cookie|jsonwebtoken|createSecret|clientSecret\s*:/i);
  });

  it("preserva SRV-WEB-001 sin pago inmediato y no publicado", () => {
    expect(publicServices.find((service) => service.id === "SRV-WEB-001")).toMatchObject({
      id: "SRV-WEB-001",
      allowsImmediatePayment: false,
      published: false,
    });
  });

  it("preserva BL-LEG-CON-001 y sus controles reales", () => {
    expect(rentalHousingContract).toMatchObject({
      id: "BL-LEG-CON-001",
      availabilityStatus: "editorial_preview",
      price: null,
      currency: null,
      licenseStatus: "pending",
      publicationAuthorization: { authorized: false, authorizedBy: null, authorizedAt: null },
      intellectualProperty: { supportingDocument: { publiclyVisible: false, downloadable: false } },
      masterInternalFile: { publicDownloadAuthorized: false },
    });
    expect(rentalHousingContract.commercialFiles.every((file) => !file.publicDownloadAuthorized)).toBe(true);
    expect(rentalHousingContract.annexFiles.every((file) => !file.publicDownloadAuthorized)).toBe(true);
  });
});
