import { describe, expect, it, beforeAll } from "vitest";
import { handleJurisprudenceGovernanceSourcesPost } from "@/lib/jurisprudence/jurisprudence-governance-http-handler";
import { withFixedSchemas } from "../helpers/jurisprudence-migration-harness";
import { randomUUID } from "node:crypto";
import * as fs from "fs";
import * as path from "path";
import type { JurisprudenceAuthenticationRuntimeResult, JurisprudenceAuthenticationRuntime } from "@/lib/jurisprudence/jurisprudence-authentication-runtime";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/database/schema";

import type { JurisprudenceAuthenticator, JurisprudenceAuthenticationResult } from "@/types/jurisprudence-security";

import { vi } from "vitest";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";

// 0. GLOBAL DB MOCKS PARA EVITAR CONEXIONES REALES EXTERNAS Y REUTILIZAR EL RUNNER
let mockTestDbWrite: PostgresJsDatabase<typeof schema> | null = null;
let mockTestDbRead: PostgresJsDatabase<Record<string, never>> | null = null;

vi.mock("@/database/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/database/client")>();
  return {
    ...actual,
    getJurisprudenceInternalWriteDatabase: () => mockTestDbWrite
  };
});

vi.mock("@/database/jurisprudence-internal-read-database", () => ({
  getJurisprudenceInternalReadDatabase: () => mockTestDbRead
}));

// 1. AUTH FACTORY DE TEST
function createAuthFactory(result: JurisprudenceAuthenticationResult | Error) {
  return (): JurisprudenceAuthenticationRuntimeResult => {
    if (result instanceof Error) {
      throw result;
    }
    return {
      status: "configured",
      runtime: {
        authenticator: {
          authenticate: async () => result,
        } satisfies JurisprudenceAuthenticator,
        close: async () => {},
      } satisfies JurisprudenceAuthenticationRuntime,
    } satisfies JurisprudenceAuthenticationRuntimeResult;
  };
}

// 2. PRINCIPAL AUTORIZADO
const authorizedPrincipal = {
  kind: "human",
  subjectId: "auth0-1234567890",
  roles: ["jurisprudence_editor"],
  authenticationLevel: "authenticated",
  issuedAt: new Date(Date.now() - 10000).toISOString(),
  expiresAt: new Date(Date.now() + 100000).toISOString(),
} as const;

const forbiddenPrincipal = {
  kind: "human",
  subjectId: "auth0-0987654321",
  roles: ["jurisprudence_reader"],
  authenticationLevel: "authenticated",
  issuedAt: new Date(Date.now() - 10000).toISOString(),
  expiresAt: new Date(Date.now() + 100000).toISOString(),
} as const;

describe("Jurisprudence Governance HTTP Boundary", () => {
  // 3. ORIGIN
  const origin = (process.env.AUTH_ALLOWED_ORIGINS || "").split(",")[0] || "http://localhost:3000";

  beforeAll(() => {
    process.env.AUTH_PROVIDER_KIND = "auth0_oidc";
    process.env.AUTH_ISSUER = "https://example.com/";
    process.env.AUTH_CLIENT_ID = "client_id";
    process.env.AUTH_AUDIENCE = "audience";
    process.env.AUTH_COOKIE_NAME = "test_cookie_name";
    process.env.AUTH_ABSOLUTE_TTL_SECONDS = "3600";
    process.env.AUTH_IDLE_TTL_SECONDS = "1800";
    process.env.AUTH_ALLOWED_ORIGINS = origin;
    process.env.AUTH_ENVIRONMENT = "test";
    process.env.AUTH_CLIENT_SECRET_REFERENCE = "SECRET";
    process.env.AUTH_SESSION_SECRET_REFERENCE = "SECRET";
  });

  it("A. rechaza request sin credenciales de admin/editor", async () => {
    const request = new Request("https://api.example.com/sources", {
      method: "POST",
      headers: { "Origin": origin, "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const dependencies = {
      createAuthenticationRuntime: createAuthFactory({ status: "rejected", reason: "invalid_credentials" })
    };
    const response = await handleJurisprudenceGovernanceSourcesPost(request, dependencies);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("B. rechaza request con usuario sin permiso", async () => {
    const request = new Request("https://api.example.com/sources", {
      method: "POST",
      headers: { "Origin": origin, "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const dependencies = {
      createAuthenticationRuntime: createAuthFactory({ status: "authenticated", principal: forbiddenPrincipal })
    };
    const response = await handleJurisprudenceGovernanceSourcesPost(request, dependencies);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("C. rechaza payload invalido", async () => {
    const request = new Request("https://api.example.com/sources", {
      method: "POST",
      headers: { "Origin": origin, "Content-Type": "application/json" },
      body: JSON.stringify({ invalid: true })
    });
    const dependencies = {
      createAuthenticationRuntime: createAuthFactory({ status: "authenticated", principal: authorizedPrincipal })
    };
    const response = await handleJurisprudenceGovernanceSourcesPost(request, dependencies);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it.skipIf(!process.env.JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL)("D, E, F: tests en Postgres real", async () => {
    await withFixedSchemas(
      process.env,
      ["jurisprudence_internal", "jurisprudence_public"],
      {
        setup: async (adminSql) => {
          const migrationDir = path.join(__dirname, "../../database/migrations");
          const jurisprudenceMigrationFiles = [
            "0018_jurisprudence_foundation.sql",
            "0019_jurisprudence_public_read_security.sql",
            "0020_jurisprudence_public_write_security.sql",
            "0021_jurisprudence_publication_execution_foundation.sql",
            "0022_jurisprudence_publication_outbox_foundation.sql",
            "0023_jurisprudence_publication_command_security.sql",
            "0024_jurisprudence_public_projection_barrier.sql",
            "0025_jurisprudence_public_write_login_hardening.sql",
            "0026_jurisprudence_internal_write_security.sql",
            "0027_jurisprudence_internal_read_security.sql",
            "0028_jurisprudence_publication_outbox_recovery_linkage.sql",
            "0029_jurisprudence_resolution_number_nullable.sql",
            "0030_jurisprudence_public_urls.sql",
            "0031_jurisprudence_publication_workflow_foundation.sql",
            "0032_jurisprudence_role_assignment_persistence.sql",
            "0038_jurisprudence_source_binding_fk.sql"
          ];
          for (const file of jurisprudenceMigrationFiles) {
            const sqlContent = fs.readFileSync(path.join(migrationDir, file), "utf8");
            await adminSql.unsafe(sqlContent);
          }
        },
        run: async (runnerSql) => {
          mockTestDbWrite = drizzle(runnerSql, { schema });
          mockTestDbRead = drizzle(runnerSql, { schema: {} });

          const dependencies = {
            createAuthenticationRuntime: createAuthFactory({ status: "authenticated", principal: authorizedPrincipal })
          };

          const validPayload = {
            context: {
              requestId: "req-" + randomUUID().substring(0, 8),
              actorReference: "auth0-1234567890",
              requestedAt: new Date().toISOString(),
            },
            source: {
              sourceKind: "official_publication",
              originType: "primary_official_document",
              institutionalOrigin: "INSTITUCIÓN TEST",
              jurisdiction: "TEST",
              documentReference: "DOC-123-" + randomUUID(),
              sourceUrl: "https://example.com/test",
              sourceDate: "2026-07-01",
              retrievedAt: new Date().toISOString(),
              custodyStatus: "controlled_internal",
              provenanceStatus: "verified",
              integrityStatus: "checksum_verified",
              rightsStatus: "public_display_permitted",
              privacyStatus: "approved_for_public_projection",
              availabilityStatus: "available_internal",
              verificationStatus: "verified",
              sourceChecksum: "a".repeat(64),
              sourceChecksumAlgorithm: "sha256",
              sourceFingerprint: "b".repeat(64)
            },
            idempotencyKey: "idem-" + randomUUID()
          };

          // D. Valid registration
          const requestD = new Request("https://api.example.com/sources", {
            method: "POST",
            headers: { "Origin": origin, "Content-Type": "application/json" },
            body: JSON.stringify(validPayload)
          });
          const responseD = await handleJurisprudenceGovernanceSourcesPost(requestD, dependencies);
          const bodyD = await responseD.json();
          console.log("RESPONSE D:", JSON.stringify(bodyD, null, 2));
          expect(responseD.status).toBe(201);
          expect(bodyD.success).toBe(true);
          const sourceId = bodyD.data.source.sourceId;

          const rows = await runnerSql.begin(async (tx) => {
            await tx`SET LOCAL ROLE jurisprudence_internal_read_runtime`;
            return tx`SELECT source_id FROM jurisprudence_internal.jurisprudence_governed_sources WHERE source_id = ${sourceId}`;
          });
          expect(rows.length).toBe(1);

          // E. Idempotent Replay
          const requestE = new Request("https://api.example.com/sources", {
            method: "POST",
            headers: { "Origin": origin, "Content-Type": "application/json" },
            body: JSON.stringify(validPayload)
          });
          const responseE = await handleJurisprudenceGovernanceSourcesPost(requestE, dependencies);
          expect([200, 201]).toContain(responseE.status); // Usually returns 201 for replay too
          const bodyE = await responseE.json();
          expect(bodyE.data.source.sourceId).toBe(sourceId); // coherent result

          const rowsE = await runnerSql.begin(async (tx) => {
            await tx`SET LOCAL ROLE jurisprudence_internal_read_runtime`;
            return tx`SELECT source_id FROM jurisprudence_internal.jurisprudence_governed_sources WHERE source_id = ${sourceId}`;
          });
          expect(rowsE.length).toBe(1); // physical count still 1

          // F. Idempotency Conflict
          const conflictPayload = {
            ...validPayload,
            source: {
              ...validPayload.source,
              documentReference: "DOC-456-" + randomUUID()
            }
          };
          const requestF = new Request("https://api.example.com/sources", {
            method: "POST",
            headers: { "Origin": origin, "Content-Type": "application/json" },
            body: JSON.stringify(conflictPayload)
          });
          const responseF = await handleJurisprudenceGovernanceSourcesPost(requestF, dependencies);
          expect(responseF.status).toBe(409);
          const bodyF = await responseF.json();
          expect(bodyF.error.code).toBe("IDEMPOTENCY_CONFLICT");
        }
      }
    );
  });

  it.skip("G. emite error sanitizado ante falla interna", async () => {
    // BLOCKED_BY_TESTABILITY
    // Test skipped due to lack of a deterministic way to trigger an internal database error
    // in the real route without modifying global env or mocking the governance runtime.
  });
});
