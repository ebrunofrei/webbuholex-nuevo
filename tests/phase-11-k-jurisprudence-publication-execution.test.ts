// @vitest-environment node

import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { publicServices } from "@/data/services";
import { rentalHousingContract } from "@/data/template-catalog";
import { InMemoryJurisprudenceEditorialCaseRepository } from "@/lib/in-memory-jurisprudence-editorial-case-repository";
import { InMemoryJurisprudencePublicationAuthorizationRepository } from "@/lib/in-memory-jurisprudence-publication-authorization-repository";
import { InMemoryJurisprudencePublicationDossierRepository } from "@/lib/in-memory-jurisprudence-publication-dossier-repository";
import {
  InMemoryJurisprudencePublicProjectionRepository,
  InMemoryJurisprudencePublicationExecutionRepository,
} from "@/lib/in-memory-jurisprudence-publication-execution-repository";
import { InMemoryJurisprudenceRepository } from "@/lib/in-memory-jurisprudence-repository";
import { createJurisprudenceInternalApi } from "@/lib/jurisprudence-application-factory";
import { createJurisprudenceEditorialWorkflow } from "@/lib/jurisprudence-editorial-workflow";
import { createJurisprudencePublicationAuthorizationService } from "@/lib/jurisprudence-publication-authorization-service";
import { evaluateJurisprudencePublicationExecutionReadiness } from "@/lib/jurisprudence-publication-execution-readiness";
import { createJurisprudencePublicationExecutionService } from "@/lib/jurisprudence-publication-execution-service";
import { createJurisprudencePublicationGovernanceService } from "@/lib/jurisprudence-publication-governance-service";
import {
  evaluateJurisprudencePublicationExecutionCommandSchema,
  executeJurisprudencePublicationCommandSchema,
  jurisprudencePublicProjectionSchema,
  supersedeJurisprudencePublicationExecutionCommandSchema,
  withdrawJurisprudencePublicationCommandSchema,
} from "@/lib/schemas/jurisprudence-publication-execution";
import {
  SqliteJurisprudencePublicProjectionRepository,
  SqliteJurisprudencePublicationExecutionRepository,
} from "@/lib/sqlite-jurisprudence-publication-execution-repository";
import { createFictitiousJurisprudenceRecord } from "@/tests/helpers/jurisprudence-record-fixture";
import { JURISPRUDENCE_PUBLICATION_AUTHORIZATION_REQUIRED_CONDITIONS } from "@/types/jurisprudence-publication-authorization";
import type { JurisprudenceApplicationContext, JurisprudenceInternalApi } from "@/types/jurisprudence-application";
import type { JurisprudenceEditorialWorkflow, JurisprudenceEditorialWorkflowContext } from "@/types/jurisprudence-editorial-workflow";
import type { JurisprudencePublicationAuthorizationContext, JurisprudencePublicationAuthorizationService } from "@/types/jurisprudence-publication-authorization";
import type {
  JurisprudencePublicProjectionRepository,
  JurisprudencePublicationExecutionContext,
  JurisprudencePublicationExecutionLogEvent,
  JurisprudencePublicationExecutionRepository,
  JurisprudencePublicationExecutionService,
} from "@/types/jurisprudence-publication-execution";
import type { JurisprudencePublicationGovernanceService, PublicationGovernanceContext } from "@/types/jurisprudence-publication-governance";
import type { JurisprudenceNewRecord, JurisprudenceRepositoryDependencies } from "@/types/jurisprudence-repository";

const ROOT = path.resolve(__dirname, "..");
const INITIAL_NOW = "2026-07-30T12:00:00.000Z";
const systems: TestSystem[] = [];

function applicationContext(seed = 1): JurisprudenceApplicationContext { return { requestId: `phase-11-k-app-${seed}`, actor: { kind: "internal_test", id: "actor-ficticio-11k" }, operationSource: "test", requestedAt: INITIAL_NOW }; }
function editorialContext(seed = 1, actorReference = "actor-editorial-ficticio-11k"): JurisprudenceEditorialWorkflowContext { return { requestId: `phase-11-k-editorial-${seed}`, actorReference, requestedAt: INITIAL_NOW }; }
function governanceContext(seed = 1): PublicationGovernanceContext { return { requestId: `phase-11-k-governance-${seed}`, actorReference: "actor-gobierno-ficticio-11k", requestedAt: INITIAL_NOW }; }
function authorizationContext(seed = 1): JurisprudencePublicationAuthorizationContext { return { requestId: `phase-11-k-authorization-${seed}`, actorReference: "actor-autorizacion-ficticio-11k", requestedAt: INITIAL_NOW }; }
function executionContext(seed = 1): JurisprudencePublicationExecutionContext { return { requestId: `phase-11-k-execution-${seed}`, actorReference: "actor-ejecucion-ficticio-11k", requestedAt: INITIAL_NOW }; }
function repositoryDependencies(prefix: string): JurisprudenceRepositoryDependencies { let sequence = 0; return { now: () => `2026-07-30T12:00:${String(sequence++).padStart(2, "0")}.000Z`, generateId: () => `${prefix}-record-${sequence}` }; }
function record(seed = 1): JurisprudenceNewRecord {
  const base = createFictitiousJurisprudenceRecord(seed);
  return {
    ...base,
    slug: `ejecucion-ficticia-11k-${seed}`,
    caseNumber: `EXP-FICTICIO-11K-${seed}`,
    resolutionNumber: `RESOLUCION-FICTICIA-11K-${seed}`,
    institution: { ...base.institution, id: "organo-ficticio-11k", name: "ÓRGANO JURISDICCIONAL FICTICIO 11.K", shortName: "ÓRGANO FICTICIO 11.K" },
    source: { ...base.source, name: "FUENTE FICTICIA CONTROLADA 11.K", documentId: `DOC-FICTICIO-11K-${seed}`, verificationNotes: "Fixture ficticio sin fuente real." },
  };
}
function sourceInput() {
  return { sourceKind: "official_publication", originType: "primary_official_document", institutionalOrigin: "INSTITUCIÓN FICTICIA DE PRUEBA", jurisdiction: "JURISDICCIÓN FICTICIA", documentReference: "DOCUMENTO-FICTICIO-11K-001", sourceUrl: "https://example.invalid/documento-ficticio-11k", sourceDate: "2026-07-01", retrievedAt: INITIAL_NOW, custodyStatus: "controlled_internal", provenanceStatus: "verified", integrityStatus: "checksum_verified", rightsStatus: "public_display_permitted", privacyStatus: "approved_for_public_projection", availabilityStatus: "available_internal", verificationStatus: "verified", sourceChecksum: "a".repeat(64), sourceChecksumAlgorithm: "sha256", sourceFingerprint: "b".repeat(64) };
}

interface TestClock { value: string }
interface TestSystem {
  readonly api: JurisprudenceInternalApi;
  readonly editorial: JurisprudenceEditorialWorkflow;
  readonly governance: JurisprudencePublicationGovernanceService;
  readonly authorization: JurisprudencePublicationAuthorizationService;
  readonly execution: JurisprudencePublicationExecutionService;
  readonly executionRepository: JurisprudencePublicationExecutionRepository;
  readonly projectionRepository: JurisprudencePublicProjectionRepository;
  readonly clock: TestClock;
  close(): Promise<void>;
}

function createSystem(kind: "memory" | "sqlite", options: { executionPath?: string; logs?: JurisprudencePublicationExecutionLogEvent[] } = {}): TestSystem {
  const clock: TestClock = { value: INITIAL_NOW };
  const api = createJurisprudenceInternalApi({ repository: new InMemoryJurisprudenceRepository(repositoryDependencies(`juris-${kind}`)), now: () => INITIAL_NOW });
  const editorial = createJurisprudenceEditorialWorkflow({ api, repository: new InMemoryJurisprudenceEditorialCaseRepository(), now: () => INITIAL_NOW, generateId: (() => { let value = 0; return () => `editorial-ficticio-11k-${++value}`; })() });
  const governance = createJurisprudencePublicationGovernanceService({ api, editorialWorkflow: editorial, repository: new InMemoryJurisprudencePublicationDossierRepository(), now: () => INITIAL_NOW, generateId: (() => { let value = 0; return () => `gobierno-ficticio-11k-${++value}`; })() });
  const authorization = createJurisprudencePublicationAuthorizationService({ api, editorialWorkflow: editorial, publicationGovernance: governance, repository: new InMemoryJurisprudencePublicationAuthorizationRepository(), now: () => clock.value, generateId: (() => { let value = 0; return () => `autorizacion-ficticia-11k-${++value}`; })() });
  let executionRepository: JurisprudencePublicationExecutionRepository;
  let projectionRepository: JurisprudencePublicProjectionRepository;
  if (kind === "memory") {
    const repository = new InMemoryJurisprudencePublicationExecutionRepository();
    executionRepository = repository;
    projectionRepository = new InMemoryJurisprudencePublicProjectionRepository(repository);
  } else {
    const repository = new SqliteJurisprudencePublicationExecutionRepository(options.executionPath ?? ":memory:");
    executionRepository = repository;
    projectionRepository = new SqliteJurisprudencePublicProjectionRepository(repository);
  }
  let executionId = 0;
  const execution = createJurisprudencePublicationExecutionService({ api, editorialWorkflow: editorial, publicationGovernance: governance, publicationAuthorization: authorization, executionRepository, projectionRepository, now: () => clock.value, generateId: () => `ejecucion-ficticia-11k-${++executionId}`, ...(options.logs === undefined ? {} : { logger: { log: (event) => options.logs?.push(event) } }) });
  let closed = false;
  const system: TestSystem = { api, editorial, governance, authorization, execution, executionRepository, projectionRepository, clock, close: async () => { if (closed) return; closed = true; await execution.close(); await authorization.close(); await governance.close(); await api.close(applicationContext(999)); } };
  systems.push(system);
  return system;
}

async function completeEditorialAndGovernance(test: TestSystem, recordId: string, recordVersion: number, seed: number) {
  const suffix = `${seed}-v${recordVersion}`;
  const opened = await test.editorial.openCase({ context: editorialContext(seed), recordId, expectedRecordVersion: recordVersion, purpose: "Revisión ficticia para ejecución técnica reversible.", idempotencyKey: `abrir-editorial-ficticio-11k-${suffix}` });
  const editorialAssigned = await test.editorial.assignReview({ context: editorialContext(seed + 10, "coordinador-editorial-ficticio"), caseId: opened.case.caseId, expectedRecordVersion: recordVersion, expectedCaseVersion: opened.case.caseVersion, reviewKind: "editorial_review", assigneeReference: "revisor-editorial-ficticio", idempotencyKey: `asignar-editorial-ficticio-11k-${suffix}` });
  const legalAssigned = await test.editorial.assignReview({ context: editorialContext(seed + 20, "coordinador-juridico-ficticio"), caseId: opened.case.caseId, expectedRecordVersion: recordVersion, expectedCaseVersion: editorialAssigned.case.caseVersion, reviewKind: "legal_verification", assigneeReference: "verificador-juridico-ficticio", idempotencyKey: `asignar-juridico-ficticio-11k-${suffix}` });
  const editorialApproved = await test.editorial.recordDecision({ context: editorialContext(seed + 30, "revisor-editorial-ficticio"), caseId: opened.case.caseId, expectedRecordVersion: recordVersion, expectedCaseVersion: legalAssigned.case.caseVersion, decision: "editorial_approved", idempotencyKey: `aprobar-editorial-ficticio-11k-${suffix}` });
  const legalApproved = await test.editorial.recordDecision({ context: editorialContext(seed + 40, "verificador-juridico-ficticio"), caseId: opened.case.caseId, expectedRecordVersion: recordVersion, expectedCaseVersion: editorialApproved.case.caseVersion, decision: "legal_verification_approved", idempotencyKey: `aprobar-juridico-ficticio-11k-${suffix}` });
  const editorialEvaluated = await test.editorial.evaluatePublication({ context: editorialContext(seed + 50), caseId: opened.case.caseId, expectedRecordVersion: recordVersion, expectedCaseVersion: legalApproved.case.caseVersion, idempotencyKey: `evaluar-editorial-ficticio-11k-${suffix}` });
  const registered = await test.governance.registerSource({ context: governanceContext(seed), source: sourceInput(), idempotencyKey: `registrar-fuente-ficticia-11k-${suffix}` });
  const bound = await test.governance.bindSource({ context: governanceContext(seed + 1), sourceId: registered.source.sourceId, recordId, expectedRecordVersion: recordVersion, bindingKind: "official_basis", isPrimarySource: true, secondarySourceJustificationReference: null, idempotencyKey: `vincular-fuente-ficticia-11k-${suffix}` });
  const dossier = await test.governance.openDossier({ context: governanceContext(seed + 2), recordId, expectedRecordVersion: recordVersion, editorialCaseId: editorialEvaluated.case.caseId, expectedEditorialCaseVersion: editorialEvaluated.case.caseVersion, sourceBindingIds: [bound.binding.bindingId], institutionalOwnerReference: "responsable-institucional-futuro", idempotencyKey: `abrir-dossier-ficticio-11k-${suffix}` });
  const base = { context: governanceContext(seed + 100), dossierId: dossier.dossier.dossierId, expectedRecordVersion: recordVersion, idempotencyKey: "" };
  const provenance = await test.governance.assessProvenance({ ...base, expectedDossierVersion: dossier.dossier.version, status: "verified", idempotencyKey: `proveniencia-ficticia-11k-${suffix}` });
  const integrity = await test.governance.assessIntegrity({ ...base, expectedDossierVersion: provenance.dossier.version, status: "checksum_verified", idempotencyKey: `integridad-ficticia-11k-${suffix}` });
  const rights = await test.governance.assessRights({ ...base, expectedDossierVersion: integrity.dossier.version, status: "public_display_permitted", idempotencyKey: `derechos-ficticios-11k-${suffix}` });
  const privacy = await test.governance.assessPrivacy({ ...base, expectedDossierVersion: rights.dossier.version, status: "approved_for_public_projection", riskCategories: [], otherRiskReference: null, idempotencyKey: `privacidad-ficticia-11k-${suffix}` });
  const projection = await test.governance.assessPublicProjection({ ...base, expectedDossierVersion: privacy.dossier.version, status: "approved", idempotencyKey: `proyeccion-ficticia-11k-${suffix}` });
  const completed = await test.governance.evaluateDossier({ ...base, expectedDossierVersion: projection.dossier.version, idempotencyKey: `completar-dossier-ficticio-11k-${suffix}` });
  return { editorialEvaluated, completed };
}

async function completeFoundation(test: TestSystem, seed = 1, expiresAt = "2026-08-30T12:00:00.000Z") {
  const created = await test.api.createRecord({ context: applicationContext(seed), idempotencyKey: `crear-registro-ficticio-11k-${seed}`, record: record(seed) });
  const { editorialEvaluated, completed } = await completeEditorialAndGovernance(test, created.id, 1, seed);
  const authorized = await test.authorization.authorizePublication({ context: authorizationContext(seed), publicationDossierId: completed.dossier.dossierId, expectedRecordVersion: 1, institutionalAuthorityRef: "autoridad-institucional-ficticia", decisionRef: `decision-institucional-ficticia-${seed}`, authorizationScopeRef: "alcance-publicacion-ficticio", effectiveFrom: INITIAL_NOW, expiresAt, reasons: ["Decisión exclusivamente ficticia de prueba."], conditions: JURISPRUDENCE_PUBLICATION_AUTHORIZATION_REQUIRED_CONDITIONS, idempotencyKey: `autorizar-publicacion-ficticia-${seed}` });
  return { created, editorialEvaluated, completed, authorized };
}

function evaluationCommand(foundation: Awaited<ReturnType<typeof completeFoundation>>, seed = 1) {
  return { context: executionContext(seed), recordId: foundation.created.id, expectedRecordVersion: 1, editorialCaseId: foundation.editorialEvaluated.case.caseId, publicationDossierId: foundation.completed.dossier.dossierId, authorizationCaseId: foundation.authorized.authorizationCase.authorizationCaseId };
}
function executionCommand(foundation: Awaited<ReturnType<typeof completeFoundation>>, seed = 1) {
  return { ...evaluationCommand(foundation, seed), idempotencyKey: `ejecutar-publicacion-ficticia-${seed}` };
}

afterEach(async () => { await Promise.all(systems.splice(0).map((system) => system.close())); });

describe("contratos estrictos de ejecución", () => {
  it("acepta comandos válidos", () => {
    const base = { context: executionContext(), recordId: "registro-ficticio", expectedRecordVersion: 1, editorialCaseId: "editorial-ficticio", publicationDossierId: "dossier-ficticio", authorizationCaseId: "autorizacion-ficticia" };
    expect(evaluateJurisprudencePublicationExecutionCommandSchema.safeParse(base).success).toBe(true);
    expect(executeJurisprudencePublicationCommandSchema.safeParse({ ...base, idempotencyKey: "ejecucion-ficticia" }).success).toBe(true);
  });
  it.each([
    ["campo desconocido", { bypass: true }],
    ["identificador vacío", { recordId: "" }],
    ["fecha inválida", { context: { ...executionContext(), requestedAt: "fecha" } }],
    ["versión inválida", { expectedRecordVersion: 0 }],
    ["force", { force: true }],
    ["publicación", { published: true }],
    ["despliegue", { deployed: true }],
    ["ruta", { routeMounted: true }],
  ])("rechaza %s sin lanzar excepción nativa", (_label, override) => {
    const value = { context: executionContext(), recordId: "registro-ficticio", expectedRecordVersion: 1, editorialCaseId: "editorial-ficticio", publicationDossierId: "dossier-ficticio", authorizationCaseId: "autorizacion-ficticia", idempotencyKey: "ejecucion-ficticia", ...override };
    expect(() => executeJurisprudencePublicationCommandSchema.safeParse(value)).not.toThrow();
    expect(executeJurisprudencePublicationCommandSchema.safeParse(value).success).toBe(false);
  });
  it("rechaza retiro y supersesión inválidos", () => {
    expect(withdrawJurisprudencePublicationCommandSchema.safeParse({ context: executionContext(), executionId: "", expectedVersion: 0, reason: "otra", idempotencyKey: "corta" }).success).toBe(false);
    expect(supersedeJurisprudencePublicationExecutionCommandSchema.safeParse({ context: executionContext(), executionId: "ejecucion-ficticia", expectedVersion: 1, newRecordVersion: 1, idempotencyKey: "superseder-ficticio", override: true }).success).toBe(false);
  });
  it("rechaza campos internos dentro de la proyección", () => {
    const invalid = { projectionId: "proyeccion-ficticia", executionId: "ejecucion-ficticia", authorizationCaseId: "autorizacion-ficticia", recordId: "registro-ficticio", recordVersion: 1, status: "active_internal", slug: null, title: "Título ficticio", caseNumber: "EXP-FICTICIO", resolutionNumber: "RES-FICTICIA", resolutionType: "Ficticia", institutionName: "Institución ficticia", issuingBody: "Órgano ficticio", matter: "Materia ficticia", issuedAt: INITIAL_NOW, summary: null, sourceName: "Fuente ficticia", sourceDocumentId: null, generatedAt: INITIAL_NOW, updatedAt: INITIAL_NOW, exposedPublicly: false, deployed: false, internalNotes: ["privado"] };
    expect(jurisprudencePublicProjectionSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("evaluación y ejecución reversible", () => {
  it("una evaluación completa queda ready sin mutación", async () => {
    const test = createSystem("memory"); const foundation = await completeFoundation(test, 1); const command = evaluationCommand(foundation, 1);
    await expect(test.execution.evaluateExecution(command)).resolves.toEqual({ status: "ready", blockers: [], publicationExecuted: false });
    await expect(test.executionRepository.findActiveByRecordVersion(foundation.created.id, 1)).resolves.toBeNull();
  });
  it("bloquea autorización inexistente", async () => {
    const test = createSystem("memory"); const foundation = await completeFoundation(test, 2);
    const result = await test.execution.evaluateExecution({ ...evaluationCommand(foundation, 2), authorizationCaseId: "autorizacion-inexistente" });
    expect(result).toMatchObject({ status: "blocked", publicationExecuted: false }); if (result.status === "blocked") expect(result.blockers).toContain("authorization_missing");
  });
  it("bloquea autorización expirada", async () => {
    const test = createSystem("memory"); const foundation = await completeFoundation(test, 3, "2026-07-30T12:00:01.000Z"); test.clock.value = "2026-07-30T12:00:02.000Z";
    const result = await test.execution.evaluateExecution(evaluationCommand(foundation, 3)); expect(result.status).toBe("blocked"); if (result.status === "blocked") expect(result.blockers).toContain("authorization_expired");
  });
  it("bloquea autorización revocada", async () => {
    const test = createSystem("memory"); const foundation = await completeFoundation(test, 4); await test.authorization.revokeAuthorization({ context: authorizationContext(), authorizationCaseId: foundation.authorized.authorizationCase.authorizationCaseId, expectedVersion: 1, institutionalAuthorityRef: "autoridad-revocante-ficticia", decisionRef: "decision-revocacion-ficticia", reasons: ["Revocación ficticia."], idempotencyKey: "revocar-autorizacion-ficticia-11k" });
    const result = await test.execution.evaluateExecution(evaluationCommand(foundation, 4)); expect(result.status).toBe("blocked"); if (result.status === "blocked") expect(result.blockers).toContain("authorization_revoked");
  });
  it("bloquea autorización superseded", async () => {
    const test = createSystem("memory"); const foundation = await completeFoundation(test, 5); const updatedRecord = record(5);
    const updated = await test.api.updateRecord({ context: applicationContext(50), id: foundation.created.id, expectedVersion: 1, changeKind: "editorial_update", record: { ...updatedRecord, editorialContent: { ...updatedRecord.editorialContent, editorialTitle: "Registro ficticio 11.K revisado para versión 2" } } });
    expect(updated.recordVersion).toBe(2);
    await test.authorization.supersedeAuthorizationForNewVersion({ context: authorizationContext(), authorizationCaseId: foundation.authorized.authorizationCase.authorizationCaseId, expectedVersion: 1, newRecordVersion: 2, idempotencyKey: "superseder-autorizacion-ficticia-11k" });
    const currentFoundation = await completeEditorialAndGovernance(test, foundation.created.id, 2, 105);
    const result = await test.execution.evaluateExecution({ context: executionContext(5), recordId: foundation.created.id, expectedRecordVersion: 2, editorialCaseId: currentFoundation.editorialEvaluated.case.caseId, publicationDossierId: currentFoundation.completed.dossier.dossierId, authorizationCaseId: foundation.authorized.authorizationCase.authorizationCaseId });
    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.blockers).toContain("authorization_superseded");
      expect(result.blockers).not.toContain("record_version_mismatch");
      expect(result.blockers).not.toContain("editorial_case_not_verified");
      expect(result.blockers).not.toContain("publication_dossier_incomplete");
    }
  });
  it("conserva VERSION_CONFLICT cuando se intenta superseder sin crear la nueva versión", async () => {
    const test = createSystem("memory"); const foundation = await completeFoundation(test, 51);
    await expect(test.authorization.supersedeAuthorizationForNewVersion({ context: authorizationContext(), authorizationCaseId: foundation.authorized.authorizationCase.authorizationCaseId, expectedVersion: 1, newRecordVersion: 2, idempotencyKey: "superseder-sin-version-ficticia-11k" })).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  });
  it("bloquea autorización de otra versión o registro", async () => {
    const test = createSystem("memory"); const foundation = await completeFoundation(test, 6);
    const version = await test.execution.evaluateExecution({ ...evaluationCommand(foundation, 6), expectedRecordVersion: 2 }); expect(version.status).toBe("blocked");
    const recordResult = await test.execution.evaluateExecution({ ...evaluationCommand(foundation, 7), recordId: "otro-registro-ficticio" }); expect(recordResult.status).toBe("blocked");
  });
  it.each(["memory", "sqlite"] as const)("ejecuta ficticiamente sin exponer con %s", async (kind) => {
    const test = createSystem(kind); const foundation = await completeFoundation(test, kind === "memory" ? 7 : 8); const result = await test.execution.executePublication(executionCommand(foundation, kind === "memory" ? 7 : 8));
    expect(result).toMatchObject({ current: true, publicationExecuted: true, publicProjectionExposed: false, deployed: false, execution: { status: "executed", deployed: false }, projection: { status: "active_internal", exposedPublicly: false, deployed: false } });
    const canonical = await test.api.getInternalRecord({ context: applicationContext(), id: foundation.created.id }); expect(canonical.record.publicationStatus).toBe("private");
  });
  it("es idempotente y detecta conflicto de key", async () => {
    const test = createSystem("memory"); const foundation = await completeFoundation(test, 9); const command = executionCommand(foundation, 9); const first = await test.execution.executePublication(command);
    await expect(test.execution.executePublication({ ...command, context: executionContext(99) })).resolves.toEqual(first);
    await expect(test.execution.executePublication({ ...command, authorizationCaseId: "otra-autorizacion-ficticia" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("impide doble ejecución activa", async () => {
    const test = createSystem("memory"); const foundation = await completeFoundation(test, 10); await test.execution.executePublication(executionCommand(foundation, 10));
    await expect(test.execution.executePublication({ ...executionCommand(foundation, 11), idempotencyKey: "otra-ejecucion-ficticia-11k" })).rejects.toMatchObject({ code: "EXECUTION_ALREADY_ACTIVE" });
  });
  it("construye una proyección determinista sin campos internos", async () => {
    const test = createSystem("memory"); const foundation = await completeFoundation(test, 12); const result = await test.execution.executePublication(executionCommand(foundation, 12));
    expect(result.projection).toMatchObject({ recordId: foundation.created.id, recordVersion: 1, authorizationCaseId: foundation.authorized.authorizationCase.authorizationCaseId, exposedPublicly: false });
    for (const field of ["internal", "editorialNotes", "actor", "decisionRef", "checksum", "custody", "sql", "stack", "token", "secret", "headers"]) expect(result.projection).not.toHaveProperty(field);
  });
  it("retira idempotentemente sin modificar la autorización", async () => {
    const test = createSystem("memory"); const foundation = await completeFoundation(test, 13); const executed = await test.execution.executePublication(executionCommand(foundation, 13));
    const command = { context: executionContext(), executionId: executed.execution.executionId, expectedVersion: 1, reason: "institutional_withdrawal", idempotencyKey: "retirar-publicacion-ficticia-11k" } as const;
    const withdrawn = await test.execution.withdrawPublication(command); await expect(test.execution.withdrawPublication({ ...command, context: executionContext(99) })).resolves.toEqual(withdrawn);
    expect(withdrawn).toMatchObject({ current: false, publicationExecuted: false, projection: { status: "withdrawn" } });
    const authorization = await test.authorization.getAuthorizationCase({ context: authorizationContext(), authorizationCaseId: foundation.authorized.authorizationCase.authorizationCaseId }); expect(authorization.authorizationCurrent).toBe(true);
  });
  it("conserva historial y rechaza doble retiro con otra key", async () => {
    const test = createSystem("memory"); const foundation = await completeFoundation(test, 14); const executed = await test.execution.executePublication(executionCommand(foundation, 14));
    await test.execution.withdrawPublication({ context: executionContext(), executionId: executed.execution.executionId, expectedVersion: 1, reason: "record_corrected", idempotencyKey: "retirar-primero-ficticio-11k" });
    await expect(test.execution.withdrawPublication({ context: executionContext(), executionId: executed.execution.executionId, expectedVersion: 2, reason: "record_corrected", idempotencyKey: "retirar-segundo-ficticio-11k" })).rejects.toMatchObject({ code: "EXECUTION_NOT_CURRENT" });
    await expect(test.execution.getExecutionHistory({ context: executionContext(), recordId: foundation.created.id })).resolves.toHaveLength(2);
  });
  it("supersede sin heredar ejecución ni proyección vigente", async () => {
    const test = createSystem("memory"); const foundation = await completeFoundation(test, 15); const executed = await test.execution.executePublication(executionCommand(foundation, 15));
    const superseded = await test.execution.supersedeExecution({ context: executionContext(), executionId: executed.execution.executionId, expectedVersion: 1, newRecordVersion: 2, idempotencyKey: "superseder-ejecucion-ficticia-11k" });
    expect(superseded).toMatchObject({ current: false, publicationExecuted: false, execution: { status: "superseded", supersededByRecordVersion: 2 }, projection: { status: "superseded" } });
    await expect(test.executionRepository.findActiveByRecordVersion(foundation.created.id, 2)).resolves.toBeNull();
    await expect(test.projectionRepository.findActiveByRecordVersion(foundation.created.id, 2)).resolves.toBeNull();
  });
});

describe("persistencia, lifecycle y logging", () => {
  it("reabre SQLite temporal y recupera ejecución, proyección e historial", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "buholex-11k-")); const databasePath = path.join(directory, "ejecucion-ficticia.sqlite"); let first: TestSystem | undefined; let reopenedExecution: SqliteJurisprudencePublicationExecutionRepository | undefined; let reopenedProjection: SqliteJurisprudencePublicProjectionRepository | undefined;
    try {
      first = createSystem("sqlite", { executionPath: databasePath }); const foundation = await completeFoundation(first, 16); const executed = await first.execution.executePublication(executionCommand(foundation, 16)); await first.close(); systems.splice(systems.indexOf(first), 1); first = undefined;
      reopenedExecution = new SqliteJurisprudencePublicationExecutionRepository(databasePath); reopenedProjection = new SqliteJurisprudencePublicProjectionRepository(reopenedExecution);
      await expect(reopenedExecution.findById(executed.execution.executionId)).resolves.toMatchObject({ status: "executed" });
      await expect(reopenedProjection.findById(executed.projection.projectionId)).resolves.toMatchObject({ status: "active_internal" });
      await expect(reopenedExecution.listHistory(foundation.created.id)).resolves.toHaveLength(1);
    } finally {
      await first?.close(); await reopenedProjection?.close(); await reopenedExecution?.close();
      rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
    expect(existsSync(databasePath)).toBe(false);
  });
  it("close es idempotente y las operaciones posteriores fallan seguras", async () => {
    const repository = new SqliteJurisprudencePublicationExecutionRepository(":memory:"); await repository.close(); await repository.close(); await expect(repository.findById("ejecucion-ficticia")).rejects.toMatchObject({ code: "RESOURCE_CLOSED" });
  });
  it("el logging contiene solo campos mínimos", async () => {
    const logs: JurisprudencePublicationExecutionLogEvent[] = []; const test = createSystem("memory", { logs }); const foundation = await completeFoundation(test, 17); await test.execution.executePublication(executionCommand(foundation, 17));
    const serialized = JSON.stringify(logs); expect(serialized).not.toMatch(/sumilla|fundamento|DNI|reason|sourceUrl|checksum|decisionRef|scope|cookie|token|secret|SQL|stack|path/i);
    for (const event of logs) expect(Object.keys(event).sort()).toEqual(expect.arrayContaining(["operation", "requestId", "resultCode", "timestamp"]));
  });
  it("el readiness conserva todos los estados reales deshabilitados", () => {
    expect(evaluateJurisprudencePublicationExecutionReadiness()).toEqual({ executionContractsReady: true, executionRepositoryReadyForTesting: true, projectionRepositoryReadyForTesting: true, executionServiceReadyForTesting: true, realInstitutionalAuthorizationPresent: false, realPublicationExecutionPresent: false, publicProjectionExposed: false, authenticationReal: false, routeMountReady: false, uiConnectionReady: false, productionReady: false, deploymentReady: false, overrideSupported: false, statement: "11.K valida exclusivamente el ejecutor interno reversible con datos ficticios; no expone jurisprudencia ni despliega el sitio." });
  });
});

describe("barreras estáticas y preservación", () => {
  it("mantiene rutas, UI y jurisprudencia desconectadas", () => {
    const authorizedRouteFiles = [
      "app/api/complaints/route.ts",
      "app/api/owl/admission/route.ts",
    ];
    const routes = readdirSync(path.join(ROOT, "app"), { recursive: true }).filter((entry): entry is string => typeof entry === "string" && /(^|[\/\\])route\.ts$/.test(entry)).map((entry) => path.relative(ROOT, path.join(ROOT, "app", entry)).split(path.sep).join("/"));
    expect(routes.sort()).toEqual(authorizedRouteFiles.sort());
    const appEntries = readdirSync(path.join(ROOT, "app"), { recursive: true }).filter((entry): entry is string => typeof entry === "string");
    expect(appEntries.some((entry) => entry.replaceAll("\\", "/").startsWith("api/") && /jurisprudence/.test(entry))).toBe(false);
    const page = readFileSync(path.join(ROOT, "app", "jurisprudencia", "page.tsx"), "utf8"); expect(page).not.toMatch(/publication-execution|executePublication|JurisprudencePublicationExecution/);
  });
  it("no instala Auth0 ni cambia React", () => {
    const manifest = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")); expect(manifest.dependencies).not.toHaveProperty("@auth0/nextjs-auth0"); expect(manifest.dependencies.react).toBe("19.1.6"); expect(manifest.dependencies["react-dom"]).toBe("19.1.6");
  });
  it("el servicio depende de puertos y no de adaptadores o UI", () => {
    const source = readFileSync(path.join(ROOT, "lib", "jurisprudence-publication-execution-service.ts"), "utf8"); expect(source).not.toMatch(/in-memory|sqlite-jurisprudence|@\/app|@\/components|next\//i); expect(source).not.toMatch(/fetch\(|scrap|OCR|embedding|RAG|Auth0/i);
  });
  it("preserva SRV-WEB-001", () => {
    expect(publicServices.find((service) => service.id === "SRV-WEB-001")).toMatchObject({ id: "SRV-WEB-001", allowsImmediatePayment: false, published: false });
  });
  it("preserva BL-LEG-CON-001", () => {
    expect(rentalHousingContract).toMatchObject({ code: "BL-LEG-CON-001", availabilityStatus: "editorial_preview", price: null, currency: null, licenseStatus: "pending", publicationAuthorization: { authorized: false }, masterInternalFile: { publicDownloadAuthorized: false } });
    expect(rentalHousingContract.commercialFiles.every((file) => !file.publicDownloadAuthorized)).toBe(true); expect(rentalHousingContract.annexFiles.every((file) => !file.publicDownloadAuthorized)).toBe(true);
  });
});
