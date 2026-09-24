// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { withFixedSchemas, requireDefined } from '../helpers/jurisprudence-migration-harness';
import { drizzle } from 'drizzle-orm/postgres-js';
import fs from 'fs';
import path from 'path';

import { PostgresJurisprudenceRepository } from '@/lib/jurisprudence/postgres-jurisprudence-repository';
import { createJurisprudenceInternalApi } from '@/lib/jurisprudence-application-factory';
import { PostgresJurisprudenceEditorialCaseRepository } from '@/lib/postgres-jurisprudence-editorial-case-repository';
import { createJurisprudenceEditorialWorkflow } from '@/lib/jurisprudence-editorial-workflow';
import { PostgresJurisprudencePublicationDossierRepository } from '@/lib/postgres-jurisprudence-publication-dossier-repository';
import { createJurisprudencePublicationGovernanceService } from '@/lib/jurisprudence-publication-governance-service';
import { PostgresJurisprudencePublicationAuthorizationRepository } from '@/lib/postgres-jurisprudence-publication-authorization-repository';
import { createJurisprudencePublicationAuthorizationService } from '@/lib/jurisprudence-publication-authorization-service';
import { createJurisprudencePublicationExecutionRuntime } from '@/lib/jurisprudence/jurisprudence-publication-execution-runtime';
import { createJurisprudencePublicationOutboxProcessor } from '@/lib/jurisprudence/jurisprudence-publication-outbox-composition';
import { PostgresJurisprudencePublicReadRepository } from '@/lib/jurisprudence/postgres-jurisprudence-public-read-repository';

import { createFictitiousJurisprudenceRecord } from '@/tests/helpers/jurisprudence-record-fixture';
import * as schema from '@/database/schema';

const runRealTests = !!process.env.JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL;
const describeBlock = runRealTests ? describe : describe.skip;

describeBlock('FIX-6 Jurisprudence Lifecycle E2E - Local Physical Postgres', () => {

  const now = () => new Date().toISOString();

  it('Executes the full lifecycle T1 to T15', async () => {
    await withFixedSchemas(
      process.env,
      ['jurisprudence_internal', 'jurisprudence_public'],
      {
        setup: async (adminSql) => {
      // MIGRACIONES REALES: execute the whole chain up to 0038
      const migrationDir = path.join(
        __dirname,
        '../../database/migrations',
      );

      const jurisprudenceMigrationFiles = [
        '0018_jurisprudence_foundation.sql',
        '0019_jurisprudence_public_read_security.sql',
        '0020_jurisprudence_public_write_security.sql',
        '0021_jurisprudence_publication_execution_foundation.sql',
        '0022_jurisprudence_publication_outbox_foundation.sql',
        '0023_jurisprudence_publication_command_security.sql',
        '0024_jurisprudence_public_projection_barrier.sql',
        '0025_jurisprudence_public_write_login_hardening.sql',
        '0026_jurisprudence_internal_write_security.sql',
        '0027_jurisprudence_internal_read_security.sql',
        '0028_jurisprudence_publication_outbox_recovery_linkage.sql',
        '0029_jurisprudence_resolution_number_nullable.sql',
        '0030_jurisprudence_public_urls.sql',
        '0031_jurisprudence_publication_workflow_foundation.sql',
        '0032_jurisprudence_role_assignment_persistence.sql',
        '0038_jurisprudence_source_binding_fk.sql',
      ] as const;

      for (const file of jurisprudenceMigrationFiles) {
        const sqlContent = fs.readFileSync(
          path.join(migrationDir, file),
          'utf8',
        );

        await adminSql.unsafe(sqlContent);
      }

        },
        run: async (runnerSql) => {
          const dbWithSchema = drizzle(runnerSql, { schema });
      const dbEmpty = drizzle(runnerSql);
      const getDbWithSchema = () => dbWithSchema;
      const getDbEmpty = () => dbEmpty;


      const createTestIdGenerator = (prefix: string) => {
        let sequence = 0;

        return () => {
          sequence += 1;
          return `${prefix}-${sequence}`;
        };
      };

      const generateEditorialId = createTestIdGenerator('editorial');
      const generateGovernanceId = createTestIdGenerator('governance');
      const generateAuthorizationId = createTestIdGenerator('authorization');

      const internalRepo = new PostgresJurisprudenceRepository({ getWriteDatabase: getDbWithSchema });
      const api = createJurisprudenceInternalApi({ repository: internalRepo });

      const editorialRepo = new PostgresJurisprudenceEditorialCaseRepository({ getReadDatabase: getDbEmpty, getWriteDatabase: getDbWithSchema });
      const editorial = createJurisprudenceEditorialWorkflow({ repository: editorialRepo, api, now: () => new Date().toISOString(), generateId: generateEditorialId, logger: { log: () => {} } });

      const dossierRepo = new PostgresJurisprudencePublicationDossierRepository({ getReadDatabase: getDbEmpty, getWriteDatabase: getDbWithSchema });
      const governance = createJurisprudencePublicationGovernanceService({ repository: dossierRepo, api, editorialWorkflow: editorial, now: () => new Date().toISOString(), generateId: generateGovernanceId, logger: { log: () => {} } });

      const authRepo = new PostgresJurisprudencePublicationAuthorizationRepository({ getReadDatabase: getDbEmpty, getWriteDatabase: getDbWithSchema });
      const authorization = createJurisprudencePublicationAuthorizationService({ repository: authRepo, api, editorialWorkflow: editorial, publicationGovernance: governance, now: () => new Date().toISOString(), generateId: generateAuthorizationId, logger: { log: () => {} } });

      const executionRuntime = createJurisprudencePublicationExecutionRuntime({ getInternalReadDatabase: getDbEmpty, getInternalWriteDatabase: getDbWithSchema });
      const outboxProcessor = createJurisprudencePublicationOutboxProcessor({ getOutboxDatabase: getDbWithSchema, getInternalWriteDatabase: getDbWithSchema, getPublicWriteDatabase: getDbWithSchema });
      const publicReadRepo = new PostgresJurisprudencePublicReadRepository({ getReadDatabase: getDbWithSchema });

      try {
        const ctxApp = { requestId: "req-app-001", actor: { kind: "internal_test" as const, id: "actor-1" }, operationSource: "test" as const, requestedAt: now() };
        const ctxEd = { requestId: "req-ed-001", actorReference: "ed-actor", requestedAt: now() };
        const ctxEdReviewer = { requestId: "req-ed-reviewer-001", actorReference: "ed-reviewer", requestedAt: now() };
        const ctxLegalReviewer = { requestId: "req-leg-reviewer-001", actorReference: "leg-reviewer", requestedAt: now() };
        const ctxGov = { requestId: "req-gov-001", actorReference: "gov-actor", requestedAt: now() };
        const ctxAuth = { requestId: "req-auth-001", actorReference: "auth-actor", requestedAt: now() };
        const ctxExec = { requestId: "req-exec-001", actorReference: "exec-actor", requestedAt: now() };

        // SETUP / T0
        const recordInput = createFictitiousJurisprudenceRecord(1);
        const createdRecord = await api.createRecord({ context: ctxApp, idempotencyKey: 'idem-t0-001', record: recordInput });
        const recordId = createdRecord.id;

        // T1 GOVERNED SOURCE
        const registeredSource = await governance.registerSource({
          context: ctxGov,
          idempotencyKey: 'idem-t1-001',
          source: {
            sourceKind: "official_publication",
            originType: "primary_official_document",
            institutionalOrigin: "INSTITUCIÓN FICTICIA",
            jurisdiction: "JURISDICCIÓN FICTICIA",
            documentReference: "DOC-FICTICIO",
            sourceUrl: "https://example.com/doc",
            sourceDate: "2026-07-01",
            retrievedAt: now(),
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
          }
        });
        const sourceId = registeredSource.source.sourceId;

        // T2 SOURCE BINDING
        const boundSource = await governance.bindSource({
          context: ctxGov,
          idempotencyKey: 'idem-t2-001',
          sourceId,
          recordId,
          expectedRecordVersion: 1,
          bindingKind: "official_basis",
          isPrimarySource: true,
          secondarySourceJustificationReference: null
        });
        const bindingId = boundSource.binding.bindingId;

        // T3 EDITORIAL CASE
        const openedCase = await editorial.openCase({ context: ctxEd, idempotencyKey: 'idem-t3-open-001', recordId, expectedRecordVersion: 1, purpose: "Revisión T3" });
        const caseId = openedCase.case.caseId;
        const assignedEd = await editorial.assignReview({ context: ctxEd, idempotencyKey: 'idem-t3-assign1-001', caseId, expectedRecordVersion: 1, expectedCaseVersion: openedCase.case.caseVersion, reviewKind: 'editorial_review', assigneeReference: 'ed-reviewer' });
        const assignedLeg = await editorial.assignReview({ context: ctxEd, idempotencyKey: 'idem-t3-assign2-001', caseId, expectedRecordVersion: 1, expectedCaseVersion: assignedEd.case.caseVersion, reviewKind: 'legal_verification', assigneeReference: 'leg-reviewer' });
        const approvedEd = await editorial.recordDecision({ context: ctxEdReviewer, idempotencyKey: 'idem-t3-dec1-001', caseId, expectedRecordVersion: 1, expectedCaseVersion: assignedLeg.case.caseVersion, decision: 'editorial_approved' });
        const approvedLeg = await editorial.recordDecision({ context: ctxLegalReviewer, idempotencyKey: 'idem-t3-dec2-001', caseId, expectedRecordVersion: 1, expectedCaseVersion: approvedEd.case.caseVersion, decision: 'legal_verification_approved' });
        const evaluatedEd = await editorial.evaluatePublication({ context: ctxEd, idempotencyKey: 'idem-t3-eval-001', caseId, expectedRecordVersion: 1, expectedCaseVersion: approvedLeg.case.caseVersion });

        // T4 DOSSIER
        const dossierOpen = await governance.openDossier({ context: ctxGov, idempotencyKey: 'idem-t4-open-001', recordId, expectedRecordVersion: 1, editorialCaseId: caseId, expectedEditorialCaseVersion: evaluatedEd.case.caseVersion, sourceBindingIds: [bindingId], institutionalOwnerReference: 'gov-owner' });
        const dossierId = dossierOpen.dossier.dossierId;
        let dVersion = dossierOpen.dossier.version;
        const a1 = await governance.assessProvenance({ context: ctxGov, idempotencyKey: 'idem-t4-a1-001', dossierId, expectedRecordVersion: 1, expectedDossierVersion: dVersion, status: 'verified' }); dVersion = a1.dossier.version;
        const a2 = await governance.assessIntegrity({ context: ctxGov, idempotencyKey: 'idem-t4-a2-001', dossierId, expectedRecordVersion: 1, expectedDossierVersion: dVersion, status: 'checksum_verified' }); dVersion = a2.dossier.version;
        const a3 = await governance.assessRights({ context: ctxGov, idempotencyKey: 'idem-t4-a3-001', dossierId, expectedRecordVersion: 1, expectedDossierVersion: dVersion, status: 'public_display_permitted' }); dVersion = a3.dossier.version;
        const a4 = await governance.assessPrivacy({ context: ctxGov, idempotencyKey: 'idem-t4-a4-001', dossierId, expectedRecordVersion: 1, expectedDossierVersion: dVersion, status: 'approved_for_public_projection', riskCategories: [], otherRiskReference: null }); dVersion = a4.dossier.version;
        const a5 = await governance.assessPublicProjection({ context: ctxGov, idempotencyKey: 'idem-t4-a5-001', dossierId, expectedRecordVersion: 1, expectedDossierVersion: dVersion, status: 'approved' }); dVersion = a5.dossier.version;
        await governance.evaluateDossier({ context: ctxGov, idempotencyKey: 'idem-t4-eval-001', dossierId, expectedRecordVersion: 1, expectedDossierVersion: dVersion });

        // T5 AUTHORIZATION
        const authoResult = await authorization.authorizePublication({
          context: ctxAuth,
          idempotencyKey: 'idem-t5-001',
          publicationDossierId: dossierId,
          expectedRecordVersion: 1,
          institutionalAuthorityRef: 'auth-boss',
          decisionRef: 'dec-1',
          authorizationScopeRef: 'scope-1',
          effectiveFrom: now(),
          expiresAt: "2026-12-31T23:59:59.000Z",
          reasons: ["authorized for test"],
          conditions: [
            "source_governance_complete",
            "editorial_review_current",
            "legal_verification_current",
            "rights_assessment_accepted",
            "privacy_assessment_accepted",
            "public_projection_assessed",
            "institutional_owner_confirmed",
            "publication_scope_defined",
            "validity_period_defined",
            "revocation_procedure_defined",
          ]
        });
        const authCaseId = authoResult.authorizationCase.authorizationCaseId;

        // T6 EXECUTION
        const execResult = await executionRuntime.service.executePublication({
          context: ctxExec,
          idempotencyKey: 'idem-t6-001',
          recordId,
          expectedRecordVersion: 1,
          editorialCaseId: caseId,
          publicationDossierId: dossierId,
          authorizationCaseId: authCaseId
        });
        expect(execResult.publicationExecuted).toBe(true);
        const executionId = execResult.execution.executionId;

        // IDEMPOTENCY PROOF (CORRECTION 7)
        const execResultIdempotent = await executionRuntime.service.executePublication({
          context: ctxExec,
          idempotencyKey: 'idem-t6-001',
          recordId,
          expectedRecordVersion: 1,
          editorialCaseId: caseId,
          publicationDossierId: dossierId,
          authorizationCaseId: authCaseId
        });
        expect(execResultIdempotent).toEqual(execResult);

        // T7 PHYSICAL OUTBOX
        const outboxRows = await runnerSql.begin(async (transaction) => {
          await transaction`
            SET LOCAL ROLE jurisprudence_publication_outbox_runtime
          `;

          return transaction`
            SELECT *
            FROM jurisprudence_internal.jurisprudence_publication_outbox
            WHERE execution_id = ${executionId}
          `;
        });

        expect(outboxRows.length).toBe(1);

        const firstOutboxRow = requireDefined(
          outboxRows[0],
          'Expected outbox row to exist',
        );

        expect(firstOutboxRow.status).toBe('pending');

        // T8 PROCESSOR
        const processResult = await outboxProcessor.processNext();
        expect(processResult).not.toBe("NO_WORK");

        // IDEMPOTENCY PROOF FOR PROCESSOR
        const processResultIdempotent = await outboxProcessor.processNext();
        expect(processResultIdempotent).toBe("NO_WORK");

        // T9 PUBLIC PROJECTION
        const publicRows = await runnerSql.begin(async (transaction) => {
          await transaction`
            SET LOCAL ROLE jurisprudence_public_read_runtime
          `;

          return transaction`
            SELECT slug, id
            FROM jurisprudence_public.published_records
            WHERE id = ${recordId}
              AND record_version = 1
          `;
        });
        expect(publicRows.length).toBe(1);
        const firstPublicRow = requireDefined(publicRows[0], 'Expected public projection row to exist');

        // T10 PUBLIC READ
        const publicSlug = firstPublicRow.slug;

        if (typeof publicSlug !== 'string') {
          throw new Error('Expected public projection slug to be a string');
        }

        const publicReadRecord =
          await publicReadRepo.getBySlug(publicSlug);
        const visiblePublicRecord = requireDefined(
          publicReadRecord ?? undefined,
          'Expected published record to be publicly readable',
        );

        expect(visiblePublicRecord.caseNumber).toBe(recordInput.caseNumber);

        // T11 publicationStatus SYNC
        const internalRecord = await api.getInternalRecord({ context: ctxApp, id: recordId });
        expect(internalRecord.record.publicationStatus).toBe('published');

        // T12 WITHDRAWAL
        await executionRuntime.service.withdrawPublication({
          context: ctxExec,
          idempotencyKey: 'idem-t12-001',
          executionId: executionId,
          expectedVersion: 1,
          reason: 'institutional_withdrawal'
        });

        // T13 WITHDRAW PROCESSOR
        const processWithdrawResult = await outboxProcessor.processNext();
        expect(processWithdrawResult).not.toBe("NO_WORK");

        // T14 PUBLIC REMOVAL / INACTIVATION
        const publicRowsAfterWithdraw = await runnerSql.begin(
          async (transaction) => {
            await transaction`
              SET LOCAL ROLE jurisprudence_public_read_runtime
            `;

            return transaction`
              SELECT *
              FROM jurisprudence_public.published_records
              WHERE id = ${recordId}
            `;
          },
        );
        expect(publicRowsAfterWithdraw.length).toBe(0);

        // T15 PUBLIC READ AFTER WITHDRAWAL
        const publicReadRecordAfterWithdraw =
          await publicReadRepo.getBySlug(publicSlug);

        expect(publicReadRecordAfterWithdraw).toBeNull();

        // T15 check internal sync after withdrawal
        const internalRecordAfterWithdraw = await api.getInternalRecord({ context: ctxApp, id: recordId });
        expect(internalRecordAfterWithdraw.record.publicationStatus).toBe('withdrawn');

      } finally {
        await executionRuntime.close();
      }
    }
  });
  });
});
