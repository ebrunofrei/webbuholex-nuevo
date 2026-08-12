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
import { InMemoryJurisprudenceRepository } from "@/lib/in-memory-jurisprudence-repository";
import { createJurisprudenceInternalApi } from "@/lib/jurisprudence-application-factory";
import { createJurisprudenceEditorialWorkflow } from "@/lib/jurisprudence-editorial-workflow";
import { JurisprudenceEditorialWorkflowError } from "@/lib/jurisprudence-editorial-case-repository";
import { evaluateJurisprudencePublicationAuthorizationReadiness } from "@/lib/jurisprudence-publication-authorization-readiness";
import { createJurisprudencePublicationAuthorizationService } from "@/lib/jurisprudence-publication-authorization-service";
import { createJurisprudencePublicationGovernanceService } from "@/lib/jurisprudence-publication-governance-service";
import {
  authorizeJurisprudencePublicationCommandSchema,
  deferJurisprudencePublicationAuthorizationCommandSchema,
  jurisprudencePublicationAuthorizationCaseSchema,
  rejectJurisprudencePublicationAuthorizationCommandSchema,
} from "@/lib/schemas/jurisprudence-publication-authorization";
import { SqliteJurisprudencePublicationAuthorizationRepository } from "@/lib/sqlite-jurisprudence-publication-authorization-repository";
import { createFictitiousJurisprudenceRecord } from "@/tests/helpers/jurisprudence-record-fixture";
import { JURISPRUDENCE_PUBLICATION_AUTHORIZATION_REQUIRED_CONDITIONS } from "@/types/jurisprudence-publication-authorization";
import type { JurisprudenceApplicationContext, JurisprudenceInternalApi } from "@/types/jurisprudence-application";
import type { JurisprudenceEditorialWorkflow, JurisprudenceEditorialWorkflowContext } from "@/types/jurisprudence-editorial-workflow";
import type {
  JurisprudencePublicationAuthorizationContext,
  JurisprudencePublicationAuthorizationLogEvent,
  JurisprudencePublicationAuthorizationRepository,
  JurisprudencePublicationAuthorizationService,
} from "@/types/jurisprudence-publication-authorization";
import type { JurisprudencePublicationGovernanceService, PublicationGovernanceContext } from "@/types/jurisprudence-publication-governance";
import type { JurisprudenceNewRecord, JurisprudenceRepositoryDependencies } from "@/types/jurisprudence-repository";

const ROOT = path.resolve(__dirname, "..");
const INITIAL_NOW = "2026-07-29T23:30:00.000Z";
const systems: TestSystem[] = [];

function applicationContext(seed = 1): JurisprudenceApplicationContext { return { requestId: `phase-11-j-app-${seed}`, actor: { kind: "internal_test", id: "actor-ficticio-11j" }, operationSource: "test", requestedAt: INITIAL_NOW }; }
function editorialContext(seed = 1, actorReference = "actor-editorial-ficticio-11j"): JurisprudenceEditorialWorkflowContext { return { requestId: `phase-11-j-editorial-${seed}`, actorReference, requestedAt: INITIAL_NOW }; }
function governanceContext(seed = 1): PublicationGovernanceContext { return { requestId: `phase-11-j-governance-${seed}`, actorReference: "actor-gobierno-ficticio-11j", requestedAt: INITIAL_NOW }; }
function authorizationContext(seed = 1): JurisprudencePublicationAuthorizationContext { return { requestId: `phase-11-j-authorization-${seed}`, actorReference: "actor-autorizacion-ficticio-11j", requestedAt: INITIAL_NOW }; }
function repositoryDependencies(prefix: string): JurisprudenceRepositoryDependencies { let sequence = 0; return { now: () => `2026-07-29T23:30:${String(sequence++).padStart(2, "0")}.000Z`, generateId: () => `${prefix}-record-${sequence}` }; }
function record(seed = 1): JurisprudenceNewRecord {
  const base = createFictitiousJurisprudenceRecord(seed);
  return { ...base, slug: `autorizacion-ficticia-11j-${seed}`, caseNumber: `EXP-FICTICIO-11J-${seed}`, resolutionNumber: `RESOLUCION-FICTICIA-11J-${seed}`, institution: { ...base.institution, id: "organo-ficticio-11j", name: "ÓRGANO JURISDICCIONAL FICTICIO 11.J", shortName: "ÓRGANO FICTICIO 11.J" }, source: { ...base.source, documentId: `DOC-FICTICIO-11J-${seed}`, verificationNotes: "Fixture ficticio sin fuente real." } };
}
function sourceInput(overrides: Record<string, unknown> = {}) {
  return { sourceKind: "official_publication", originType: "primary_official_document", institutionalOrigin: "INSTITUCIÓN FICTICIA DE PRUEBA", jurisdiction: "JURISDICCIÓN FICTICIA", documentReference: "DOCUMENTO-FICTICIO-11J-001", sourceUrl: "https://example.invalid/documento-ficticio-11j", sourceDate: "2026-07-01", retrievedAt: INITIAL_NOW, custodyStatus: "controlled_internal", provenanceStatus: "verified", integrityStatus: "checksum_verified", rightsStatus: "public_display_permitted", privacyStatus: "approved_for_public_projection", availabilityStatus: "available_internal", verificationStatus: "verified", sourceChecksum: "a".repeat(64), sourceChecksumAlgorithm: "sha256", sourceFingerprint: "b".repeat(64), ...overrides };
}

interface TestClock { value: string }
interface TestSystem {
  readonly api: JurisprudenceInternalApi;
  readonly editorial: JurisprudenceEditorialWorkflow;
  readonly governance: JurisprudencePublicationGovernanceService;
  readonly authorization: JurisprudencePublicationAuthorizationService;
  readonly authorizationRepository: JurisprudencePublicationAuthorizationRepository;
  readonly clock: TestClock;
  close(): Promise<void>;
}

function createSystem(kind: "memory" | "sqlite", options: { authorizationPath?: string; logs?: JurisprudencePublicationAuthorizationLogEvent[] } = {}): TestSystem {
  const api = createJurisprudenceInternalApi({ repository: new InMemoryJurisprudenceRepository(repositoryDependencies(`juris-${kind}`)), now: () => INITIAL_NOW });
  const editorial = createJurisprudenceEditorialWorkflow({ api, repository: new InMemoryJurisprudenceEditorialCaseRepository(), now: () => INITIAL_NOW, generateId: (() => { let value = 0; return () => `editorial-ficticio-11j-${++value}`; })() });
  const dossierRepository = new InMemoryJurisprudencePublicationDossierRepository();
  let governanceId = 0;
  const governance = createJurisprudencePublicationGovernanceService({ api, editorialWorkflow: editorial, repository: dossierRepository, now: () => INITIAL_NOW, generateId: () => `gobierno-ficticio-11j-${++governanceId}` });
  const authorizationRepository = kind === "memory" ? new InMemoryJurisprudencePublicationAuthorizationRepository() : new SqliteJurisprudencePublicationAuthorizationRepository(options.authorizationPath ?? ":memory:");
  const clock = { value: INITIAL_NOW };
  let authorizationId = 0;
  const authorization = createJurisprudencePublicationAuthorizationService({ api, editorialWorkflow: editorial, publicationGovernance: governance, repository: authorizationRepository, now: () => clock.value, generateId: () => `autorizacion-ficticia-11j-${++authorizationId}`, ...(options.logs === undefined ? {} : { logger: { log: (event) => options.logs?.push(event) } }) });
  let closed = false;
  const system: TestSystem = { api, editorial, governance, authorization, authorizationRepository, clock, close: async () => { if (closed) return; closed = true; await authorization.close(); await governance.close(); await api.close(applicationContext(999)); } };
  systems.push(system);
  return system;
}

async function completeFoundation(test: TestSystem, seed = 1, sourceOverrides: Record<string, unknown> = {}) {
  const created = await test.api.createRecord({ context: applicationContext(seed), idempotencyKey: `crear-registro-ficticio-11j-${seed}`, record: record(seed) });
  const opened = await test.editorial.openCase({ context: editorialContext(seed), recordId: created.id, expectedRecordVersion: 1, purpose: "Revisión ficticia para autorización institucional.", idempotencyKey: `abrir-editorial-ficticio-11j-${seed}` });
  const editorialAssigned = await test.editorial.assignReview({ context: editorialContext(seed + 10, "coordinador-editorial-ficticio"), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: opened.case.caseVersion, reviewKind: "editorial_review", assigneeReference: "revisor-editorial-ficticio", idempotencyKey: `asignar-editorial-ficticio-11j-${seed}` });
  const legalAssigned = await test.editorial.assignReview({ context: editorialContext(seed + 20, "coordinador-juridico-ficticio"), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: editorialAssigned.case.caseVersion, reviewKind: "legal_verification", assigneeReference: "verificador-juridico-ficticio", idempotencyKey: `asignar-juridico-ficticio-11j-${seed}` });
  const editorialApproved = await test.editorial.recordDecision({ context: editorialContext(seed + 30, "revisor-editorial-ficticio"), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: legalAssigned.case.caseVersion, decision: "editorial_approved", idempotencyKey: `aprobar-editorial-ficticio-11j-${seed}` });
  const legalApproved = await test.editorial.recordDecision({ context: editorialContext(seed + 40, "verificador-juridico-ficticio"), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: editorialApproved.case.caseVersion, decision: "legal_verification_approved", idempotencyKey: `aprobar-juridico-ficticio-11j-${seed}` });
  const editorialEvaluated = await test.editorial.evaluatePublication({ context: editorialContext(seed + 50), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: legalApproved.case.caseVersion, idempotencyKey: `evaluar-editorial-ficticio-11j-${seed}` });
  const registered = await test.governance.registerSource({ context: governanceContext(seed), source: sourceInput(sourceOverrides), idempotencyKey: `registrar-fuente-ficticia-11j-${seed}` });
  const secondary = registered.source.sourceKind === "secondary_reference";
  const bound = await test.governance.bindSource({ context: governanceContext(seed + 1), sourceId: registered.source.sourceId, recordId: created.id, expectedRecordVersion: 1, bindingKind: secondary ? "secondary_context" : "official_basis", isPrimarySource: !secondary, secondarySourceJustificationReference: secondary ? "justificacion-institucional-ficticia" : null, idempotencyKey: `vincular-fuente-ficticia-11j-${seed}` });
  const dossier = await test.governance.openDossier({ context: governanceContext(seed + 2), recordId: created.id, expectedRecordVersion: 1, editorialCaseId: editorialEvaluated.case.caseId, expectedEditorialCaseVersion: editorialEvaluated.case.caseVersion, sourceBindingIds: [bound.binding.bindingId], institutionalOwnerReference: "responsable-institucional-futuro", idempotencyKey: `abrir-dossier-ficticio-11j-${seed}` });
  const base = { context: governanceContext(seed + 100), dossierId: dossier.dossier.dossierId, expectedRecordVersion: 1, idempotencyKey: "" };
  const provenance = await test.governance.assessProvenance({ ...base, expectedDossierVersion: dossier.dossier.version, status: "verified", idempotencyKey: `proveniencia-ficticia-11j-${seed}` });
  const integrity = await test.governance.assessIntegrity({ ...base, expectedDossierVersion: provenance.dossier.version, status: "checksum_verified", idempotencyKey: `integridad-ficticia-11j-${seed}` });
  const rights = await test.governance.assessRights({ ...base, expectedDossierVersion: integrity.dossier.version, status: "public_display_permitted", idempotencyKey: `derechos-ficticios-11j-${seed}` });
  const privacy = await test.governance.assessPrivacy({ ...base, expectedDossierVersion: rights.dossier.version, status: "approved_for_public_projection", riskCategories: [], otherRiskReference: null, idempotencyKey: `privacidad-ficticia-11j-${seed}` });
  const projection = await test.governance.assessPublicProjection({ ...base, expectedDossierVersion: privacy.dossier.version, status: "approved", idempotencyKey: `proyeccion-ficticia-11j-${seed}` });
  const completed = await test.governance.evaluateDossier({ ...base, expectedDossierVersion: projection.dossier.version, idempotencyKey: `completar-dossier-ficticio-11j-${seed}` });
  return { created, editorialEvaluated, registered, bound, completed };
}

function authorizeCommand(dossierId: string, seed = 1, overrides: Record<string, unknown> = {}) {
  return { context: authorizationContext(seed), publicationDossierId: dossierId, expectedRecordVersion: 1, institutionalAuthorityRef: "autoridad-institucional-ficticia", decisionRef: `decision-institucional-ficticia-${seed}`, authorizationScopeRef: "alcance-publicacion-ficticio", effectiveFrom: INITIAL_NOW, expiresAt: "2026-08-29T23:30:00.000Z", reasons: ["Decisión exclusivamente ficticia de prueba."], conditions: JURISPRUDENCE_PUBLICATION_AUTHORIZATION_REQUIRED_CONDITIONS, idempotencyKey: `autorizar-publicacion-ficticia-${seed}`, ...overrides };
}

afterEach(async () => { await Promise.all(systems.splice(0).map((system) => system.close())); });

describe("contratos estrictos de autorización", () => {
  it("acepta un comando authorize completo", () => { expect(authorizeJurisprudencePublicationCommandSchema.safeParse(authorizeCommand("dossier-ficticio-11j")).success).toBe(true); });
  it.each([
    ["campo desconocido", { force: true }],
    ["identificador vacío", { institutionalAuthorityRef: "" }],
    ["fecha inválida", { effectiveFrom: "fecha-invalida" }],
    ["vigencia invertida", { expiresAt: "2026-07-01T00:00:00.000Z" }],
    ["condición faltante", { conditions: JURISPRUDENCE_PUBLICATION_AUTHORIZATION_REQUIRED_CONDITIONS.slice(1) }],
    ["condición duplicada", { conditions: [...JURISPRUDENCE_PUBLICATION_AUTHORIZATION_REQUIRED_CONDITIONS, "source_governance_complete"] }],
    ["bypass", { bypass: true }],
    ["ejecución", { publicationExecuted: true }],
  ])("rechaza %s sin propagar excepción nativa", (_label, override) => { const command = authorizeCommand("dossier-ficticio-11j", 1, override); expect(() => authorizeJurisprudencePublicationCommandSchema.safeParse(command)).not.toThrow(); expect(authorizeJurisprudencePublicationCommandSchema.safeParse(command).success).toBe(false); });
  it("rechaza reject sin razones", () => { expect(rejectJurisprudencePublicationAuthorizationCommandSchema.safeParse({ context: authorizationContext(), publicationDossierId: "dossier-ficticio", expectedRecordVersion: 1, institutionalAuthorityRef: "autoridad-ficticia", decisionRef: "decision-ficticia", authorizationScopeRef: "alcance-ficticio", reasons: [], idempotencyKey: "rechazo-ficticio" }).success).toBe(false); });
  it("rechaza defer sin bloqueos", () => { expect(deferJurisprudencePublicationAuthorizationCommandSchema.safeParse({ context: authorizationContext(), publicationDossierId: "dossier-ficticio", expectedRecordVersion: 1, institutionalAuthorityRef: "autoridad-ficticia", decisionRef: "decision-ficticia", authorizationScopeRef: "alcance-ficticio", blockers: [], idempotencyKey: "diferimiento-ficticio" }).success).toBe(false); });
});

describe("evaluación y separación de autoridad", () => {
  it("completeFoundation asigna revisores distintos antes de sus decisiones", async () => {
    const foundation = await completeFoundation(createSystem("memory"), 32);
    expect(foundation.editorialEvaluated.case.editorialAssignment?.assigneeReference).toBe("revisor-editorial-ficticio");
    expect(foundation.editorialEvaluated.case.legalAssignment?.assigneeReference).toBe("verificador-juridico-ficticio");
    expect(foundation.editorialEvaluated.case.editorialDecision?.actorReference).toBe("revisor-editorial-ficticio");
    expect(foundation.editorialEvaluated.case.legalDecision?.actorReference).toBe("verificador-juridico-ficticio");
    expect(foundation.editorialEvaluated.case.editorialDecision?.actorReference).not.toBe(foundation.editorialEvaluated.case.legalDecision?.actorReference);
  });
  it("mantiene ASSIGNMENT_REQUIRED para una decisión de actor no asignado", async () => {
    const test = createSystem("memory");
    const created = await test.api.createRecord({ context: applicationContext(33), idempotencyKey: "crear-registro-asignacion-ficticia-11j", record: record(33) });
    const opened = await test.editorial.openCase({ context: editorialContext(33), recordId: created.id, expectedRecordVersion: 1, purpose: "Comprobar asignación contractual ficticia.", idempotencyKey: "abrir-caso-asignacion-ficticia-11j" });
    const assigned = await test.editorial.assignReview({ context: editorialContext(34, "coordinador-editorial-ficticio"), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: opened.case.caseVersion, reviewKind: "editorial_review", assigneeReference: "revisor-editorial-ficticio", idempotencyKey: "asignar-revisor-ficticio-11j" });
    await expect(test.editorial.recordDecision({ context: editorialContext(35, "actor-no-asignado-ficticio"), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: assigned.case.caseVersion, decision: "editorial_approved", idempotencyKey: "decision-huerfana-ficticia-11j" })).rejects.toMatchObject({ code: "ASSIGNMENT_REQUIRED" });
  });
  it("un expediente incompleto bloquea sin persistir autorización", async () => { const test = createSystem("memory"); const foundation = await completeFoundation(test, 2); const incomplete = await test.governance.assessRights({ context: governanceContext(), dossierId: foundation.completed.dossier.dossierId, expectedRecordVersion: 1, expectedDossierVersion: foundation.completed.dossier.version, status: "restricted", idempotencyKey: "restringir-derechos-ficticios" }); expect(incomplete.dossier.status).toBe("under_review"); const evaluation = await test.authorization.evaluateAuthorization({ context: authorizationContext(), publicationDossierId: incomplete.dossier.dossierId, expectedRecordVersion: 1 }); expect(evaluation).toMatchObject({ decision: "incomplete", publicationAuthorizationGranted: false, publicationExecuted: false }); if (evaluation.decision === "incomplete") expect(evaluation.blockers).toContain("publication_dossier_incomplete"); await expect(test.authorizationRepository.findActiveByRecordVersion(foundation.created.id, 1, INITIAL_NOW)).resolves.toBeNull(); });
  it("la versión distinta bloquea", async () => { const test = createSystem("memory"); const foundation = await completeFoundation(test, 3); const evaluation = await test.authorization.evaluateAuthorization({ context: authorizationContext(), publicationDossierId: foundation.completed.dossier.dossierId, expectedRecordVersion: 2 }); expect(evaluation).toMatchObject({ decision: "incomplete" }); if (evaluation.decision === "incomplete") expect(evaluation.blockers).toContain("record_version_mismatch"); });
  it("un workflow editorial ausente bloquea la evaluación", async () => {
    const test = createSystem("memory"); const foundation = await completeFoundation(test, 31);
    const missingEditorial: JurisprudenceEditorialWorkflow = {
      openCase: (input) => test.editorial.openCase(input), assignReview: (input) => test.editorial.assignReview(input), recordObservation: (input) => test.editorial.recordObservation(input), resolveObservation: (input) => test.editorial.resolveObservation(input), recordDecision: (input) => test.editorial.recordDecision(input), evaluatePublication: (input) => test.editorial.evaluatePublication(input), synchronizeCase: (input) => test.editorial.synchronizeCase(input), closeCase: (input) => test.editorial.closeCase(input),
      getCase: async () => { throw new JurisprudenceEditorialWorkflowError("NOT_FOUND", "Expediente editorial ficticiamente ausente."); },
      getHistory: (input) => test.editorial.getHistory(input), close: async () => undefined,
    };
    const authorization = createJurisprudencePublicationAuthorizationService({ api: test.api, editorialWorkflow: missingEditorial, publicationGovernance: test.governance, repository: new InMemoryJurisprudencePublicationAuthorizationRepository(), now: () => INITIAL_NOW, generateId: () => "autorizacion-editorial-ausente" });
    try { const evaluation = await authorization.evaluateAuthorization({ context: authorizationContext(), publicationDossierId: foundation.completed.dossier.dossierId, expectedRecordVersion: 1 }); expect(evaluation.decision).toBe("incomplete"); if (evaluation.decision === "incomplete") expect(evaluation.blockers).toContain("editorial_case_missing"); } finally { await authorization.close(); }
  });
  it("derechos y privacidad pendientes permanecen bloqueados", async () => { const test = createSystem("memory"); const foundation = await completeFoundation(test, 4); const changed = await test.governance.assessPrivacy({ context: governanceContext(), dossierId: foundation.completed.dossier.dossierId, expectedRecordVersion: 1, expectedDossierVersion: foundation.completed.dossier.version, status: "in_review", riskCategories: [], otherRiskReference: null, idempotencyKey: "privacidad-pendiente-ficticia" }); const evaluation = await test.authorization.evaluateAuthorization({ context: authorizationContext(), publicationDossierId: changed.dossier.dossierId, expectedRecordVersion: 1 }); if (evaluation.decision === "incomplete") expect(evaluation.blockers).toEqual(expect.arrayContaining(["publication_dossier_incomplete", "privacy_not_cleared"])); });
  it("una fuente secundaria justificada no se eleva a primaria", async () => { const test = createSystem("memory"); const foundation = await completeFoundation(test, 5, { sourceKind: "secondary_reference", originType: "secondary_source" }); expect(foundation.bound.binding.isPrimarySource).toBe(false); expect(foundation.registered.source.sourceKind).toBe("secondary_reference"); const evaluation = await test.authorization.evaluateAuthorization({ context: authorizationContext(), publicationDossierId: foundation.completed.dossier.dossierId, expectedRecordVersion: 1 }); expect(evaluation.decision).toBe("ready_for_institutional_decision"); });
  it("una evaluación favorable no persiste ni ejecuta publicación", async () => { const test = createSystem("memory"); const foundation = await completeFoundation(test, 6); const before = await test.authorization.getAuthorizationHistory({ context: authorizationContext(), recordId: foundation.created.id }); const evaluation = await test.authorization.evaluateAuthorization({ context: authorizationContext(), publicationDossierId: foundation.completed.dossier.dossierId, expectedRecordVersion: 1 }); const after = await test.authorization.getAuthorizationHistory({ context: authorizationContext(), recordId: foundation.created.id }); expect(evaluation).toMatchObject({ decision: "ready_for_institutional_decision", publicationAuthorizationGranted: false, publicationExecuted: false }); expect(before).toEqual([]); expect(after).toEqual([]); });
});

describe("decisiones, idempotencia y vigencia", () => {
  it.each(["memory", "sqlite"] as const)("autoriza explícitamente sin publicar con %s", async (kind) => { const test = createSystem(kind); const foundation = await completeFoundation(test, kind === "memory" ? 7 : 8); const result = await test.authorization.authorizePublication(authorizeCommand(foundation.completed.dossier.dossierId, kind === "memory" ? 7 : 8)); expect(result).toMatchObject({ authorizationCurrent: true, publicationAuthorizationGranted: true, publicationExecuted: false, authorizationCase: { decision: "authorize", status: "authorized", publicationExecuted: false } }); expect((await test.api.getInternalRecord({ context: applicationContext(), id: foundation.created.id })).record.publicationStatus).not.toBe("published"); });
  it("rechaza una segunda autorización activa", async () => { const test = createSystem("memory"); const foundation = await completeFoundation(test, 9); await test.authorization.authorizePublication(authorizeCommand(foundation.completed.dossier.dossierId, 9)); await expect(test.authorization.authorizePublication(authorizeCommand(foundation.completed.dossier.dossierId, 10))).rejects.toMatchObject({ code: "EXISTING_ACTIVE_AUTHORIZATION" }); });
  it("repite idempotentemente y detecta conflicto de key", async () => { const test = createSystem("memory"); const foundation = await completeFoundation(test, 11); const command = authorizeCommand(foundation.completed.dossier.dossierId, 11); const first = await test.authorization.authorizePublication(command); await expect(test.authorization.authorizePublication({ ...command, context: authorizationContext(99) })).resolves.toEqual(first); await expect(test.authorization.authorizePublication({ ...command, decisionRef: "otra-decision-ficticia" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" }); });
  it("rechaza conflicto de versión", async () => { const test = createSystem("memory"); const foundation = await completeFoundation(test, 12); await expect(test.authorization.authorizePublication(authorizeCommand(foundation.completed.dossier.dossierId, 12, { expectedRecordVersion: 2 }))).rejects.toMatchObject({ code: "VERSION_CONFLICT" }); });
  it("conserva rechazo y diferimiento en historial", async () => { const test = createSystem("memory"); const foundation = await completeFoundation(test, 13); const base = { context: authorizationContext(), publicationDossierId: foundation.completed.dossier.dossierId, expectedRecordVersion: 1, institutionalAuthorityRef: "autoridad-ficticia", decisionRef: "decision-ficticia", authorizationScopeRef: "alcance-ficticio" }; const rejected = await test.authorization.rejectAuthorization({ ...base, reasons: ["Razón institucional ficticia."], idempotencyKey: "rechazo-institucional-ficticio" }); const deferred = await test.authorization.deferAuthorization({ ...base, decisionRef: "diferimiento-ficticio", blockers: ["authorization_validity_missing"], idempotencyKey: "diferimiento-institucional-ficticio" }); expect(rejected.authorizationCase.status).toBe("rejected"); expect(deferred.authorizationCase.status).toBe("deferred"); const history = await test.authorization.getAuthorizationHistory({ context: authorizationContext(), recordId: foundation.created.id }); expect(history.map((event) => event.type)).toEqual(["authorization_rejected", "authorization_deferred"]); });
  it("revoca de forma idempotente y conserva la autorización anterior en eventos", async () => { const test = createSystem("memory"); const foundation = await completeFoundation(test, 14); const granted = await test.authorization.authorizePublication(authorizeCommand(foundation.completed.dossier.dossierId, 14)); const command = { context: authorizationContext(), authorizationCaseId: granted.authorizationCase.authorizationCaseId, expectedVersion: 1, institutionalAuthorityRef: "autoridad-revocante-ficticia", decisionRef: "decision-revocacion-ficticia", reasons: ["Revocación institucional ficticia."], idempotencyKey: "revocacion-idempotente-ficticia" }; const revoked = await test.authorization.revokeAuthorization(command); await expect(test.authorization.revokeAuthorization({ ...command, context: authorizationContext(99) })).resolves.toEqual(revoked); expect(revoked).toMatchObject({ authorizationCurrent: false, publicationAuthorizationGranted: false, publicationExecuted: false, authorizationCase: { decision: "revoke", status: "revoked" } }); const history = await test.authorization.getAuthorizationHistory({ context: authorizationContext(), recordId: foundation.created.id }); expect(history.map((event) => event.type)).toEqual(["authorization_granted", "authorization_revoked"]); });
  it("la expiración elimina vigencia sin borrar historial", async () => { const test = createSystem("memory"); const foundation = await completeFoundation(test, 15); const granted = await test.authorization.authorizePublication(authorizeCommand(foundation.completed.dossier.dossierId, 15, { expiresAt: "2026-07-30T00:00:00.000Z" })); test.clock.value = "2026-07-30T00:00:01.000Z"; const expired = await test.authorization.getAuthorizationCase({ context: authorizationContext(), authorizationCaseId: granted.authorizationCase.authorizationCaseId }); expect(expired).toMatchObject({ authorizationCurrent: false, publicationAuthorizationGranted: false, publicationExecuted: false }); await expect(test.authorization.getAuthorizationHistory({ context: authorizationContext(), recordId: foundation.created.id })).resolves.toHaveLength(1); });
  it("una nueva versión no hereda asignaciones, decisiones ni autorización", async () => {
    const test = createSystem("memory"); const foundation = await completeFoundation(test, 16); const granted = await test.authorization.authorizePublication(authorizeCommand(foundation.completed.dossier.dossierId, 16));
    await test.api.updateRecord({ context: applicationContext(160), id: foundation.created.id, expectedVersion: 1, changeKind: "editorial_update", record: { ...record(16), editorialContent: { ...record(16).editorialContent, editorialTitle: "Versión ficticia dos" } } });
    const oldEditorial = await test.editorial.synchronizeCase({ context: editorialContext(161), caseId: foundation.editorialEvaluated.case.caseId, expectedCaseVersion: foundation.editorialEvaluated.case.caseVersion, idempotencyKey: "superseder-editorial-ficticio-11j" });
    expect(oldEditorial.status).toBe("superseded");
    const newEditorial = await test.editorial.openCase({ context: editorialContext(162), recordId: foundation.created.id, expectedRecordVersion: 2, purpose: "Nueva revisión ficticia sin herencia.", idempotencyKey: "abrir-editorial-version-dos-ficticia-11j" });
    expect(newEditorial.case).toMatchObject({ editorialAssignment: null, legalAssignment: null, editorialDecision: null, legalDecision: null });
    const superseded = await test.authorization.supersedeAuthorizationForNewVersion({ context: authorizationContext(), authorizationCaseId: granted.authorizationCase.authorizationCaseId, expectedVersion: 1, newRecordVersion: 2, idempotencyKey: "superseder-autorizacion-ficticia" });
    expect(superseded).toMatchObject({ authorizationCurrent: false, publicationAuthorizationGranted: false, authorizationCase: { status: "superseded", recordVersion: 1 } });
    await expect(test.authorizationRepository.findActiveByRecordVersion(foundation.created.id, 2, INITIAL_NOW)).resolves.toBeNull();
    await expect(test.authorization.getAuthorizationHistory({ context: authorizationContext(), recordId: foundation.created.id })).resolves.toHaveLength(2);
  });
});

describe("persistencia, lifecycle y logging", () => {
  it("reabre SQLite temporal y recupera autorización e historial", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "buholex-11j-")); const databasePath = path.join(directory, "autorizacion-ficticia.sqlite"); let test: TestSystem | undefined; let reopened: SqliteJurisprudencePublicationAuthorizationRepository | undefined;
    try {
      test = createSystem("sqlite", { authorizationPath: databasePath }); const foundation = await completeFoundation(test, 17); const granted = await test.authorization.authorizePublication(authorizeCommand(foundation.completed.dossier.dossierId, 17));
      await test.close();
      reopened = new SqliteJurisprudencePublicationAuthorizationRepository(databasePath);
      await expect(reopened.findById(granted.authorizationCase.authorizationCaseId)).resolves.toMatchObject({ status: "authorized", publicationExecuted: false });
      await expect(reopened.listHistoryByRecord(foundation.created.id)).resolves.toHaveLength(1);
      await expect(reopened.findIdempotencyResult("autorizar-publicacion-ficticia-17")).resolves.toMatchObject({ result: granted });
    } finally {
      await test?.close();
      await reopened?.close();
      rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
    expect([databasePath, `${databasePath}-shm`, `${databasePath}-wal`, `${databasePath}-journal`].every((file) => !existsSync(file))).toBe(true);
  });
  it("libera SQLite aunque una operación intermedia falle", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "buholex-11j-failure-")); const databasePath = path.join(directory, "autorizacion-ficticia.sqlite"); let test: TestSystem | undefined; let intermediateErrorObserved = false;
    try {
      test = createSystem("sqlite", { authorizationPath: databasePath });
      await expect(test.authorization.getAuthorizationCase({ context: authorizationContext(), authorizationCaseId: "caso-inexistente-ficticio" })).rejects.toMatchObject({ code: "NOT_FOUND" });
      intermediateErrorObserved = true;
    } finally {
      await test?.close();
      rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
    expect(intermediateErrorObserved).toBe(true);
    expect([databasePath, `${databasePath}-shm`, `${databasePath}-wal`, `${databasePath}-journal`].every((file) => !existsSync(file))).toBe(true);
  });
  it("close es idempotente y las operaciones posteriores fallan", async () => { const test = createSystem("memory"); await test.authorization.close(); await test.authorization.close(); await expect(test.authorization.getAuthorizationCase({ context: authorizationContext(), authorizationCaseId: "caso-ficticio" })).rejects.toMatchObject({ code: "RESOURCE_CLOSED" }); });
  it("el logging es mínimo y no filtra razones ni contenido", async () => { const logs: JurisprudencePublicationAuthorizationLogEvent[] = []; const test = createSystem("memory", { logs }); const foundation = await completeFoundation(test, 18); await test.authorization.authorizePublication(authorizeCommand(foundation.completed.dossier.dossierId, 18, { reasons: ["Razón privada que no debe registrarse."] })); const serialized = JSON.stringify(logs); expect(serialized).not.toMatch(/Razón privada|officialText|checksum|privacy|rights|SQL|stack|token|cookie|headers|sourceUrl/i); for (const event of logs) expect(Object.keys(event).sort()).toEqual(expect.arrayContaining(["operation", "requestId", "resultCode", "timestamp"])); });
  it("readiness mantiene inexistente la decisión institucional real", () => { expect(evaluateJurisprudencePublicationAuthorizationReadiness()).toEqual({ authorizationContractsReady: true, authorizationRepositoryReadyForTesting: true, authorizationServiceReadyForTesting: true, institutionalDecisionPresent: false, authorizationGranted: false, authorizationCurrent: false, publicationExecutionReady: false, routeMountReady: false, productionReady: false, overrideSupported: false, statement: "11.J valida la puerta institucional de autorización, pero no registra una decisión institucional real ni ejecuta publicación." }); });
  it("el esquema persistido nunca admite publicationExecuted true", () => { const parsed = jurisprudencePublicationAuthorizationCaseSchema.safeParse({ authorizationCaseId: "caso-ficticio", publicationDossierId: "dossier-ficticio", recordId: "registro-ficticio", recordVersion: 1, decision: "authorize", status: "authorized", institutionalAuthorityRef: "autoridad-ficticia", decisionRef: "decision-ficticia", authorizationScopeRef: "alcance-ficticio", decidedAt: INITIAL_NOW, effectiveFrom: INITIAL_NOW, reasons: [], blockers: [], conditions: JURISPRUDENCE_PUBLICATION_AUTHORIZATION_REQUIRED_CONDITIONS, version: 1, createdAt: INITIAL_NOW, updatedAt: INITIAL_NOW, revokedAt: null, supersededAt: null, publicationAuthorizationGranted: true, publicationExecuted: true }); expect(parsed.success).toBe(false); });
});

describe("barreras estáticas y preservación", () => {
  it("no monta rutas Auth0 en jurisprudencia y conserva React 19.1.6", () => { const authorizedRouteFiles = ["app/api/admin/complaints/[complaintId]/responses/route.ts", "app/api/complaints/route.ts", "app/api/owl/admission/route.ts"]; const packageJson = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")); const lockfile = readFileSync(path.join(ROOT, "pnpm-lock.yaml"), "utf8"); expect(packageJson.dependencies).toMatchObject({ react: "19.1.6", "react-dom": "19.1.6" }); expect(packageJson.dependencies["@auth0/nextjs-auth0"]).toBe("4.26.0"); expect(lockfile).toContain("@auth0/nextjs-auth0"); const routes = readdirSync(path.join(ROOT, "app"), { recursive: true }).filter((entry): entry is string => typeof entry === "string" && /(^|[\\/\\\\])route\.ts$/.test(entry)).map((entry) => path.relative(ROOT, path.join(ROOT, "app", entry)).split(path.sep).join("/")); expect(routes.sort()).toEqual(authorizedRouteFiles.sort()); const appEntries = readdirSync(path.join(ROOT, "app"), { recursive: true }).filter((entry): entry is string => typeof entry === "string"); expect(appEntries.some((entry) => entry.replaceAll("\\", "/").startsWith("api/") && /jurisprudence/.test(entry))).toBe(false); });
  it("el servicio no importa UI, rutas, SQLite concreto ni adquisición externa", () => { const source = readFileSync(path.join(ROOT, "lib", "jurisprudence-publication-authorization-service.ts"), "utf8"); expect(source).not.toMatch(/@\/app|@\/components|next\/|sqlite-jurisprudence|InMemoryJurisprudence|fetch\(|scrap|OCR|RAG|embedding|@auth0/i); expect(source).not.toMatch(/publishNow|forcePublish|routeMount/); const pageSource = readFileSync(path.join(ROOT, "app", "jurisprudencia", "page.tsx"), "utf8"); expect(pageSource).not.toMatch(/publication-authorization/); });
  it("no existe operación de ejecución de publicación", () => { const service = createSystem("memory").authorization; expect(service).not.toHaveProperty("publish"); expect(service).not.toHaveProperty("executePublication"); expect(service).not.toHaveProperty("mountRoute"); });
  it("preserva SRV-WEB-001", () => { expect(publicServices.find((service) => service.id === "SRV-WEB-001")).toMatchObject({ id: "SRV-WEB-001", allowsImmediatePayment: false, published: false }); });
  it("preserva BL-LEG-CON-001 y todas sus descargas deshabilitadas", () => { expect(rentalHousingContract).toMatchObject({ id: "BL-LEG-CON-001", availabilityStatus: "editorial_preview", price: null, currency: null, licenseStatus: "pending", publicationAuthorization: { authorized: false }, masterInternalFile: { publicDownloadAuthorized: false }, intellectualProperty: { supportingDocument: { publiclyVisible: false, downloadable: false } } }); expect([...rentalHousingContract.commercialFiles, ...rentalHousingContract.annexFiles].every((file) => !file.publicDownloadAuthorized)).toBe(true); });
});
