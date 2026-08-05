// @vitest-environment node

import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { publicServices } from "@/data/services";
import { rentalHousingContract } from "@/data/template-catalog";
import { InMemoryJurisprudenceEditorialCaseRepository } from "@/lib/in-memory-jurisprudence-editorial-case-repository";
import { InMemoryJurisprudencePublicationDossierRepository } from "@/lib/in-memory-jurisprudence-publication-dossier-repository";
import { InMemoryJurisprudenceRepository } from "@/lib/in-memory-jurisprudence-repository";
import { createJurisprudenceInternalApi } from "@/lib/jurisprudence-application-factory";
import { createJurisprudenceEditorialWorkflow } from "@/lib/jurisprudence-editorial-workflow";
import { evaluateJurisprudencePublicationGovernanceReadiness } from "@/lib/jurisprudence-publication-governance-readiness";
import { createJurisprudencePublicationGovernanceService } from "@/lib/jurisprudence-publication-governance-service";
import { assessPrivacyCommandSchema, openPublicationDossierCommandSchema, registerJurisprudenceSourceCommandSchema } from "@/lib/schemas/jurisprudence-publication-governance";
import { SqliteJurisprudenceEditorialCaseRepository } from "@/lib/sqlite-jurisprudence-editorial-case-repository";
import { SqliteJurisprudencePublicationDossierRepository } from "@/lib/sqlite-jurisprudence-publication-dossier-repository";
import { createFictitiousJurisprudenceRecord } from "@/tests/helpers/jurisprudence-record-fixture";
import type { JurisprudenceApplicationContext, JurisprudenceInternalApi } from "@/types/jurisprudence-application";
import type { JurisprudenceEditorialWorkflow, JurisprudenceEditorialWorkflowContext } from "@/types/jurisprudence-editorial-workflow";
import type { JurisprudencePublicationDossierRepository, JurisprudencePublicationGovernanceService, PublicationGovernanceContext, PublicationGovernanceLogEvent } from "@/types/jurisprudence-publication-governance";
import type { JurisprudenceNewRecord, JurisprudenceRepositoryDependencies } from "@/types/jurisprudence-repository";

const ROOT = path.resolve(__dirname, "..");
const NOW = "2026-07-29T23:00:00.000Z";
const openServices: JurisprudencePublicationGovernanceService[] = [];

function appContext(seed = 1): JurisprudenceApplicationContext { return { requestId: `phase-11-i-app-${seed}`, actor: { kind: "internal_test", id: "actor-ficticio-11i" }, operationSource: "test", requestedAt: NOW }; }
function context(seed = 1, actorReference = "actor-gobierno-ficticio"): PublicationGovernanceContext { return { requestId: `phase-11-i-request-${seed}`, actorReference, requestedAt: NOW }; }
function editorialContext(seed = 1, actorReference = "actor-editorial-ficticio"): JurisprudenceEditorialWorkflowContext { return { requestId: `phase-11-i-editorial-${seed}`, actorReference, requestedAt: NOW }; }
function dependencies(prefix: string): JurisprudenceRepositoryDependencies { let sequence = 0; return { now: () => `2026-07-29T23:00:${String(sequence++).padStart(2, "0")}.000Z`, generateId: () => `${prefix}-record-${sequence}` }; }
function record(seed = 1): JurisprudenceNewRecord {
  const base = createFictitiousJurisprudenceRecord(seed);
  return { ...base, slug: `gobierno-ficticio-11i-${seed}`, caseNumber: `EXP-FICTICIO-11I-${seed}`, resolutionNumber: `RESOLUCION-FICTICIA-11I-${seed}`, institution: { ...base.institution, id: "organo-ficticio-11i", name: "ÓRGANO JURISDICCIONAL FICTICIO 11.I", shortName: "ÓRGANO FICTICIO 11.I" }, source: { ...base.source, documentId: `DOC-FICTICIO-11I-${seed}`, verificationNotes: "Fixture ficticio sin fuente real." } };
}
function sourceInput(overrides: Record<string, unknown> = {}) {
  return {
    sourceKind: "official_publication",
    originType: "primary_official_document",
    institutionalOrigin: "INSTITUCIÓN FICTICIA DE PRUEBA",
    jurisdiction: "JURISDICCIÓN FICTICIA",
    documentReference: "DOCUMENTO-FICTICIO-11I-001",
    sourceUrl: "https://example.invalid/documento-ficticio-11i",
    sourceDate: "2026-07-01",
    retrievedAt: NOW,
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
    ...overrides,
  };
}

interface System { api: JurisprudenceInternalApi; editorial: JurisprudenceEditorialWorkflow; governance: JurisprudencePublicationGovernanceService; dossierRepository: JurisprudencePublicationDossierRepository }
function system(kind: "memory" | "sqlite", options: { dossierPath?: string; logs?: PublicationGovernanceLogEvent[] } = {}): System {
  const api = createJurisprudenceInternalApi({ repository: new InMemoryJurisprudenceRepository(dependencies(`juris-${kind}`)), now: () => NOW });
  const editorial = createJurisprudenceEditorialWorkflow({ api, repository: kind === "memory" ? new InMemoryJurisprudenceEditorialCaseRepository() : new SqliteJurisprudenceEditorialCaseRepository(":memory:"), now: () => NOW, generateId: (() => { let value = 0; return () => `editorial-ficticio-11i-${++value}`; })() });
  const repository = kind === "memory" ? new InMemoryJurisprudencePublicationDossierRepository() : new SqliteJurisprudencePublicationDossierRepository(options.dossierPath ?? ":memory:");
  let value = 0;
  const governance = createJurisprudencePublicationGovernanceService({ api, editorialWorkflow: editorial, repository, now: () => NOW, generateId: () => `gobierno-ficticio-11i-${++value}`, ...(options.logs === undefined ? {} : { logger: { log: (event) => options.logs?.push(event) } }) });
  openServices.push(governance);
  return { api, editorial, governance, dossierRepository: repository };
}

async function verifiedEditorial(test: System, seed = 1) {
  const created = await test.api.createRecord({ context: appContext(seed), idempotencyKey: `crear-registro-ficticio-11i-${seed}`, record: record(seed) });
  const opened = await test.editorial.openCase({ context: editorialContext(seed), recordId: created.id, expectedRecordVersion: 1, purpose: "Revisión ficticia para gobierno de fuentes.", idempotencyKey: `abrir-editorial-ficticio-11i-${seed}` });
  const editorialAssigned = await test.editorial.assignReview({ context: editorialContext(seed + 10, "coordinador-ficticio"), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: opened.case.caseVersion, reviewKind: "editorial_review", assigneeReference: "revisor-editorial-ficticio", idempotencyKey: `asignar-editorial-ficticio-11i-${seed}` });
  const legalAssigned = await test.editorial.assignReview({ context: editorialContext(seed + 20, "coordinador-ficticio"), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: editorialAssigned.case.caseVersion, reviewKind: "legal_verification", assigneeReference: "verificador-juridico-ficticio", idempotencyKey: `asignar-juridico-ficticio-11i-${seed}` });
  const editorialApproved = await test.editorial.recordDecision({ context: editorialContext(seed + 30, "revisor-editorial-ficticio"), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: legalAssigned.case.caseVersion, decision: "editorial_approved", idempotencyKey: `aprobar-editorial-ficticio-11i-${seed}` });
  const legalApproved = await test.editorial.recordDecision({ context: editorialContext(seed + 40, "verificador-juridico-ficticio"), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: editorialApproved.case.caseVersion, decision: "legal_verification_approved", idempotencyKey: `aprobar-juridico-ficticio-11i-${seed}` });
  const evaluated = await test.editorial.evaluatePublication({ context: editorialContext(seed + 50), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: legalApproved.case.caseVersion, idempotencyKey: `evaluar-editorial-ficticio-11i-${seed}` });
  return { created, editorial: evaluated };
}

async function seededDossier(test: System, seed = 1, options: { verified?: boolean; owner?: boolean; sourceOverrides?: Record<string, unknown> } = {}) {
  const foundation = await verifiedEditorial(test, seed);
  const registered = await test.governance.registerSource({ context: context(seed), source: sourceInput(options.sourceOverrides), idempotencyKey: `registrar-fuente-ficticia-11i-${seed}` });
  const bound = await test.governance.bindSource({ context: context(seed + 1), sourceId: registered.source.sourceId, recordId: foundation.created.id, expectedRecordVersion: 1, bindingKind: "official_basis", isPrimarySource: true, secondarySourceJustificationReference: null, idempotencyKey: `vincular-fuente-ficticia-11i-${seed}` });
  const opened = await test.governance.openDossier({ context: context(seed + 2), recordId: foundation.created.id, expectedRecordVersion: 1, editorialCaseId: foundation.editorial.case.caseId, expectedEditorialCaseVersion: foundation.editorial.case.caseVersion, sourceBindingIds: [bound.binding.bindingId], institutionalOwnerReference: options.owner === false ? null : "responsable-institucional-futuro", idempotencyKey: `abrir-dossier-ficticio-11i-${seed}` });
  return { ...foundation, registered, bound, opened };
}

async function completeDossier(test: System, seed = 1) {
  const seeded = await seededDossier(test, seed);
  const base = { context: context(seed + 100), dossierId: seeded.opened.dossier.dossierId, expectedRecordVersion: 1, idempotencyKey: "" };
  const p = await test.governance.assessProvenance({ ...base, expectedDossierVersion: 1, status: "verified", idempotencyKey: `prov-${seed}-ficticia` });
  const i = await test.governance.assessIntegrity({ ...base, expectedDossierVersion: p.dossier.version, status: "checksum_verified", idempotencyKey: `integridad-${seed}-ficticia` });
  const r = await test.governance.assessRights({ ...base, expectedDossierVersion: i.dossier.version, status: "public_display_permitted", idempotencyKey: `derechos-${seed}-ficticia` });
  const pr = await test.governance.assessPrivacy({ ...base, expectedDossierVersion: r.dossier.version, status: "approved_for_public_projection", riskCategories: [], otherRiskReference: null, idempotencyKey: `privacidad-${seed}-ficticia` });
  const projection = await test.governance.assessPublicProjection({ ...base, expectedDossierVersion: pr.dossier.version, status: "approved", idempotencyKey: `proyeccion-${seed}-ficticia` });
  const completed = await test.governance.evaluateDossier({ ...base, expectedDossierVersion: projection.dossier.version, idempotencyKey: `evaluacion-${seed}-ficticia` });
  return { ...seeded, completed };
}

afterEach(async () => { await Promise.all(openServices.splice(0).map((service) => service.close())); });

describe("contratos estrictos de fuente y expediente", () => {
  it("acepta una fuente ficticia válida", () => { expect(registerJurisprudenceSourceCommandSchema.safeParse({ context: context(), source: sourceInput(), idempotencyKey: "fuente-ficticia-valida" }).success).toBe(true); });
  it.each([
    ["campo desconocido", { source: { ...sourceInput(), dni: "12345678" } }],
    ["id controlado", { source: { ...sourceInput(), sourceId: "controlado" } }],
    ["fecha inválida", { source: { ...sourceInput(), sourceDate: "2026-99-99" } }],
    ["URL inválida", { source: { ...sourceInput(), sourceUrl: "no-es-url" } }],
    ["URL con query", { source: { ...sourceInput(), sourceUrl: "https://example.invalid/doc?token=ficticio" } }],
    ["checksum inválido", { source: { ...sourceInput(), sourceChecksum: "corto" } }],
    ["flag publicado", { published: true }],
  ])("rechaza %s sin propagar excepción nativa", (_label, override) => {
    const command = { context: context(), source: sourceInput(), idempotencyKey: "fuente-ficticia-valida", ...override };
    expect(() => registerJurisprudenceSourceCommandSchema.safeParse(command)).not.toThrow();
    expect(registerJurisprudenceSourceCommandSchema.safeParse(command).success).toBe(false);
  });
  it("limita fuentes y categorías de riesgo", () => {
    const open = openPublicationDossierCommandSchema.safeParse({ context: context(), recordId: "registro-ficticio", expectedRecordVersion: 1, editorialCaseId: "editorial-ficticio", expectedEditorialCaseVersion: 1, sourceBindingIds: Array.from({ length: 21 }, (_, index) => `vinculo-ficticio-${index}`), institutionalOwnerReference: null, idempotencyKey: "limite-fuentes-ficticio" });
    const privacy = assessPrivacyCommandSchema.safeParse({ context: context(), dossierId: "dossier-ficticio", expectedRecordVersion: 1, expectedDossierVersion: 1, status: "in_review", riskCategories: Array.from({ length: 11 }, () => "minors"), otherRiskReference: null, idempotencyKey: "limite-riesgos-ficticio" });
    expect(open.success).toBe(false); expect(privacy.success).toBe(false);
  });
});

describe("gobierno de fuentes y vínculos", () => {
  it.each(["memory", "sqlite"] as const)("registra fuente y vínculo versionado con %s", async (kind) => { const test = system(kind); const seeded = await seededDossier(test); expect(seeded.registered.source).toMatchObject({ sourceKind: "official_publication", provenanceStatus: "verified", integrityStatus: "checksum_verified" }); expect(seeded.bound.binding).toMatchObject({ recordVersion: 1, isPrimarySource: true, bindingStatus: "active" }); });
  it("distingue checksum técnico de procedencia y derechos", async () => { const test = system("memory"); const registered = await test.governance.registerSource({ context: context(), source: sourceInput({ provenanceStatus: "unverified", integrityStatus: "checksum_verified", rightsStatus: "unknown" }), idempotencyKey: "fuente-checksum-no-autoridad" }); expect(registered.source).toMatchObject({ integrityStatus: "checksum_verified", provenanceStatus: "unverified", rightsStatus: "unknown" }); });
  it("rechaza fuente disputada y una secundaria declarada primaria", async () => {
    const disputed = system("memory"); const foundation = await verifiedEditorial(disputed); const source = await disputed.governance.registerSource({ context: context(), source: sourceInput({ provenanceStatus: "disputed", verificationStatus: "disputed" }), idempotencyKey: "fuente-disputada-ficticia" });
    await expect(disputed.governance.bindSource({ context: context(), sourceId: source.source.sourceId, recordId: foundation.created.id, expectedRecordVersion: 1, bindingKind: "official_basis", isPrimarySource: true, secondarySourceJustificationReference: null, idempotencyKey: "vinculo-disputado-ficticio" })).rejects.toMatchObject({ code: "SOURCE_NOT_ELIGIBLE" });
    const secondary = system("memory"); const other = await verifiedEditorial(secondary, 2); const secondarySource = await secondary.governance.registerSource({ context: context(), source: sourceInput({ sourceKind: "secondary_reference", originType: "secondary_source" }), idempotencyKey: "fuente-secundaria-ficticia" });
    await expect(secondary.governance.bindSource({ context: context(), sourceId: secondarySource.source.sourceId, recordId: other.created.id, expectedRecordVersion: 1, bindingKind: "secondary_context", isPrimarySource: true, secondarySourceJustificationReference: null, idempotencyKey: "vinculo-secundario-primario" })).rejects.toMatchObject({ code: "SOURCE_NOT_ELIGIBLE" });
  });
  it("acepta fuente secundaria únicamente con justificación y sin elevarla", async () => { const test = system("memory"); const foundation = await verifiedEditorial(test); const source = await test.governance.registerSource({ context: context(), source: sourceInput({ sourceKind: "secondary_reference", originType: "secondary_source" }), idempotencyKey: "fuente-secundaria-justificada" }); const binding = await test.governance.bindSource({ context: context(), sourceId: source.source.sourceId, recordId: foundation.created.id, expectedRecordVersion: 1, bindingKind: "secondary_context", isPrimarySource: false, secondarySourceJustificationReference: "justificacion-interna-ficticia", idempotencyKey: "vinculo-secundario-justificado" }); expect(binding.binding.isPrimarySource).toBe(false); });
  it("sustituye un vínculo sin borrar el anterior", async () => { const test = system("memory"); const seeded = await seededDossier(test, 11); const replacementSource = await test.governance.registerSource({ context: context(), source: sourceInput({ documentReference: "DOCUMENTO-FICTICIO-11I-REEMPLAZO", sourceChecksum: "c".repeat(64), sourceFingerprint: "d".repeat(64) }), idempotencyKey: "registrar-reemplazo-ficticio" }); const replacement = await test.governance.supersedeSourceBinding({ context: context(), bindingId: seeded.bound.binding.bindingId, replacementSourceId: replacementSource.source.sourceId, expectedRecordVersion: 1, bindingKind: "official_basis", isPrimarySource: true, secondarySourceJustificationReference: null, idempotencyKey: "sustituir-vinculo-ficticio" }); expect(replacement.binding.bindingStatus).toBe("active"); await expect(test.dossierRepository.findBindingById(seeded.bound.binding.bindingId)).resolves.toMatchObject({ bindingStatus: "superseded", supersededByBindingId: replacement.binding.bindingId }); });
});

describe("expediente, decisiones y default deny", () => {
  it("abre expediente idempotente y detecta conflicto", async () => { const test = system("memory"); const seeded = await seededDossier(test); const replay = await test.governance.openDossier({ context: context(99), recordId: seeded.created.id, expectedRecordVersion: 1, editorialCaseId: seeded.editorial.case.caseId, expectedEditorialCaseVersion: seeded.editorial.case.caseVersion, sourceBindingIds: [seeded.bound.binding.bindingId], institutionalOwnerReference: "responsable-institucional-futuro", idempotencyKey: "abrir-dossier-ficticio-11i-1" }); expect(replay).toEqual(seeded.opened); await expect(test.governance.openDossier({ context: context(), recordId: seeded.created.id, expectedRecordVersion: 1, editorialCaseId: seeded.editorial.case.caseId, expectedEditorialCaseVersion: seeded.editorial.case.caseVersion, sourceBindingIds: [seeded.bound.binding.bindingId], institutionalOwnerReference: null, idempotencyKey: "abrir-dossier-ficticio-11i-1" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" }); });
  it("rechaza duplicado activo y expediente editorial inexistente", async () => { const test = system("memory"); const seeded = await seededDossier(test, 12); await expect(test.governance.openDossier({ context: context(), recordId: seeded.created.id, expectedRecordVersion: 1, editorialCaseId: seeded.editorial.case.caseId, expectedEditorialCaseVersion: seeded.editorial.case.caseVersion, sourceBindingIds: [seeded.bound.binding.bindingId], institutionalOwnerReference: "responsable-ficticio", idempotencyKey: "segundo-dossier-ficticio" })).rejects.toMatchObject({ code: "DUPLICATE_ACTIVE_DOSSIER" }); const other = system("memory"); const created = await other.api.createRecord({ context: appContext(), idempotencyKey: "registro-sin-editorial-ficticio", record: record(13) }); const source = await other.governance.registerSource({ context: context(), source: sourceInput(), idempotencyKey: "fuente-sin-editorial-ficticia" }); const binding = await other.governance.bindSource({ context: context(), sourceId: source.source.sourceId, recordId: created.id, expectedRecordVersion: 1, bindingKind: "official_basis", isPrimarySource: true, secondarySourceJustificationReference: null, idempotencyKey: "vinculo-sin-editorial-ficticio" }); await expect(other.governance.openDossier({ context: context(), recordId: created.id, expectedRecordVersion: 1, editorialCaseId: "editorial-inexistente-ficticio", expectedEditorialCaseVersion: 1, sourceBindingIds: [binding.binding.bindingId], institutionalOwnerReference: "responsable-ficticio", idempotencyKey: "dossier-sin-editorial-ficticio" })).rejects.toMatchObject({ code: "NOT_FOUND" }); });
  it("un expediente incompleto expone bloqueos cerrados", async () => { const seeded = await seededDossier(system("memory"), 2, { owner: false }); expect(seeded.opened.evaluation).toMatchObject({ decision: "incomplete", publicationAuthorizationGranted: false, publicationExecuted: false }); if (seeded.opened.evaluation.decision === "incomplete") expect(seeded.opened.evaluation.blockers).toEqual(expect.arrayContaining(["source_provenance_unverified", "source_integrity_unverified", "source_rights_unknown", "privacy_review_missing", "public_projection_not_approved", "institutional_owner_missing"])); });
  it.each([
    ["integridad en conflicto", "assessIntegrity", "integrity_conflict", "source_integrity_conflict"],
    ["derechos desconocidos", "assessRights", "unknown", "source_rights_unknown"],
    ["derechos restringidos", "assessRights", "restricted", "source_rights_restricted"],
    ["privacidad pendiente", "assessPrivacy", "in_review", "privacy_review_missing"],
    ["redacción requerida", "assessPrivacy", "requires_redaction", "privacy_redaction_required"],
  ] as const)("mantiene bloqueo por %s", async (_label, method, status, blocker) => {
    const test = system("memory"); const seeded = await seededDossier(test, 3); const base = { context: context(), dossierId: seeded.opened.dossier.dossierId, expectedRecordVersion: 1, expectedDossierVersion: 1, idempotencyKey: `bloqueo-${method}-ficticio` };
    const view = method === "assessIntegrity" ? await test.governance.assessIntegrity({ ...base, status }) : method === "assessRights" ? await test.governance.assessRights({ ...base, status }) : await test.governance.assessPrivacy({ ...base, status, riskCategories: [], otherRiskReference: null });
    if (view.evaluation.decision === "incomplete") expect(view.evaluation.blockers).toContain(blocker);
  });
  it.each(["memory", "sqlite"] as const)("alcanza solo complete_for_authorization_evaluation con %s", async (kind) => { const result = await completeDossier(system(kind), kind === "memory" ? 4 : 5); expect(result.completed.dossier.status).toBe("complete_for_authorization_evaluation"); expect(result.completed.evaluation).toMatchObject({ decision: "ready_for_authorization_evaluation", publicationAuthorizationGranted: false, publicationExecuted: false }); expect(JSON.stringify(result.completed)).not.toMatch(/"authorized"|"published"/); });
  it("no expone operación publish ni bypass", () => { const governance = system("memory").governance; expect(governance).not.toHaveProperty("publish"); expect(governance).not.toHaveProperty("authorize"); expect(governance).not.toHaveProperty("forcePublish"); });
  it("controla versión e idempotencia de mutaciones", async () => { const test = system("memory"); const seeded = await seededDossier(test, 6); const command = { context: context(), dossierId: seeded.opened.dossier.dossierId, expectedRecordVersion: 1, expectedDossierVersion: 1, status: "verified", idempotencyKey: "proveniencia-idempotente-ficticia" }; const first = await test.governance.assessProvenance(command); await expect(test.governance.assessProvenance({ ...command, context: context(99) })).resolves.toEqual(first); await expect(test.governance.assessProvenance({ ...command, status: "disputed" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" }); await expect(test.governance.assessIntegrity({ ...command, expectedDossierVersion: 1, status: "checksum_verified", idempotencyKey: "version-concurrente-ficticia" })).rejects.toMatchObject({ code: "VERSION_CONFLICT" }); });
  it("conserva historial append-only", async () => { const test = system("memory"); const result = await completeDossier(test, 7); const history = await test.governance.getHistory({ context: context(), dossierId: result.completed.dossier.dossierId }); expect(history.map((event) => event.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7]); expect(history.at(-1)?.type).toBe("dossier_completed"); });
  it("un cambio de versión supera el expediente sin heredar decisiones", async () => { const test = system("memory"); const result = await completeDossier(test, 8); await test.api.updateRecord({ context: appContext(88), id: result.created.id, expectedVersion: 1, changeKind: "editorial_update", record: { ...record(8), editorialContent: { ...record(8).editorialContent, editorialTitle: "Versión ficticia actualizada" } } }); const superseded = await test.governance.synchronizeDossier({ context: context(), dossierId: result.completed.dossier.dossierId, expectedDossierVersion: result.completed.dossier.version, idempotencyKey: "sincronizar-version-ficticia" }); expect(superseded.dossier.status).toBe("superseded"); expect(superseded.evaluation).toMatchObject({ decision: "incomplete", publicationAuthorizationGranted: false, publicationExecuted: false }); });
});

describe("persistencia, logging y readiness", () => {
  it("reabre SQLite temporal y recupera expediente e historial", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "buholex-11i-")); const databasePath = path.join(directory, "dossier-ficticio.sqlite"); let reopened: SqliteJurisprudencePublicationDossierRepository | null = null;
    try { const test = system("sqlite", { dossierPath: databasePath }); const result = await completeDossier(test, 9); const dossierId = result.completed.dossier.dossierId; await test.governance.close(); openServices.splice(openServices.indexOf(test.governance), 1); reopened = new SqliteJurisprudencePublicationDossierRepository(databasePath); await expect(reopened.findById(dossierId)).resolves.toMatchObject({ dossierId, status: "complete_for_authorization_evaluation" }); await expect(reopened.listEvents(dossierId)).resolves.toHaveLength(7); }
    finally { await reopened?.close(); rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); }
  });
  it("cierra idempotentemente y rechaza operaciones posteriores", async () => { const test = system("memory"); await test.governance.close(); await test.governance.close(); openServices.splice(openServices.indexOf(test.governance), 1); await expect(test.governance.registerSource({ context: context(), source: sourceInput(), idempotencyKey: "despues-cierre-ficticio" })).rejects.toMatchObject({ code: "RESOURCE_CLOSED" }); });
  it("emite logging mínimo sin contenido sensible", async () => { const logs: PublicationGovernanceLogEvent[] = []; const test = system("memory", { logs }); await completeDossier(test, 10); const serialized = JSON.stringify(logs); expect(serialized).not.toMatch(/sourceChecksum|sourceFingerprint|officialText|SQL|stack|token|cookie|headers|DOCUMENTO-FICTICIO/i); for (const event of logs) expect(Object.keys(event).sort()).toEqual(expect.arrayContaining(["operation", "requestId", "resultCode", "timestamp"])); });
  it("readiness conserva autorización, ejecución y montaje deshabilitados", () => { expect(evaluateJurisprudencePublicationGovernanceReadiness()).toMatchObject({ sourceGovernanceContractsReady: true, publicationDossierContractsReady: true, inMemoryAdapterReady: true, sqliteAdapterReadyForTesting: true, publicationAuthorizationPolicyReady: false, publicationExecutionReady: false, publicationAuthorizationGranted: false, publicationExecuted: false, authenticationReal: false, endpointsMounted: false, uiConnected: false, publicSearchConnected: false, readyForRouteMount: false, overrideSupported: false }); });
});

describe("barreras estáticas y preservación", () => {
  it("no monta rutas, UI ni Auth0 y conserva React 19.1.1", () => { const authorizedRouteFiles = ["app/api/owl/admission/route.ts"]; const packageJson = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")); const lockfile = readFileSync(path.join(ROOT, "pnpm-lock.yaml"), "utf8"); expect(packageJson.dependencies).toMatchObject({ react: "19.1.1", "react-dom": "19.1.1" }); expect(packageJson.dependencies).not.toHaveProperty("@auth0/nextjs-auth0"); expect(lockfile).not.toContain("@auth0/nextjs-auth0"); const routes = readdirSync(path.join(ROOT, "app"), { recursive: true }).filter((entry): entry is string => typeof entry === "string" && /(^|[\\/])route\.ts$/.test(entry)).map((entry) => path.relative(ROOT, path.join(ROOT, "app", entry)).split(path.sep).join("/")); expect(routes.sort()).toEqual(authorizedRouteFiles.sort()); const appEntries = readdirSync(path.join(ROOT, "app"), { recursive: true }).filter((entry): entry is string => typeof entry === "string"); expect(appEntries.some((entry) => entry.replaceAll("\\", "/").startsWith("api/") && /jurisprudence/.test(entry))).toBe(false); });
  it("la infraestructura 11.I no importa UI, rutas, SQLite concreto ni adquisición externa", () => { const service = readFileSync(path.join(ROOT, "lib", "jurisprudence-publication-governance-service.ts"), "utf8"); expect(service).not.toMatch(/@\/app|@\/components|next\/|sqlite-jurisprudence|InMemoryJurisprudence|fetch\(|scrap|OCR|RAG|embedding|@auth0/i); const pageSource = readFileSync(path.join(ROOT, "app", "jurisprudencia", "page.tsx"), "utf8"); expect(pageSource).not.toMatch(/publication-governance|publication-dossier/); });
  it("preserva SRV-WEB-001", () => { expect(publicServices.find((service) => service.id === "SRV-WEB-001")).toMatchObject({ id: "SRV-WEB-001", allowsImmediatePayment: false, published: false }); });
  it("preserva BL-LEG-CON-001 y todas sus descargas deshabilitadas", () => { expect(rentalHousingContract).toMatchObject({ id: "BL-LEG-CON-001", availabilityStatus: "editorial_preview", price: null, currency: null, licenseStatus: "pending", publicationAuthorization: { authorized: false }, masterInternalFile: { publicDownloadAuthorized: false }, intellectualProperty: { supportingDocument: { publiclyVisible: false, downloadable: false } } }); expect([...rentalHousingContract.commercialFiles, ...rentalHousingContract.annexFiles].every((file) => !file.publicDownloadAuthorized)).toBe(true); });
});
