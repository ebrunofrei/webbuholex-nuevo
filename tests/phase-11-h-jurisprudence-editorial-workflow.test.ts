// @vitest-environment node

import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { publicServices } from "@/data/services";
import { rentalHousingContract } from "@/data/template-catalog";
import { InMemoryJurisprudenceEditorialCaseRepository } from "@/lib/in-memory-jurisprudence-editorial-case-repository";
import { InMemoryJurisprudenceRepository } from "@/lib/in-memory-jurisprudence-repository";
import { createJurisprudenceInternalApi, createSqliteJurisprudenceInternalApi } from "@/lib/jurisprudence-application-factory";
import { evaluateJurisprudenceEditorialReadiness } from "@/lib/jurisprudence-editorial-readiness";
import { createJurisprudenceEditorialWorkflow } from "@/lib/jurisprudence-editorial-workflow";
import { SqliteJurisprudenceEditorialCaseRepository } from "@/lib/sqlite-jurisprudence-editorial-case-repository";
import { createFictitiousJurisprudenceRecord } from "@/tests/helpers/jurisprudence-record-fixture";
import type { JurisprudenceApplicationContext, JurisprudenceInternalApi } from "@/types/jurisprudence-application";
import type {
  JurisprudenceEditorialCaseView,
  JurisprudenceEditorialLogEvent,
  JurisprudenceEditorialWorkflow,
  JurisprudenceEditorialWorkflowContext,
} from "@/types/jurisprudence-editorial-workflow";
import type { JurisprudenceNewRecord, JurisprudenceRepositoryDependencies } from "@/types/jurisprudence-repository";

const NOW = "2026-07-29T22:00:00.000Z";

function applicationContext(seed = 1): JurisprudenceApplicationContext {
  return {
    requestId: `phase-11-h-app-request-${String(seed).padStart(3, "0")}`,
    actor: { kind: "internal_test", id: "actor-prueba-11h" },
    operationSource: "test",
    requestedAt: NOW,
  };
}

function workflowContext(actorReference = "actor-editorial-ficticio", seed = 1): JurisprudenceEditorialWorkflowContext {
  return {
    requestId: `phase-11-h-request-${String(seed).padStart(3, "0")}`,
    actorReference,
    requestedAt: NOW,
  };
}

function dependencies(prefix: string): JurisprudenceRepositoryDependencies {
  let sequence = 0;
  return {
    now: () => `2026-07-29T22:00:${String(sequence++).padStart(2, "0")}.000Z`,
    generateId: () => `${prefix}-record-${String(sequence).padStart(3, "0")}`,
  };
}

function fictitiousRecord(seed = 1): JurisprudenceNewRecord {
  const base = createFictitiousJurisprudenceRecord(seed);
  const marker = String(seed).padStart(3, "0");
  return {
    ...base,
    slug: `expediente-editorial-ficticio-11h-${marker}`,
    caseNumber: `EXP-FICTICIO-11H-${marker}`,
    resolutionNumber: `RESOLUCION-FICTICIA-11H-${marker}`,
    institution: {
      ...base.institution,
      id: "organo-jurisdiccional-ficticio-11h",
      name: "ÓRGANO JURISDICCIONAL FICTICIO 11.H",
      shortName: "ÓRGANO FICTICIO 11.H",
    },
    issuingBody: "ORGANO-JURISDICCIONAL-FICTICIO-11H",
    source: {
      ...base.source,
      documentId: `DOC-FICTICIO-11H-${marker}`,
      verificationNotes: "Fixture ficticio sin valor jurídico ni fuente real.",
    },
    editorialContent: {
      ...base.editorialContent,
      editorialTitle: `Expediente editorial ficticio 11.H ${marker}`,
      editorialSummary: "Resumen ficticio exclusivo para pruebas del workflow editorial.",
    },
  };
}

interface TestSystem {
  readonly api: JurisprudenceInternalApi;
  readonly workflow: JurisprudenceEditorialWorkflow;
}

const openWorkflows: JurisprudenceEditorialWorkflow[] = [];

function system(kind: "memory" | "sqlite", options: { logs?: JurisprudenceEditorialLogEvent[]; now?: () => string } = {}): TestSystem {
  const api = createJurisprudenceInternalApi({
    repository: new InMemoryJurisprudenceRepository(dependencies(`juris-${kind}`)),
    now: () => NOW,
  });
  const repository = kind === "memory"
    ? new InMemoryJurisprudenceEditorialCaseRepository()
    : new SqliteJurisprudenceEditorialCaseRepository(":memory:");
  let sequence = 0;
  const workflow = createJurisprudenceEditorialWorkflow({
    api,
    repository,
    now: options.now ?? (() => NOW),
    generateId: () => `editorial-ficticio-11h-${++sequence}`,
    ...(options.logs === undefined ? {} : { logger: { log: (event) => options.logs?.push(event) } }),
  });
  openWorkflows.push(workflow);
  return { api, workflow };
}

async function createRecord(api: JurisprudenceInternalApi, seed = 1) {
  return api.createRecord({
    context: applicationContext(seed),
    idempotencyKey: `registro-editorial-ficticio-11h-${seed}`,
    record: fictitiousRecord(seed),
  });
}

async function openCase(test: TestSystem, seed = 1): Promise<JurisprudenceEditorialCaseView> {
  const record = await createRecord(test.api, seed);
  return test.workflow.openCase({
    context: workflowContext("actor-apertura-ficticio", seed),
    recordId: record.id,
    expectedRecordVersion: record.recordVersion,
    purpose: "Revisión editorial ficticia controlada para la Fase 11.H.",
    idempotencyKey: `apertura-editorial-ficticia-11h-${seed}`,
  });
}

async function assignBoth(test: TestSystem, opened: JurisprudenceEditorialCaseView) {
  const editorial = await test.workflow.assignReview({
    context: workflowContext("coordinador-ficticio", 20),
    caseId: opened.case.caseId,
    expectedRecordVersion: opened.case.recordVersion,
    expectedCaseVersion: opened.case.caseVersion,
    reviewKind: "editorial_review",
    assigneeReference: "revisor-editorial-ficticio",
    idempotencyKey: "asignacion-editorial-ficticia-11h",
  });
  return test.workflow.assignReview({
    context: workflowContext("coordinador-ficticio", 21),
    caseId: editorial.case.caseId,
    expectedRecordVersion: editorial.case.recordVersion,
    expectedCaseVersion: editorial.case.caseVersion,
    reviewKind: "legal_verification",
    assigneeReference: "verificador-juridico-ficticio",
    idempotencyKey: "asignacion-juridica-ficticia-11h",
  });
}

async function approveBoth(test: TestSystem, assigned: JurisprudenceEditorialCaseView) {
  const editorial = await test.workflow.recordDecision({
    context: workflowContext("revisor-editorial-ficticio", 30),
    caseId: assigned.case.caseId,
    expectedRecordVersion: assigned.case.recordVersion,
    expectedCaseVersion: assigned.case.caseVersion,
    decision: "editorial_approved",
    idempotencyKey: "decision-editorial-ficticia-11h",
  });
  return test.workflow.recordDecision({
    context: workflowContext("verificador-juridico-ficticio", 31),
    caseId: editorial.case.caseId,
    expectedRecordVersion: editorial.case.recordVersion,
    expectedCaseVersion: editorial.case.caseVersion,
    decision: "legal_verification_approved",
    idempotencyKey: "decision-juridica-ficticia-11h",
  });
}

afterEach(async () => {
  await Promise.all(openWorkflows.splice(0).map((workflow) => workflow.close()));
});

describe("contratos estrictos", () => {
  it("acepta comandos válidos y abre un expediente", async () => {
    await expect(openCase(system("memory"))).resolves.toMatchObject({ status: "open", case: { caseVersion: 1, recordVersion: 1 } });
  });

  it.each([
    ["campo desconocido", { published: true }],
    ["identificador vacío", { recordId: "" }],
    ["actor con correo", { context: { ...workflowContext(), actorReference: "persona@example.test" } }],
    ["actor semejante a DNI", { context: { ...workflowContext(), actorReference: "12345678" } }],
    ["fecha inválida", { context: { ...workflowContext(), requestedAt: "fecha-inválida" } }],
    ["versión inválida", { expectedRecordVersion: 0 }],
    ["idempotencia inválida", { idempotencyKey: "corta" }],
  ])("rechaza %s sin propagar excepción nativa", async (_label, change) => {
    const test = system("memory");
    const record = await createRecord(test.api);
    const command = {
      context: workflowContext(),
      recordId: record.id,
      expectedRecordVersion: 1,
      purpose: "Finalidad editorial ficticia válida.",
      idempotencyKey: "apertura-valida-ficticia-11h",
      ...change,
    };
    await expect(test.workflow.openCase(command)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rechaza decisión inexistente, estado directo y observación vacía", async () => {
    const test = system("memory");
    const opened = await openCase(test);
    const base = { context: workflowContext(), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: 1, idempotencyKey: "mutacion-invalida-ficticia-11h" };
    await expect(test.workflow.recordDecision({ ...base, decision: "publish" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(test.workflow.recordDecision({ ...base, decision: "editorial_approved", status: "verified_for_publication_evaluation" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(test.workflow.recordObservation({ ...base, category: "metadata_incomplete", severity: "blocking", note: "" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("apertura, idempotencia y concurrencia", () => {
  it.each(["memory", "sqlite"] as const)("abre y recupera expediente mediante %s", async (kind) => {
    const test = system(kind);
    const opened = await openCase(test);
    await expect(test.workflow.getCase({ context: workflowContext(), caseId: opened.case.caseId })).resolves.toEqual(opened);
  });

  it("rechaza registro inexistente y no duplica expediente activo", async () => {
    const test = system("memory");
    await expect(test.workflow.openCase({ context: workflowContext(), recordId: "registro-ficticio-inexistente", expectedRecordVersion: 1, purpose: "Revisión ficticia controlada.", idempotencyKey: "apertura-inexistente-ficticia" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const opened = await openCase(test);
    await expect(test.workflow.openCase({ context: workflowContext(), recordId: opened.case.recordId, expectedRecordVersion: 1, purpose: "Segunda apertura ficticia.", idempotencyKey: "segunda-apertura-ficticia" })).rejects.toMatchObject({ code: "DUPLICATE_ACTIVE_CASE" });
  });

  it("repite el mismo comando y detecta conflicto de idempotencia", async () => {
    const test = system("memory");
    const record = await createRecord(test.api);
    const command = { context: workflowContext(), recordId: record.id, expectedRecordVersion: 1, purpose: "Revisión ficticia idempotente.", idempotencyKey: "apertura-idempotente-ficticia" };
    const first = await test.workflow.openCase(command);
    await expect(test.workflow.openCase({ ...command, context: workflowContext("actor-editorial-ficticio", 2) })).resolves.toEqual(first);
    await expect(test.workflow.openCase({ ...command, purpose: "Contenido distinto ficticio." })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("controla versiones esperadas del registro y expediente", async () => {
    const test = system("memory");
    const record = await createRecord(test.api);
    await expect(test.workflow.openCase({ context: workflowContext(), recordId: record.id, expectedRecordVersion: 2, purpose: "Versión ficticia incorrecta.", idempotencyKey: "version-registro-ficticia" })).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    const opened = await test.workflow.openCase({ context: workflowContext(), recordId: record.id, expectedRecordVersion: 1, purpose: "Versión ficticia correcta.", idempotencyKey: "version-registro-correcta" });
    await expect(test.workflow.assignReview({ context: workflowContext(), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: 2, reviewKind: "editorial_review", assigneeReference: "revisor-ficticio", idempotencyKey: "version-expediente-ficticia" })).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  });
});

describe("revisión editorial y verificación jurídica", () => {
  it("asignar no aprueba y exige separación de actores", async () => {
    const test = system("memory");
    const opened = await openCase(test);
    const assigned = await test.workflow.assignReview({ context: workflowContext("coordinador-ficticio"), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: 1, reviewKind: "editorial_review", assigneeReference: "revisor-unico-ficticio", idempotencyKey: "asignar-unico-ficticio" });
    expect(assigned.status).toBe("open");
    await expect(test.workflow.assignReview({ context: workflowContext("coordinador-ficticio", 2), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: 2, reviewKind: "legal_verification", assigneeReference: "revisor-unico-ficticio", idempotencyKey: "asignar-mismo-ficticio" })).rejects.toMatchObject({ code: "SEPARATION_OF_DUTIES_REQUIRED" });
  });

  it("registra observaciones bloqueantes y no bloqueantes sin borrar historial", async () => {
    const test = system("memory");
    const opened = await openCase(test);
    const blocking = await test.workflow.recordObservation({ context: workflowContext(), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: 1, category: "source_unverified", severity: "blocking", note: "Observación ficticia: falta evidencia controlada.", idempotencyKey: "observacion-bloqueante-ficticia" });
    const nonBlocking = await test.workflow.recordObservation({ context: workflowContext(), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: 2, category: "metadata_incomplete", severity: "non_blocking", note: "Observación editorial ficticia menor.", idempotencyKey: "observacion-menor-ficticia" });
    const resolved = await test.workflow.resolveObservation({ context: workflowContext(), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: 3, observationId: blocking.case.observations[0]?.observationId, idempotencyKey: "resolver-observacion-ficticia" });
    expect(resolved.openBlockingObservations).toBe(0);
    expect(resolved.case.observations).toHaveLength(2);
    expect(nonBlocking.openBlockingObservations).toBe(1);
    await expect(test.workflow.getHistory({ context: workflowContext(), caseId: opened.case.caseId })).resolves.toHaveLength(4);
  });

  it("request_changes invalida aptitud y la aprobación editorial queda separada", async () => {
    const test = system("memory");
    const assigned = await assignBoth(test, await openCase(test));
    const changes = await test.workflow.recordDecision({ context: workflowContext("revisor-editorial-ficticio"), caseId: assigned.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: 3, decision: "request_changes", idempotencyKey: "cambios-editoriales-ficticios" });
    expect(changes.status).toBe("changes_requested");
    const legal = await test.workflow.recordDecision({ context: workflowContext("verificador-juridico-ficticio"), caseId: assigned.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: 4, decision: "legal_verification_approved", idempotencyKey: "juridica-aislada-ficticia" });
    expect(legal.status).toBe("changes_requested");
  });

  it("rechazo jurídico impide readiness y aprobaciones aisladas no bastan", async () => {
    const test = system("memory");
    const assigned = await assignBoth(test, await openCase(test));
    const rejected = await test.workflow.recordDecision({ context: workflowContext("verificador-juridico-ficticio"), caseId: assigned.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: 3, decision: "legal_verification_rejected", idempotencyKey: "rechazo-juridico-ficticio" });
    expect(rejected.status).toBe("legally_rejected");
    expect(evaluateJurisprudenceEditorialReadiness(rejected.case, 1, NOW).publicationEvaluationReady).toBe(false);
    const other = system("memory");
    const otherAssigned = await assignBoth(other, await openCase(other, 2));
    const editorialOnly = await other.workflow.recordDecision({ context: workflowContext("revisor-editorial-ficticio"), caseId: otherAssigned.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: 3, decision: "editorial_approved", idempotencyKey: "editorial-aislada-ficticia" });
    expect(editorialOnly.status).toBe("editorially_approved");
    expect(evaluateJurisprudenceEditorialReadiness(editorialOnly.case, 1, NOW).publicationEvaluationReady).toBe(false);
  });

  it("ambas aprobaciones no bastan con observación bloqueante", async () => {
    const test = system("memory");
    const assigned = await assignBoth(test, await openCase(test));
    const observed = await test.workflow.recordObservation({ context: workflowContext(), caseId: assigned.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: 3, category: "citation_incomplete", severity: "blocking", note: "Cita ficticia pendiente de revisión.", idempotencyKey: "cita-bloqueante-ficticia" });
    const editorial = await test.workflow.recordDecision({ context: workflowContext("revisor-editorial-ficticio"), caseId: assigned.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: observed.case.caseVersion, decision: "editorial_approved", idempotencyKey: "editorial-con-bloqueo-ficticio" });
    const legal = await test.workflow.recordDecision({ context: workflowContext("verificador-juridico-ficticio"), caseId: assigned.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: editorial.case.caseVersion, decision: "legal_verification_approved", idempotencyKey: "legal-con-bloqueo-ficticio" });
    const evaluation = await test.workflow.evaluatePublication({ context: workflowContext(), caseId: assigned.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: legal.case.caseVersion, idempotencyKey: "evaluacion-con-bloqueo-ficticio" });
    expect(evaluation.eligibleForPublicationEvaluation).toBe(false);
    expect(evaluation.case.publicationEvaluation?.publicationExecuted).toBe(false);
  });

  it.each(["memory", "sqlite"] as const)("ambas aprobaciones permiten evaluación informativa con %s, nunca publicación", async (kind) => {
    const test = system(kind);
    const approved = await approveBoth(test, await assignBoth(test, await openCase(test)));
    const evaluation = await test.workflow.evaluatePublication({ context: workflowContext("evaluador-ficticio"), caseId: approved.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: approved.case.caseVersion, idempotencyKey: `evaluacion-ficticia-${kind}` });
    expect(evaluation).toMatchObject({ status: "verified_for_publication_evaluation", eligibleForPublicationEvaluation: true, publicationAuthorizationGranted: false, publicationExecuted: false });
    expect(evaluation.blockers).toEqual(expect.arrayContaining(["PUBLICATION_STATUS_NOT_PUBLISHED", "SOURCE_NOT_VERIFIED"]));
    expect((await test.api.getInternalRecord({ context: applicationContext(), id: approved.case.recordId })).record).toMatchObject({ publicationStatus: "private", verificationStatus: "unverified" });
  });
});

describe("versionado, historial y lifecycle", () => {
  it("cambio de versión invalida decisiones, conserva historia y marca superseded", async () => {
    const test = system("memory");
    const approved = await approveBoth(test, await assignBoth(test, await openCase(test)));
    await test.api.updateRecord({ context: applicationContext(50), id: approved.case.recordId, expectedVersion: 1, changeKind: "editorial_update", record: { ...fictitiousRecord(), editorialContent: { ...fictitiousRecord().editorialContent, editorialSummary: "Nueva versión editorial ficticia." } } });
    const superseded = await test.workflow.synchronizeCase({ context: workflowContext(), caseId: approved.case.caseId, expectedCaseVersion: approved.case.caseVersion, idempotencyKey: "sincronizacion-ficticia-11h" });
    expect(superseded).toMatchObject({ status: "superseded", case: { recordVersion: 1, supersededByRecordVersion: 2 } });
    const history = await test.workflow.getHistory({ context: workflowContext(), caseId: approved.case.caseId });
    expect(history.at(-1)?.type).toBe("case_superseded");
    expect(history.some((event) => event.type === "editorial_decision_recorded")).toBe(true);
    await expect(test.workflow.assignReview({ context: workflowContext(), caseId: approved.case.caseId, expectedRecordVersion: 2, expectedCaseVersion: superseded.case.caseVersion, reviewKind: "editorial_review", assigneeReference: "nuevo-revisor-ficticio", idempotencyKey: "reusar-superado-ficticio" })).rejects.toMatchObject({ code: "CASE_SUPERSEDED" });
  });

  it("historial devuelto es aislado e inmutable respecto de la persistencia", async () => {
    const test = system("memory");
    const opened = await openCase(test);
    const first = await test.workflow.getHistory({ context: workflowContext(), caseId: opened.case.caseId });
    Reflect.set(first[0] ?? {}, "type", "case_closed");
    const second = await test.workflow.getHistory({ context: workflowContext(), caseId: opened.case.caseId });
    expect(second[0]?.type).toBe("editorial_case_opened");
  });

  it("cierre explícito impide mutaciones posteriores y close es idempotente", async () => {
    const test = system("memory");
    const opened = await openCase(test);
    const closed = await test.workflow.closeCase({ context: workflowContext(), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: 1, reason: "Cierre ficticio sin aprobación.", idempotencyKey: "cierre-expediente-ficticio" });
    expect(closed.status).toBe("closed_without_approval");
    await expect(test.workflow.assignReview({ context: workflowContext(), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: 2, reviewKind: "editorial_review", assigneeReference: "revisor-ficticio", idempotencyKey: "mutacion-cerrada-ficticia" })).rejects.toMatchObject({ code: "CASE_CLOSED" });
    await test.workflow.close();
    await test.workflow.close();
    await expect(test.workflow.getCase({ context: workflowContext(), caseId: opened.case.caseId })).rejects.toMatchObject({ code: "RESOURCE_CLOSED" });
  });

  it("expediente expirado no conserva readiness", async () => {
    let clock = Date.parse(NOW);
    const test = system("memory", { now: () => new Date(clock).toISOString() });
    const opened = await openCase(test);
    clock += 31 * 24 * 60 * 60 * 1000;
    const view = await test.workflow.getCase({ context: workflowContext(), caseId: opened.case.caseId });
    expect(view.status).toBe("closed_without_approval");
    expect(evaluateJurisprudenceEditorialReadiness(view.case, 1, new Date(clock).toISOString()).editorialWorkflowReady).toBe(false);
  });
});

describe("persistencia SQLite temporal y logging", () => {
  it("cierra, reabre, recupera expediente e historial y limpia auxiliares", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "buholex-editorial-11h-"));
    const jurisprudencePath = path.join(directory, "jurisprudence.sqlite");
    const editorialPath = path.join(directory, "editorial.sqlite");
    let first: JurisprudenceEditorialWorkflow | undefined;
    let reopened: JurisprudenceEditorialWorkflow | undefined;
    try {
      const firstApi = createSqliteJurisprudenceInternalApi({ databasePath: jurisprudencePath, now: () => NOW });
      let sequence = 0;
      first = createJurisprudenceEditorialWorkflow({ api: firstApi, repository: new SqliteJurisprudenceEditorialCaseRepository(editorialPath), now: () => NOW, generateId: () => `archivo-editorial-ficticio-${++sequence}` });
      openWorkflows.push(first);
      const record = await createRecord(firstApi);
      const opened = await first.openCase({ context: workflowContext(), recordId: record.id, expectedRecordVersion: 1, purpose: "Persistencia editorial ficticia en archivo temporal.", idempotencyKey: "archivo-apertura-ficticia" });
      const assigned = await first.assignReview({ context: workflowContext("coordinador-ficticio"), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: 1, reviewKind: "editorial_review", assigneeReference: "revisor-editorial-ficticio", idempotencyKey: "archivo-asignacion-ficticia" });
      await first.recordDecision({ context: workflowContext("revisor-editorial-ficticio"), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: assigned.case.caseVersion, decision: "editorial_approved", idempotencyKey: "archivo-decision-ficticia" });
      await first.close();
      first = undefined;
      const reopenedApi = createSqliteJurisprudenceInternalApi({ databasePath: jurisprudencePath, now: () => NOW });
      reopened = createJurisprudenceEditorialWorkflow({ api: reopenedApi, repository: new SqliteJurisprudenceEditorialCaseRepository(editorialPath), now: () => NOW, generateId: () => `reabierto-editorial-ficticio-${++sequence}` });
      openWorkflows.push(reopened);
      await expect(reopened.getCase({ context: workflowContext(), caseId: opened.case.caseId })).resolves.toMatchObject({ status: "editorially_approved", case: { caseVersion: 3 } });
      await expect(reopened.getHistory({ context: workflowContext(), caseId: opened.case.caseId })).resolves.toHaveLength(3);
      await reopened.close();
      reopened = undefined;
    } finally {
      if (first !== undefined) await first.close();
      if (reopened !== undefined) await reopened.close();
      rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      expect(readdirSync(tmpdir()).some((entry) => entry === path.basename(directory))).toBe(false);
    }
  });

  it("logging usa lista mínima y no filtra observaciones, actores ni infraestructura", async () => {
    const logs: JurisprudenceEditorialLogEvent[] = [];
    const test = system("memory", { logs });
    const opened = await openCase(test);
    await test.workflow.recordObservation({ context: workflowContext(), caseId: opened.case.caseId, expectedRecordVersion: 1, expectedCaseVersion: 1, category: "metadata_incomplete", severity: "non_blocking", note: "Observación jurídica ficticia que no debe entrar al log.", idempotencyKey: "logging-observacion-ficticia" });
    for (const event of logs) {
      expect(Object.keys(event).sort()).toEqual(expect.arrayContaining(["operation", "requestId", "resultCode", "timestamp"]));
      expect(event).not.toHaveProperty("actorReference");
      expect(event).not.toHaveProperty("note");
      expect(event).not.toHaveProperty("headers");
      expect(event).not.toHaveProperty("stack");
    }
    expect(JSON.stringify(logs)).not.toMatch(/Observación jurídica|revisor|correo|DNI|sqlite|SELECT|stack|token|cookie|checksum/i);
  });
});

describe("publicación, seguridad estática y preservación", () => {
  it("readiness nunca autoriza ni ejecuta publicación y no existe publish o bypass", async () => {
    const test = system("memory");
    const approved = await approveBoth(test, await assignBoth(test, await openCase(test)));
    const readiness = evaluateJurisprudenceEditorialReadiness(approved.case, 1, NOW);
    expect(readiness).toMatchObject({ publicationAuthorizationReady: false, publicationExecutionReady: false, overrideSupported: false });
    expect("publish" in test.workflow).toBe(false);
    expect("forceReady" in test.workflow).toBe(false);
    expect("override" in test.workflow).toBe(false);
  });

  it("workflow no importa repositorios concretos, SQLite, SQL, React, app o componentes", () => {
    const source = readFileSync(path.join(process.cwd(), "lib", "jurisprudence-editorial-workflow.ts"), "utf8");
    expect(source).not.toMatch(/InMemoryJurisprudence|SqliteJurisprudence|node:sqlite|from ["']react|@\/app|@\/components|SELECT |INSERT |UPDATE /);
    expect(source).not.toMatch(/\bany\b/);
  });

  it("no crea rutas, UI, scraping, OCR, IA, RAG, embeddings ni Auth0", () => {
    const authorizedRouteFiles = [
      "app/api/owl/admission/route.ts",
    ];
    const appEntries = readdirSync(path.join(process.cwd(), "app"), { recursive: true }).filter((entry): entry is string => typeof entry === "string");
    const routeFiles = appEntries
      .filter((entry) => path.basename(entry) === "route.ts")
      .map((entry) => path.relative(process.cwd(), path.join(process.cwd(), "app", entry)).split(path.sep).join("/"));
    expect(routeFiles.sort()).toEqual(authorizedRouteFiles.sort());
    // editorial no crea rutas API de jurisprudencia
    expect(appEntries.some((entry) => entry.replaceAll("\\", "/").startsWith("api/") && /jurisprudence/.test(entry))).toBe(false);
    const files = ["types/jurisprudence-editorial-workflow.ts", "lib/schemas/jurisprudence-editorial-workflow.ts", "lib/jurisprudence-editorial-workflow.ts", "lib/jurisprudence-editorial-readiness.ts", "lib/jurisprudence-editorial-case-repository.ts", "lib/in-memory-jurisprudence-editorial-case-repository.ts", "lib/sqlite-jurisprudence-editorial-case-repository.ts"];
    const source = files.map((file) => readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
    expect(source).not.toMatch(/fetch\(|scrap|crawl|OCR|embedding|\bRAG\b|OpenAI|Anthropic|@auth0/i);
    expect(readFileSync(path.join(process.cwd(), "app", "jurisprudencia", "page.tsx"), "utf8")).not.toMatch(/EditorialWorkflow|editorial-workflow|fetch\(/);
  });

  it("mantiene package y lockfile sin Auth0 y React/React DOM en 19.1.1", () => {
    const manifest: unknown = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    expect(manifest).toMatchObject({ dependencies: { react: "19.1.1", "react-dom": "19.1.1" } });
    expect(`${JSON.stringify(manifest)}\n${readFileSync(path.join(process.cwd(), "pnpm-lock.yaml"), "utf8")}`).not.toContain("@auth0/nextjs-auth0");
  });

  it("preserva estructuralmente SRV-WEB-001 y BL-LEG-CON-001", () => {
    expect(publicServices.find((service) => service.id === "SRV-WEB-001")).toMatchObject({ allowsImmediatePayment: false, published: false });
    expect(rentalHousingContract).toMatchObject({
      availabilityStatus: "editorial_preview",
      price: null,
      currency: null,
      licenseStatus: "pending",
      publicationAuthorization: { authorized: false },
      intellectualProperty: { supportingDocument: { publiclyVisible: false, downloadable: false } },
      masterInternalFile: { publicDownloadAuthorized: false },
    });
    expect(rentalHousingContract.commercialFiles.every((file) => !file.publicDownloadAuthorized)).toBe(true);
    expect(rentalHousingContract.annexFiles.every((file) => !file.publicDownloadAuthorized)).toBe(true);
  });
});
