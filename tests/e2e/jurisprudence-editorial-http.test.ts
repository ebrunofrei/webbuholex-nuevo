// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { withFixedSchemas } from '../helpers/jurisprudence-migration-harness';
import { drizzle } from 'drizzle-orm/postgres-js';
import fs from 'fs';
import path from 'path';
import { randomUUID } from "node:crypto";

import { handleJurisprudenceEditorialCasesPost } from "@/lib/jurisprudence/jurisprudence-editorial-http-handler";
import { createJurisprudenceEditorialRuntime } from "@/lib/jurisprudence/jurisprudence-editorial-runtime";
import { PostgresJurisprudenceRepository } from '@/lib/jurisprudence/postgres-jurisprudence-repository';
import { createJurisprudenceInternalApi } from '@/lib/jurisprudence-application-factory';
import { createFictitiousJurisprudenceRecord } from '@/tests/helpers/jurisprudence-record-fixture';
import * as schema from '@/database/schema';
import { vi } from "vitest";

import type {
  JurisprudenceAuthenticationRuntime,
  JurisprudenceAuthenticationRuntimeResult
} from "@/lib/jurisprudence/jurisprudence-authentication-runtime";

import type {
  JurisprudenceAuthenticator,
  JurisprudenceAuthenticationResult
} from "@/types/jurisprudence-security";

vi.mock("@/lib/authentication-configuration", () => ({
  loadAuthenticationConfiguration: () => ({
    status: "configured_for_test",
    allowedOrigins: ["https://api.example.com"]
  })
}));

function createAuthFactory(
  result: JurisprudenceAuthenticationResult | Error
) {
  return (): JurisprudenceAuthenticationRuntimeResult => {
    if (result instanceof Error) {
      throw result;
    }

    return {
      status: "configured",
      runtime: {
        authenticator: {
          authenticate: async () => result
        } satisfies JurisprudenceAuthenticator,
        close: async () => {}
      } satisfies JurisprudenceAuthenticationRuntime
    } satisfies JurisprudenceAuthenticationRuntimeResult;
  };
}

const authorizedPrincipal = {
  kind: "human",
  subjectId: "auth0-1234567890",
  roles: [
    "jurisprudence_admin"
  ],
  authenticationLevel: "authenticated",
  issuedAt: new Date().toISOString()
} as const;

const forbiddenPrincipal = {
  kind: "human",
  subjectId: "auth0-forbidden",
  roles: ["jurisprudence_reader"],
  authenticationLevel: "authenticated",
  issuedAt: new Date().toISOString()
} as const;

process.env.AUTH_PROVIDER_KIND = "auth0";
process.env.AUTH_ISSUER = "https://auth.example.com";
process.env.AUTH_CLIENT_ID = "client-id";
process.env.AUTH_AUDIENCE = "audience";
process.env.AUTH_COOKIE_NAME = "cookie";
process.env.AUTH_ABSOLUTE_TTL_SECONDS = "3600";
process.env.AUTH_IDLE_TTL_SECONDS = "1800";
process.env.AUTH_ALLOWED_ORIGINS = "https://api.example.com";
process.env.AUTH_ENVIRONMENT = "test";
process.env.AUTH_CLIENT_SECRET_REFERENCE = "secret";

describe("Jurisprudence Editorial HTTP E2E", () => {
  const origin = "https://api.example.com";

  it("A. rechaza request no autenticado", async () => {
    const request = new Request("https://api.example.com/editorial/cases", {
      method: "POST",
      headers: { "Origin": origin, "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const dependencies = {
      createAuthenticationRuntime: createAuthFactory({ status: "rejected", reason: "invalid_credentials" })
    };
    const response = await handleJurisprudenceEditorialCasesPost(request, dependencies);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("B. rechaza request con usuario sin permiso", async () => {
    const request = new Request("https://api.example.com/editorial/cases", {
      method: "POST",
      headers: { "Origin": origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "open_case",
        command: {
          recordId: "rec-123",
          expectedRecordVersion: 1,
          purpose: "Validar resolucion",
          idempotencyKey: "idem-123"
        }
      })
    });
    const dependencies = {
      createAuthenticationRuntime: createAuthFactory({ status: "authenticated", principal: forbiddenPrincipal })
    };
    const response = await handleJurisprudenceEditorialCasesPost(request, dependencies);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("C. rechaza payload invalido", async () => {
    const request = new Request("https://api.example.com/editorial/cases", {
      method: "POST",
      headers: { "Origin": origin, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invalid_action", command: {} })
    });
    const dependencies = {
      createAuthenticationRuntime: createAuthFactory({ status: "authenticated", principal: authorizedPrincipal })
    };
    const response = await handleJurisprudenceEditorialCasesPost(request, dependencies);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it.skipIf(!process.env.JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL)("D-M: Secuencia Editorial E2E en Postgres real", async () => {
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
          const dbWrite = drizzle(runnerSql, { schema });
          const dbRead = drizzle(runnerSql);

          const internalRepo = new PostgresJurisprudenceRepository({
            getWriteDatabase: () => dbWrite
          });

          const api = createJurisprudenceInternalApi({
            repository: internalRepo
          });

          const createEditorialRuntimeForTest = () =>
            createJurisprudenceEditorialRuntime({
              getInternalReadDatabase: () => dbRead,
              getInternalWriteDatabase: () => dbWrite
            });

          // Seed a real record
          const ctxApp = { requestId: "req-app-001", actor: { kind: "internal_test" as const, id: "actor-1" }, operationSource: "test" as const, requestedAt: new Date().toISOString() };
          const recordInput = createFictitiousJurisprudenceRecord(1);
          const createdRecord = await api.createRecord({ context: ctxApp, idempotencyKey: 'idem-t0-001', record: recordInput });

          const recordId = createdRecord.id;
          const recordVersion = createdRecord.recordVersion;

          const dependencies = {
            createAuthenticationRuntime: createAuthFactory({
              status: "authenticated",
              principal: authorizedPrincipal
            }),
            createEditorialRuntime: createEditorialRuntimeForTest
          };

          // Helper to send HTTP requests
          const sendCommand = async (action: string, command: unknown) => {
            const request = new Request("https://api.example.com/editorial/cases", {
              method: "POST",
              headers: { "Origin": origin, "Content-Type": "application/json" },
              body: JSON.stringify({ action, command })
            });
            return await handleJurisprudenceEditorialCasesPost(request, dependencies);
          };

          // D. Open Case
          const openCommand = {
            recordId,
            expectedRecordVersion: recordVersion,
            purpose: "Validar resolucion",
            idempotencyKey: "idem-open-" + randomUUID()
          };
          const responseD = await sendCommand("open_case", openCommand);
          const bodyD = await responseD.json();

          expect(responseD.status).toBe(201);

          expect(bodyD.success).toBe(true);

          const caseId = bodyD.data.case.caseId;
          let expectedCaseVersion = bodyD.data.case.caseVersion;
          expect(bodyD.data.status).toBe("open");

          // J. Idempotent Replay (open_case)
          const responseJ = await sendCommand("open_case", openCommand);
          const bodyJ = await responseJ.json();
          expect([200, 201]).toContain(responseJ.status);
          expect(bodyJ.data.case.caseId).toBe(caseId);

          // K. Idempotency Conflict (open_case with different purpose)
          const conflictOpenCommand = { ...openCommand, purpose: "Otro proposito" };
          const responseK = await sendCommand("open_case", conflictOpenCommand);
          expect(responseK.status).toBe(409);
          expect((await responseK.json()).error.code).toBe("IDEMPOTENCY_CONFLICT");

          // L. Version Conflict (assign_review with wrong case version)
          const assignReviewEditorialCmd = {
            caseId,
            expectedRecordVersion: recordVersion,
            expectedCaseVersion: expectedCaseVersion + 99,
            reviewKind: "editorial_review",
            assigneeReference: "editor-1",
            idempotencyKey: "idem-assign-ed-" + randomUUID()
          };
          const responseL = await sendCommand("assign_review", assignReviewEditorialCmd);
          expect(responseL.status).toBe(409);
          expect((await responseL.json()).error.code).toBe("VERSION_CONFLICT");

          // E. Assign Editorial Review
          assignReviewEditorialCmd.expectedCaseVersion = expectedCaseVersion;
          const responseE = await sendCommand("assign_review", assignReviewEditorialCmd);
          const bodyE = await responseE.json();
          expect(responseE.status).toBe(200);
          expect(bodyE.success).toBe(true);
          expectedCaseVersion = bodyE.data.case.caseVersion;

          // F. Assign Legal Verification
          const assignReviewLegalCmd = {
            caseId,
            expectedRecordVersion: recordVersion,
            expectedCaseVersion: expectedCaseVersion,
            reviewKind: "legal_verification",
            assigneeReference: "abogado-1",
            idempotencyKey: "idem-assign-leg-" + randomUUID()
          };
          const responseF = await sendCommand("assign_review", assignReviewLegalCmd);
          const bodyF = await responseF.json();
          expect(responseF.status).toBe(200);
          expect(bodyF.success).toBe(true);
          expectedCaseVersion = bodyF.data.case.caseVersion;

          // M. Illegal State Transition (evaluate before decision)
          const evaluateEarlyCmd = {
            caseId,
            expectedRecordVersion: recordVersion,
            expectedCaseVersion: expectedCaseVersion,
            idempotencyKey: "idem-eval-early-" + randomUUID()
          };
          const responseM = await sendCommand("evaluate_publication", evaluateEarlyCmd);
          expect(responseM.status).toBe(200);
          const bodyM = await responseM.json();
          expect(bodyM.data.eligibleForPublicationEvaluation).toBe(false);
          expectedCaseVersion = bodyM.data.case.caseVersion; // evaluation can bump version if it supercedes, but here it shouldn't actually block evaluation domain-wise, just eligible=false

          // G. Editorial Decision
          // Need to switch the auth user to the assignee for the decision to be accepted!
          // But our auth0-1234567890 has the permission, but maybe not the assignment reference.
          // Let's create an assignee specific dependency
          const editorDependencies = {
            createAuthenticationRuntime: createAuthFactory({
              status: "authenticated",
              principal: {
                ...authorizedPrincipal,
                subjectId: "editor-1"
              }
            }),
            createEditorialRuntime: createEditorialRuntimeForTest
          };
          const editorRequest = new Request("https://api.example.com/editorial/cases", {
            method: "POST",
            headers: { "Origin": origin, "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "record_decision",
              command: {
                caseId,
                expectedRecordVersion: recordVersion,
                expectedCaseVersion: expectedCaseVersion,
                decision: "editorial_approved",
                idempotencyKey: "idem-dec-ed-" + randomUUID()
              }
            })
          });
          const responseG = await handleJurisprudenceEditorialCasesPost(editorRequest, editorDependencies);
          const bodyG = await responseG.json();
          expect(responseG.status).toBe(200);
          expectedCaseVersion = bodyG.data.case.caseVersion;
          expect(bodyG.data.status).toBe("editorially_approved");

          // H. Legal Decision
          const legalDependencies = {
            createAuthenticationRuntime: createAuthFactory({
              status: "authenticated",
              principal: {
                ...authorizedPrincipal,
                subjectId: "abogado-1"
              }
            }),
            createEditorialRuntime: createEditorialRuntimeForTest
          };
          const legalRequest = new Request("https://api.example.com/editorial/cases", {
            method: "POST",
            headers: { "Origin": origin, "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "record_decision",
              command: {
                caseId,
                expectedRecordVersion: recordVersion,
                expectedCaseVersion: expectedCaseVersion,
                decision: "legal_verification_approved",
                idempotencyKey: "idem-dec-leg-" + randomUUID()
              }
            })
          });
          const responseH = await handleJurisprudenceEditorialCasesPost(legalRequest, legalDependencies);
          const bodyH = await responseH.json();
          expect(responseH.status).toBe(200);
          expectedCaseVersion = bodyH.data.case.caseVersion;
          expect(bodyH.data.status).toBe("legally_verified");

          // I. Evaluate Publication
          const evalCmd = {
            caseId,
            expectedRecordVersion: recordVersion,
            expectedCaseVersion: expectedCaseVersion,
            idempotencyKey: "idem-eval-" + randomUUID()
          };
          const responseI = await sendCommand("evaluate_publication", evalCmd);
          const bodyI = await responseI.json();
          expect(responseI.status).toBe(200);
          expect(bodyI.data.status).toBe("verified_for_publication_evaluation");
        }
      }
    );
  });

  it.skip("N. emite error sanitizado ante falla interna", async () => {
    // BLOCKED_BY_TESTABILITY
  });
});
