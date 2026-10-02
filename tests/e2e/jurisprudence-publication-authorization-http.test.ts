// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { withFixedSchemas } from '../helpers/jurisprudence-migration-harness';
import { drizzle } from 'drizzle-orm/postgres-js';
import fs from 'fs';
import path from 'path';
import { randomUUID } from "node:crypto";
import { handleJurisprudencePublicationAuthorizationCommandsPost } from "@/lib/jurisprudence-publication-authorization-http-handler";
import { createJurisprudencePublicationAuthorizationRuntime } from "@/lib/jurisprudence/jurisprudence-publication-authorization-runtime";
import { createJurisprudenceInternalApi } from '@/lib/jurisprudence-application-factory';
import { PostgresJurisprudenceRepository } from '@/lib/jurisprudence/postgres-jurisprudence-repository';
import { PostgresJurisprudenceEditorialCaseRepository } from '@/lib/postgres-jurisprudence-editorial-case-repository';
import { PostgresJurisprudencePublicationDossierRepository } from '@/lib/postgres-jurisprudence-publication-dossier-repository';
import { createJurisprudenceEditorialWorkflow } from '@/lib/jurisprudence-editorial-workflow';
import { createJurisprudencePublicationGovernanceService } from '@/lib/jurisprudence-publication-governance-service';
import { createFictitiousJurisprudenceRecord } from '@/tests/helpers/jurisprudence-record-fixture';
import * as schema from '@/database/schema';
import { vi } from "vitest";
import { JURISPRUDENCE_PUBLICATION_AUTHORIZATION_REQUIRED_CONDITIONS } from "@/types/jurisprudence-publication-authorization";
import type { JurisprudenceAuthenticationRuntime, JurisprudenceAuthenticationRuntimeResult } from "@/lib/jurisprudence/jurisprudence-authentication-runtime";
import { createJurisprudenceAuthenticationRuntime } from "@/lib/jurisprudence/jurisprudence-authentication-runtime";
import type { JurisprudenceAuthenticator, JurisprudenceAuthenticationResult } from "@/types/jurisprudence-security";

vi.mock("@/lib/authentication-configuration", () => ({
  loadAuthenticationConfiguration: () => ({ status: "configured_for_test", allowedOrigins: ["https://api.example.com"] })
}));

vi.mock("@/lib/jurisprudence/jurisprudence-authentication-runtime", () => ({
  createJurisprudenceAuthenticationRuntime: vi.fn()
}));

vi.mock("@/lib/jurisprudence/jurisprudence-publication-authorization-runtime", () => ({
  createJurisprudencePublicationAuthorizationRuntime: vi.fn()
}));

function createAuthFactory(result: JurisprudenceAuthenticationResult | Error) {
  return (): JurisprudenceAuthenticationRuntimeResult => {
    if (result instanceof Error) throw result;
    return {
      status: "configured",
      runtime: { authenticator: { authenticate: async () => result } satisfies JurisprudenceAuthenticator, close: async () => {} } satisfies JurisprudenceAuthenticationRuntime
    } satisfies JurisprudenceAuthenticationRuntimeResult;
  };
}

const authorizedPrincipal = { kind: "human", subjectId: "auth0-1234567890", roles: ["jurisprudence_admin"], authenticationLevel: "authenticated", issuedAt: new Date().toISOString() } as const;
const forbiddenPrincipal = { kind: "human", subjectId: "auth0-forbidden", roles: ["jurisprudence_reader"], authenticationLevel: "authenticated", issuedAt: new Date().toISOString() } as const;

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

describe("Jurisprudence Publication Authorization HTTP E2E", () => {
  const origin = "https://api.example.com";

  it("A. rechaza request no autenticado", async () => {
    const request = new Request("https://api.example.com/authorizations/commands", { method: "POST", headers: { "Origin": origin, "Content-Type": "application/json" }, body: JSON.stringify({}) });
    vi.mocked(createJurisprudenceAuthenticationRuntime).mockImplementation(createAuthFactory({ status: "rejected", reason: "invalid_credentials" }));
    const response = await handleJurisprudencePublicationAuthorizationCommandsPost(request);
    expect(response.status).toBe(401);
    vi.mocked(createJurisprudenceAuthenticationRuntime).mockRestore();
  });

  it("B. rechaza request con usuario sin permiso", async () => {
    const request = new Request("https://api.example.com/authorizations/commands", { method: "POST", headers: { "Origin": origin, "Content-Type": "application/json" }, body: JSON.stringify({ action: "evaluate", payload: {} }) });
    vi.mocked(createJurisprudenceAuthenticationRuntime).mockImplementation(createAuthFactory({ status: "authenticated", principal: forbiddenPrincipal }));
    const response = await handleJurisprudencePublicationAuthorizationCommandsPost(request);
    expect(response.status).toBe(403);
    vi.mocked(createJurisprudenceAuthenticationRuntime).mockRestore();
  });

  it("C. rechaza payload invalido", async () => {
    const request = new Request("https://api.example.com/authorizations/commands", { method: "POST", headers: { "Origin": origin, "Content-Type": "application/json" }, body: JSON.stringify({ action: "invalid_action", payload: {} }) });
    vi.mocked(createJurisprudenceAuthenticationRuntime).mockImplementation(createAuthFactory({ status: "authenticated", principal: authorizedPrincipal }));
    const response = await handleJurisprudencePublicationAuthorizationCommandsPost(request);
    expect(response.status).toBe(400);
    vi.mocked(createJurisprudenceAuthenticationRuntime).mockRestore();
  });

  it.skipIf(!process.env.JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL)("D. Secuencia Authorization E2E en Postgres real", async () => {
    await withFixedSchemas(
      process.env,
      ["jurisprudence_internal", "jurisprudence_public"],
      {
        setup: async (adminSql) => {
          const migrationDir = path.join(__dirname, "../../database/migrations");
          const files = [
            "0018_jurisprudence_foundation.sql", "0019_jurisprudence_public_read_security.sql", "0020_jurisprudence_public_write_security.sql",
            "0021_jurisprudence_publication_execution_foundation.sql", "0022_jurisprudence_publication_outbox_foundation.sql", "0023_jurisprudence_publication_command_security.sql",
            "0024_jurisprudence_public_projection_barrier.sql", "0025_jurisprudence_public_write_login_hardening.sql", "0026_jurisprudence_internal_write_security.sql",
            "0027_jurisprudence_internal_read_security.sql", "0028_jurisprudence_publication_outbox_recovery_linkage.sql", "0029_jurisprudence_resolution_number_nullable.sql",
            "0030_jurisprudence_public_urls.sql", "0031_jurisprudence_publication_workflow_foundation.sql", "0032_jurisprudence_role_assignment_persistence.sql",
            "0038_jurisprudence_source_binding_fk.sql"
          ];
          for (const file of files) await adminSql.unsafe(fs.readFileSync(path.join(migrationDir, file), "utf8"));
        },
        run: async (runnerSql) => {
          const dbWrite = drizzle(runnerSql, { schema });
          const dbRead = drizzle(runnerSql);

          const now = () => new Date().toISOString();
          const generateId = () => randomUUID();
          const logger = { log: () => undefined };

          const getRead = () => dbRead;
          const getWrite = () => dbWrite;

          const internalRepo = new PostgresJurisprudenceRepository({ getWriteDatabase: getWrite });
          const api = createJurisprudenceInternalApi({ repository: internalRepo });

          const editorialRepository = new PostgresJurisprudenceEditorialCaseRepository({ getReadDatabase: getRead, getWriteDatabase: getWrite });
          const editorial = createJurisprudenceEditorialWorkflow({ api, repository: editorialRepository, now, generateId, logger });

          const governanceRepository = new PostgresJurisprudencePublicationDossierRepository({ getReadDatabase: getRead, getWriteDatabase: getWrite });
          const governance = createJurisprudencePublicationGovernanceService({ api, editorialWorkflow: editorial, repository: governanceRepository, now, generateId, logger });

          // Helper to send HTTP requests
          const sendCommand = async (action: string, payload: unknown) => {
            const request = new Request("https://api.example.com/authorizations/commands", { method: "POST", headers: { "Origin": origin, "Content-Type": "application/json" }, body: JSON.stringify({ action, payload }) });
            return await handleJurisprudencePublicationAuthorizationCommandsPost(request);
          };

          const ctxApp = { requestId: "req-app-001", actor: { kind: "internal_test" as const, id: "actor-1" }, operationSource: "test" as const, requestedAt: now() };
          const recordInput = createFictitiousJurisprudenceRecord(1);
          const createdRecord = await api.createRecord({ context: ctxApp, idempotencyKey: 'idem-t0-001', record: recordInput });
          const recordId = createdRecord.id;

          const ctxEd = { requestId: "req-ed-001", actorReference: "actor-1", requestedAt: now() };
          const opened = await editorial.openCase({ context: ctxEd, recordId, expectedRecordVersion: 1, purpose: "Rev", idempotencyKey: randomUUID() });
          const assignedEd = await editorial.assignReview({ context: ctxEd, caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: opened.case.caseVersion, reviewKind: "editorial_review", assigneeReference: "actor-1", idempotencyKey: randomUUID() });
          const assignedLg = await editorial.assignReview({ context: ctxEd, caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: assignedEd.case.caseVersion, reviewKind: "legal_verification", assigneeReference: "actor-2", idempotencyKey: randomUUID() });
          const decEd = await editorial.recordDecision({ context: ctxEd, caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: assignedLg.case.caseVersion, decision: "editorial_approved", idempotencyKey: randomUUID() });
          const ctxLg = { requestId: "req-lg-001", actorReference: "actor-2", requestedAt: now() };
          const decLg = await editorial.recordDecision({ context: ctxLg, caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: decEd.case.caseVersion, decision: "legal_verification_approved", idempotencyKey: randomUUID() });
          const evalEd = await editorial.evaluatePublication({ context: ctxEd, caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: decLg.case.caseVersion, idempotencyKey: randomUUID() });

          const ctxGov = { requestId: "req-gov-001", actorReference: "actor-1", requestedAt: now() };
          const registered = await governance.registerSource({ context: ctxGov, source: { sourceKind: "official_publication", originType: "primary_official_document", institutionalOrigin: "INST", jurisdiction: "JUR", documentReference: "DOC-1", sourceUrl: "https://x", sourceDate: "2026-07-01", retrievedAt: now(), custodyStatus: "controlled_internal", provenanceStatus: "verified", integrityStatus: "checksum_verified", rightsStatus: "public_display_permitted", privacyStatus: "approved_for_public_projection", availabilityStatus: "available_internal", verificationStatus: "verified", sourceChecksum: "a".repeat(64), sourceChecksumAlgorithm: "sha256", sourceFingerprint: "b".repeat(64) }, idempotencyKey: randomUUID() });
          const bound = await governance.bindSource({ context: ctxGov, sourceId: registered.source.sourceId, recordId, expectedRecordVersion: 1, bindingKind: "official_basis", isPrimarySource: true, secondarySourceJustificationReference: null, idempotencyKey: randomUUID() });
          const dossier = await governance.openDossier({ context: ctxGov, recordId, expectedRecordVersion: 1, editorialCaseId: evalEd.case.caseId, expectedEditorialCaseVersion: evalEd.case.caseVersion, sourceBindingIds: [bound.binding.bindingId], institutionalOwnerReference: "actor-1", idempotencyKey: randomUUID() });
          const p1 = await governance.assessProvenance({ context: ctxGov, dossierId: dossier.dossier.dossierId, expectedRecordVersion: 1, expectedDossierVersion: dossier.dossier.version, status: "verified", idempotencyKey: randomUUID() });
          const p2 = await governance.assessIntegrity({ context: ctxGov, dossierId: dossier.dossier.dossierId, expectedRecordVersion: 1, expectedDossierVersion: p1.dossier.version, status: "checksum_verified", idempotencyKey: randomUUID() });
          const p3 = await governance.assessRights({ context: ctxGov, dossierId: dossier.dossier.dossierId, expectedRecordVersion: 1, expectedDossierVersion: p2.dossier.version, status: "public_display_permitted", idempotencyKey: randomUUID() });
          const p4 = await governance.assessPrivacy({ context: ctxGov, dossierId: dossier.dossier.dossierId, expectedRecordVersion: 1, expectedDossierVersion: p3.dossier.version, status: "approved_for_public_projection", riskCategories: [], otherRiskReference: null, idempotencyKey: randomUUID() });
          const p5 = await governance.assessPublicProjection({ context: ctxGov, dossierId: dossier.dossier.dossierId, expectedRecordVersion: 1, expectedDossierVersion: p4.dossier.version, status: "approved", idempotencyKey: randomUUID() });
          const completed = await governance.evaluateDossier({ context: ctxGov, dossierId: dossier.dossier.dossierId, expectedRecordVersion: 1, expectedDossierVersion: p5.dossier.version, idempotencyKey: randomUUID() });

          vi.mocked(createJurisprudenceAuthenticationRuntime).mockImplementation(createAuthFactory({ status: "authenticated", principal: authorizedPrincipal }));
          const { createJurisprudencePublicationAuthorizationRuntime: realRuntimeFactory } = await vi.importActual<typeof import("@/lib/jurisprudence/jurisprudence-publication-authorization-runtime")>("@/lib/jurisprudence/jurisprudence-publication-authorization-runtime");
          vi.mocked(createJurisprudencePublicationAuthorizationRuntime).mockImplementation(() => realRuntimeFactory({ getInternalReadDatabase: getRead, getInternalWriteDatabase: getWrite }));

          // Evaluate
          const evalRes = await sendCommand("evaluate", { publicationDossierId: completed.dossier.dossierId, expectedRecordVersion: 1 });
          expect(evalRes.status).toBe(200);
          expect((await evalRes.json()).data.decision).toBe("ready_for_institutional_decision");

          // Authorize
          const authCmd = { publicationDossierId: completed.dossier.dossierId, expectedRecordVersion: 1, institutionalAuthorityRef: "auth", decisionRef: "dec", authorizationScopeRef: "scope", effectiveFrom: now(), reasons: ["reason-ok"], conditions: JURISPRUDENCE_PUBLICATION_AUTHORIZATION_REQUIRED_CONDITIONS, idempotencyKey: randomUUID() };
          const authRes = await sendCommand("authorize", authCmd);
          if (authRes.status !== 201) console.log("AUTHORIZE ERROR:", await authRes.clone().json());
          expect(authRes.status).toBe(201);
          const bodyAuth = await authRes.json();
          expect(bodyAuth.data.authorizationCase.status).toBe("authorized");
          expect(bodyAuth.data.publicationAuthorizationGranted).toBe(true);

          // Version conflict
          const authResConflict = await sendCommand("authorize", { ...authCmd, expectedRecordVersion: 2 });
          expect(authResConflict.status).toBe(409);

          // Idempotency replay
          const authResReplay = await sendCommand("authorize", authCmd);
          expect([200, 201]).toContain(authResReplay.status);

          // Idempotency conflict
          const authResIdemConflict = await sendCommand("authorize", { ...authCmd, decisionRef: "other" });
          expect(authResIdemConflict.status).toBe(409);

          vi.mocked(createJurisprudenceAuthenticationRuntime).mockRestore();
          vi.mocked(createJurisprudencePublicationAuthorizationRuntime).mockRestore();
        }
      }
    );
  });
});
