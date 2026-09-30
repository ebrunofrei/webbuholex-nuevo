import { describe, expect, it, beforeAll } from "vitest";
import { handleJurisprudenceGovernanceSourceBindingsPost } from "@/lib/jurisprudence/jurisprudence-governance-http-handler";
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

// 0. GLOBAL DB MOCKS
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

describe("Jurisprudence Source Bindings HTTP Boundary", () => {
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

  it("A. rechaza request sin credenciales", async () => {
    const request = new Request("https://api.example.com/source-bindings", {
      method: "POST",
      headers: { "Origin": origin, "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const dependencies = {
      createAuthenticationRuntime: createAuthFactory({ status: "rejected", reason: "invalid_credentials" })
    };
    const response = await handleJurisprudenceGovernanceSourceBindingsPost(request, dependencies);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("B. rechaza request con usuario sin permiso", async () => {
    const request = new Request("https://api.example.com/source-bindings", {
      method: "POST",
      headers: { "Origin": origin, "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const dependencies = {
      createAuthenticationRuntime: createAuthFactory({ status: "authenticated", principal: forbiddenPrincipal })
    };
    const response = await handleJurisprudenceGovernanceSourceBindingsPost(request, dependencies);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("C. rechaza payload invalido", async () => {
    const request = new Request("https://api.example.com/source-bindings", {
      method: "POST",
      headers: { "Origin": origin, "Content-Type": "application/json" },
      body: JSON.stringify({ invalid: true })
    });
    const dependencies = {
      createAuthenticationRuntime: createAuthFactory({ status: "authenticated", principal: authorizedPrincipal })
    };
    const response = await handleJurisprudenceGovernanceSourceBindingsPost(request, dependencies);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it.skipIf(!process.env.JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL)("D-I: tests en Postgres real", async () => {
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

          // Helper para crear un record
          const recordId = "rec-" + randomUUID().substring(0, 8);
          await runnerSql.begin(async (tx) => {
            await tx`SET LOCAL ROLE jurisprudence_internal_write_runtime`;
            await tx`INSERT INTO jurisprudence_internal.jurisprudence_records (id, slug, record_version, deduplication_key, source_type, source_document_id, normalized_case_number, institution_id, normalized_matter, normalized_search_text, issued_at, editorial_status, publication_status, verification_status, payload_json) VALUES (${recordId}, ${recordId}, 1, ${recordId}, 'test', 'test', 'test', 'test', 'test', 'test', '2026-01-01', 'draft', 'private', 'unverified', '{}'::jsonb)`;
            await tx`INSERT INTO jurisprudence_internal.jurisprudence_record_versions (record_id, version, change_kind, snapshot_json) VALUES (${recordId}, 1, 'creation', '{}'::jsonb)`;
          });

          // Helper para crear una source
          const sourceId = "src-" + randomUUID().substring(0, 8);
          const sourcePayload = {
            sourceId,
            sourceKind: "official_publication",
            originType: "primary_official_document",
            institutionalOrigin: "TEST",
            jurisdiction: "TEST",
            documentReference: "DOC-123-" + randomUUID(),
            sourceUrl: null,
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
            sourceFingerprint: "b".repeat(64),
            metadataVersion: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await runnerSql.begin(async (tx) => {
            await tx`SET LOCAL ROLE jurisprudence_internal_write_runtime`;
            await tx`INSERT INTO jurisprudence_internal.jurisprudence_governed_sources (source_id, payload_json) VALUES (${sourceId}, ${sourcePayload}::jsonb)`;
          });

          const dependencies = {
            createAuthenticationRuntime: createAuthFactory({ status: "authenticated", principal: authorizedPrincipal })
          };

          const validPayload = {
            context: {
              requestId: "req-" + randomUUID().substring(0, 8),
              actorReference: "auth0-1234567890",
              requestedAt: new Date().toISOString(),
            },
            sourceId,
            recordId,
            expectedRecordVersion: 1,
            bindingKind: "official_basis",
            isPrimarySource: true,
            secondarySourceJustificationReference: null,
            idempotencyKey: "idem-" + randomUUID()
          };

          // D. Valid binding
          const requestD = new Request("https://api.example.com/source-bindings", {
            method: "POST",
            headers: { "Origin": origin, "Content-Type": "application/json" },
            body: JSON.stringify(validPayload)
          });
          const responseD = await handleJurisprudenceGovernanceSourceBindingsPost(requestD, dependencies);
          const bodyD = await responseD.json();
          expect(responseD.status).toBe(201);
          expect(bodyD.success).toBe(true);
          const bindingId = bodyD.data.binding.bindingId;

          const rows = await runnerSql.begin(async (tx) => {
            await tx`SET LOCAL ROLE jurisprudence_internal_read_runtime`;
            return tx`SELECT binding_id FROM jurisprudence_internal.jurisprudence_source_bindings WHERE binding_id = ${bindingId}`;
          });
          expect(rows.length).toBe(1);

          // E. Idempotent Replay
          const requestE = new Request("https://api.example.com/source-bindings", {
            method: "POST",
            headers: { "Origin": origin, "Content-Type": "application/json" },
            body: JSON.stringify(validPayload)
          });
          const responseE = await handleJurisprudenceGovernanceSourceBindingsPost(requestE, dependencies);
          expect([200, 201]).toContain(responseE.status);
          const bodyE = await responseE.json();
          expect(bodyE.data.binding.bindingId).toBe(bindingId);

          const rowsE = await runnerSql.begin(async (tx) => {
            await tx`SET LOCAL ROLE jurisprudence_internal_read_runtime`;
            return tx`SELECT binding_id FROM jurisprudence_internal.jurisprudence_source_bindings WHERE binding_id = ${bindingId}`;
          });
          expect(rowsE.length).toBe(1); // no duplicado

          // F. Idempotency Conflict
          const conflictPayload = {
            ...validPayload,
            bindingKind: "supporting_evidence"
          };
          const requestF = new Request("https://api.example.com/source-bindings", {
            method: "POST",
            headers: { "Origin": origin, "Content-Type": "application/json" },
            body: JSON.stringify(conflictPayload)
          });
          const responseF = await handleJurisprudenceGovernanceSourceBindingsPost(requestF, dependencies);
          expect(responseF.status).toBe(409);
          const bodyF = await responseF.json();
          expect(bodyF.error.code).toBe("IDEMPOTENCY_CONFLICT");

          // G. SOURCE NOT ELIGIBLE (disputed)
          const sourceIdDisputed = "src-" + randomUUID().substring(0, 8);
          const sourcePayloadDisputed = {
            ...sourcePayload,
            sourceId: sourceIdDisputed,
            provenanceStatus: "disputed"
          };
          await runnerSql.begin(async (tx) => {
            await tx`SET LOCAL ROLE jurisprudence_internal_write_runtime`;
            await tx`INSERT INTO jurisprudence_internal.jurisprudence_governed_sources (source_id, payload_json) VALUES (${sourceIdDisputed}, ${sourcePayloadDisputed}::jsonb)`;
          });
          const payloadG = {
            ...validPayload,
            sourceId: sourceIdDisputed,
            idempotencyKey: "idem-" + randomUUID()
          };
          const requestG = new Request("https://api.example.com/source-bindings", {
            method: "POST",
            headers: { "Origin": origin, "Content-Type": "application/json" },
            body: JSON.stringify(payloadG)
          });
          const responseG = await handleJurisprudenceGovernanceSourceBindingsPost(requestG, dependencies);
          expect(responseG.status).toBe(422);
          const bodyG = await responseG.json();
          expect(bodyG.error.code).toBe("SOURCE_NOT_ELIGIBLE");

          // H. VERSION CONFLICT
          const payloadH = {
            ...validPayload,
            expectedRecordVersion: 2,
            idempotencyKey: "idem-" + randomUUID()
          };
          const requestH = new Request("https://api.example.com/source-bindings", {
            method: "POST",
            headers: { "Origin": origin, "Content-Type": "application/json" },
            body: JSON.stringify(payloadH)
          });
          const responseH = await handleJurisprudenceGovernanceSourceBindingsPost(requestH, dependencies);
          expect(responseH.status).toBe(409);
          const bodyH = await responseH.json();
          expect(bodyH.error.code).toBe("VERSION_CONFLICT");

          // I. SECONDARY SOURCE RULE
          const sourceIdSec = "src-" + randomUUID().substring(0, 8);
          const sourcePayloadSec = {
            ...sourcePayload,
            sourceId: sourceIdSec,
            sourceKind: "secondary_reference"
          };
          await runnerSql.begin(async (tx) => {
            await tx`SET LOCAL ROLE jurisprudence_internal_write_runtime`;
            await tx`INSERT INTO jurisprudence_internal.jurisprudence_governed_sources (source_id, payload_json) VALUES (${sourceIdSec}, ${sourcePayloadSec}::jsonb)`;
          });
          const payloadI = {
            ...validPayload,
            sourceId: sourceIdSec,
            isPrimarySource: true,
            idempotencyKey: "idem-" + randomUUID()
          };
          // isPrimarySource = true para secondary_reference sin justificacion falla en dominio
          const requestI = new Request("https://api.example.com/source-bindings", {
            method: "POST",
            headers: { "Origin": origin, "Content-Type": "application/json" },
            body: JSON.stringify(payloadI)
          });
          const responseI = await handleJurisprudenceGovernanceSourceBindingsPost(requestI, dependencies);
          expect(responseI.status).toBe(422);
          const bodyI = await responseI.json();
          expect(bodyI.error.code).toBe("SOURCE_NOT_ELIGIBLE");
        }
      }
    );
  });

  it.skip("J. emite error sanitizado ante falla interna", async () => {
    // BLOCKED_BY_TESTABILITY
  });
});
