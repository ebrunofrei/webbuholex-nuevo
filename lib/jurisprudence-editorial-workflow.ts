import { createHash } from "node:crypto";
import { JurisprudenceApplicationError } from "@/lib/jurisprudence-application-error";
import {
  JurisprudenceEditorialWorkflowError,
} from "@/lib/jurisprudence-editorial-case-repository";
import {
  evaluateJurisprudenceEditorialReadiness,
  toJurisprudenceEditorialCaseView,
} from "@/lib/jurisprudence-editorial-readiness";
import {
  assignJurisprudenceEditorialReviewCommandSchema,
  closeJurisprudenceEditorialCaseCommandSchema,
  evaluateJurisprudenceEditorialPublicationCommandSchema,
  jurisprudenceEditorialCaseQuerySchema,
  openJurisprudenceEditorialCaseCommandSchema,
  recordJurisprudenceEditorialDecisionCommandSchema,
  recordJurisprudenceEditorialObservationCommandSchema,
  resolveJurisprudenceEditorialObservationCommandSchema,
  synchronizeJurisprudenceEditorialCaseCommandSchema,
} from "@/lib/schemas/jurisprudence-editorial-workflow";
import type { JurisprudenceApplicationContext } from "@/types/jurisprudence-application";
import type {
  AssignJurisprudenceEditorialReviewCommand,
  CloseJurisprudenceEditorialCaseCommand,
  EvaluateJurisprudenceEditorialPublicationCommand,
  JurisprudenceEditorialCase,
  JurisprudenceEditorialCaseQuery,
  JurisprudenceEditorialCaseView,
  JurisprudenceEditorialDecisionRecord,
  JurisprudenceEditorialEvent,
  JurisprudenceEditorialEventType,
  JurisprudenceEditorialIdempotencyEntry,
  JurisprudenceEditorialLogger,
  JurisprudenceEditorialPublicationEvaluationResult,
  JurisprudenceEditorialWorkflow,
  JurisprudenceEditorialWorkflowContext,
  JurisprudenceEditorialWorkflowDependencies,
  OpenJurisprudenceEditorialCaseCommand,
  RecordJurisprudenceEditorialDecisionCommand,
  RecordJurisprudenceEditorialObservationCommand,
  ResolveJurisprudenceEditorialObservationCommand,
  SynchronizeJurisprudenceEditorialCaseCommand,
} from "@/types/jurisprudence-editorial-workflow";

const DEFAULT_CASE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const nullLogger: JurisprudenceEditorialLogger = { log: () => undefined };

export const JURISPRUDENCE_EDITORIAL_OPERATION_PERMISSIONS = Object.freeze({
  open_case: "jurisprudence.internal.update_editorial",
  assign_editorial_review: "jurisprudence.internal.update_editorial",
  assign_legal_verification: "jurisprudence.internal.update_source",
  record_editorial_decision: "jurisprudence.internal.update_editorial",
  record_legal_decision: "jurisprudence.internal.update_source",
  evaluate_publication: "jurisprudence.internal.evaluate_publication",
  read_history: "jurisprudence.internal.read_history",
});

interface CommonMutationCommand {
  readonly context: JurisprudenceEditorialWorkflowContext;
  readonly caseId: string;
  readonly expectedRecordVersion: number;
  readonly expectedCaseVersion: number;
  readonly idempotencyKey: string;
}

interface MutationChange {
  readonly next: JurisprudenceEditorialCase;
  readonly type: JurisprudenceEditorialEventType;
  readonly payload: JurisprudenceEditorialEvent["payload"];
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right, "en")).map(([key, entry]) => [key, stableValue(entry)]));
  }
  return value;
}

function commandFingerprint<T extends { readonly context: JurisprudenceEditorialWorkflowContext }>(operation: string, command: T): string {
  const { context, ...payload } = command;
  return createHash("sha256").update(JSON.stringify(stableValue({ operation, actorReference: context.actorReference, payload }))).digest("hex");
}

function applicationContext(context: JurisprudenceEditorialWorkflowContext, requestedAt: string): JurisprudenceApplicationContext {
  return {
    requestId: context.requestId,
    actor: { kind: "editorial_operator", id: context.actorReference },
    operationSource: "editorial_workflow",
    requestedAt,
  };
}

function cloneResult<T>(value: T): T {
  return structuredClone(value);
}

function isEditorialDecision(decision: RecordJurisprudenceEditorialDecisionCommand["decision"]): boolean {
  return decision === "request_changes" || decision === "editorial_approved";
}

function isLegalDecision(decision: RecordJurisprudenceEditorialDecisionCommand["decision"]): boolean {
  return decision === "legal_verification_rejected" || decision === "legal_verification_approved";
}

export class DefaultJurisprudenceEditorialWorkflow implements JurisprudenceEditorialWorkflow {
  readonly #api: JurisprudenceEditorialWorkflowDependencies["api"];
  readonly #repository: JurisprudenceEditorialWorkflowDependencies["repository"];
  readonly #now: () => string;
  readonly #generateId: () => string;
  readonly #logger: JurisprudenceEditorialLogger;
  readonly #caseTtlMs: number;
  #closed = false;

  constructor(dependencies: JurisprudenceEditorialWorkflowDependencies) {
    this.#api = dependencies.api;
    this.#repository = dependencies.repository;
    this.#now = dependencies.now;
    this.#generateId = dependencies.generateId;
    this.#logger = dependencies.logger ?? nullLogger;
    this.#caseTtlMs = dependencies.caseTtlMs ?? DEFAULT_CASE_TTL_MS;
    if (!Number.isInteger(this.#caseTtlMs) || this.#caseTtlMs < 60_000) {
      throw new JurisprudenceEditorialWorkflowError("VALIDATION_ERROR", "El TTL editorial no es válido.");
    }
  }

  private timestamp(): { iso: string; milliseconds: number } {
    const milliseconds = Date.parse(this.#now());
    if (!Number.isFinite(milliseconds)) throw new JurisprudenceEditorialWorkflowError("INTERNAL_ERROR", "El reloj editorial no es válido.");
    return { iso: new Date(milliseconds).toISOString(), milliseconds };
  }

  private assertOpen(): void {
    if (this.#closed) throw new JurisprudenceEditorialWorkflowError("RESOURCE_CLOSED", "El workflow editorial está cerrado.");
  }

  private emit(
    context: JurisprudenceEditorialWorkflowContext,
    operation: JurisprudenceEditorialEventType | "operation_rejected" | "workflow_closed",
    resultCode: string,
    timestamp: string,
    editorialCase?: JurisprudenceEditorialCase,
  ): void {
    this.#logger.log(structuredClone({
      requestId: context.requestId,
      operation,
      resultCode,
      ...(editorialCase === undefined ? {} : {
        caseReference: editorialCase.caseId,
        recordVersion: editorialCase.recordVersion,
        caseVersion: editorialCase.caseVersion,
      }),
      timestamp,
    }));
  }

  private reject(context: JurisprudenceEditorialWorkflowContext | undefined, error: unknown): never {
    const safeError = error instanceof JurisprudenceEditorialWorkflowError
      ? error
      : error instanceof JurisprudenceApplicationError && error.code === "NOT_FOUND"
        ? new JurisprudenceEditorialWorkflowError("NOT_FOUND", "No existe el registro jurisprudencial solicitado.")
        : error instanceof JurisprudenceApplicationError && error.code === "RESOURCE_CLOSED"
          ? new JurisprudenceEditorialWorkflowError("RESOURCE_CLOSED", "La API interna está cerrada.")
          : new JurisprudenceEditorialWorkflowError("REPOSITORY_UNAVAILABLE", "No fue posible completar la operación editorial.");
    if (context !== undefined) {
      const now = this.timestamp().iso;
      this.emit(context, "operation_rejected", safeError.code, now);
    }
    throw safeError;
  }

  private async replay(
    idempotencyKey: string,
    fingerprint: string,
  ): Promise<JurisprudenceEditorialCaseView | JurisprudenceEditorialPublicationEvaluationResult | null> {
    const existing = await this.#repository.findIdempotency(idempotencyKey);
    if (existing === null) return null;
    if (existing.commandFingerprint !== fingerprint) {
      throw new JurisprudenceEditorialWorkflowError("IDEMPOTENCY_CONFLICT", "La clave de idempotencia ya fue usada con otro comando.");
    }
    return cloneResult(existing.result);
  }

  private event(
    editorialCase: JurisprudenceEditorialCase,
    type: JurisprudenceEditorialEventType,
    context: JurisprudenceEditorialWorkflowContext,
    payload: JurisprudenceEditorialEvent["payload"],
    occurredAt: string,
  ): JurisprudenceEditorialEvent {
    return {
      eventId: this.#generateId(),
      caseId: editorialCase.caseId,
      sequence: editorialCase.caseVersion,
      type,
      occurredAt,
      actorReference: context.actorReference,
      recordVersion: editorialCase.recordVersion,
      caseVersion: editorialCase.caseVersion,
      payload,
    };
  }

  private async mutate(
    command: CommonMutationCommand,
    fingerprint: string,
    change: (current: JurisprudenceEditorialCase, occurredAt: string) => MutationChange,
  ): Promise<JurisprudenceEditorialCaseView> {
    this.assertOpen();
    const replay = await this.replay(command.idempotencyKey, fingerprint);
    if (replay !== null) return cloneResult(replay);
    const current = await this.#repository.findById(command.caseId);
    if (current === null) throw new JurisprudenceEditorialWorkflowError("NOT_FOUND", "No existe el expediente editorial.");
    if (current.caseVersion !== command.expectedCaseVersion) throw new JurisprudenceEditorialWorkflowError("VERSION_CONFLICT", "La versión esperada del expediente no coincide.");
    const time = this.timestamp();
    const record = (await this.#api.getInternalRecord({ context: applicationContext(command.context, time.iso), id: current.recordId })).record;
    if (current.supersededAt !== null) throw new JurisprudenceEditorialWorkflowError("CASE_SUPERSEDED", "El expediente fue superado por otra versión.");
    if (current.closedAt !== null) throw new JurisprudenceEditorialWorkflowError("CASE_CLOSED", "El expediente está cerrado.");
    if (record.recordVersion !== current.recordVersion) {
      const superseded: JurisprudenceEditorialCase = {
        ...current,
        caseVersion: current.caseVersion + 1,
        supersededAt: time.iso,
        supersededByRecordVersion: record.recordVersion,
        updatedAt: time.iso,
      };
      const result = toJurisprudenceEditorialCaseView(superseded, record.recordVersion, time.iso);
      const event = this.event(superseded, "case_superseded", command.context, { previousRecordVersion: current.recordVersion, currentRecordVersion: record.recordVersion }, time.iso);
      await this.#repository.update({
        editorialCase: superseded,
        event,
        expectedCaseVersion: current.caseVersion,
        idempotency: { idempotencyKey: command.idempotencyKey, commandFingerprint: fingerprint, result },
      });
      this.emit(command.context, "case_superseded", "CASE_SUPERSEDED", time.iso, superseded);
      return result;
    }
    if (command.expectedRecordVersion !== record.recordVersion) throw new JurisprudenceEditorialWorkflowError("VERSION_CONFLICT", "La versión esperada del registro no coincide.");
    if (Date.parse(current.expiresAt) <= time.milliseconds) throw new JurisprudenceEditorialWorkflowError("CASE_EXPIRED", "El expediente editorial expiró.");
    const mutation = change(current, time.iso);
    const next = { ...mutation.next, caseVersion: current.caseVersion + 1, updatedAt: time.iso };
    const result = toJurisprudenceEditorialCaseView(next, record.recordVersion, time.iso);
    const event = this.event(next, mutation.type, command.context, mutation.payload, time.iso);
    await this.#repository.update({
      editorialCase: next,
      event,
      expectedCaseVersion: current.caseVersion,
      idempotency: { idempotencyKey: command.idempotencyKey, commandFingerprint: fingerprint, result },
    });
    this.emit(command.context, mutation.type, "OK", time.iso, next);
    return result;
  }

  async openCase(input: unknown): Promise<JurisprudenceEditorialCaseView> {
    const parsed = openJurisprudenceEditorialCaseCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudenceEditorialWorkflowError("VALIDATION_ERROR", "El comando de apertura no cumple el contrato estricto.");
    const command: OpenJurisprudenceEditorialCaseCommand = parsed.data;
    try {
      this.assertOpen();
      const fingerprint = commandFingerprint("open_case", command);
      const replay = await this.replay(command.idempotencyKey, fingerprint);
      if (replay !== null) return cloneResult(replay);
      const time = this.timestamp();
      const record = (await this.#api.getInternalRecord({ context: applicationContext(command.context, time.iso), id: command.recordId })).record;
      if (record.recordVersion !== command.expectedRecordVersion) throw new JurisprudenceEditorialWorkflowError("VERSION_CONFLICT", "La versión esperada del registro no coincide.");
      if (await this.#repository.findActiveByRecordVersion(record.id, record.recordVersion) !== null) {
        throw new JurisprudenceEditorialWorkflowError("DUPLICATE_ACTIVE_CASE", "Ya existe un expediente activo para el registro y versión.");
      }
      const editorialCase: JurisprudenceEditorialCase = {
        caseId: this.#generateId(),
        recordId: record.id,
        recordVersion: record.recordVersion,
        caseVersion: 1,
        purpose: command.purpose,
        openedAt: time.iso,
        openedByReference: command.context.actorReference,
        expiresAt: new Date(time.milliseconds + this.#caseTtlMs).toISOString(),
        editorialAssignment: null,
        legalAssignment: null,
        observations: [],
        editorialDecision: null,
        legalDecision: null,
        publicationEvaluation: null,
        supersededAt: null,
        supersededByRecordVersion: null,
        closedAt: null,
        closedByReference: null,
        updatedAt: time.iso,
      };
      const result = toJurisprudenceEditorialCaseView(editorialCase, record.recordVersion, time.iso);
      const event = this.event(editorialCase, "editorial_case_opened", command.context, { purpose: command.purpose }, time.iso);
      const idempotency: JurisprudenceEditorialIdempotencyEntry = { idempotencyKey: command.idempotencyKey, commandFingerprint: fingerprint, result };
      await this.#repository.create({ editorialCase, event, idempotency });
      this.emit(command.context, "editorial_case_opened", "OK", time.iso, editorialCase);
      return result;
    } catch (error) {
      return this.reject(command.context, error);
    }
  }

  async assignReview(input: unknown): Promise<JurisprudenceEditorialCaseView> {
    const parsed = assignJurisprudenceEditorialReviewCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudenceEditorialWorkflowError("VALIDATION_ERROR", "El comando de asignación no cumple el contrato estricto.");
    const command: AssignJurisprudenceEditorialReviewCommand = parsed.data;
    try {
      return await this.mutate(command, commandFingerprint("assign_review", command), (current, occurredAt) => {
        const other = command.reviewKind === "editorial_review" ? current.legalAssignment : current.editorialAssignment;
        if (other?.assigneeReference === command.assigneeReference) {
          throw new JurisprudenceEditorialWorkflowError("SEPARATION_OF_DUTIES_REQUIRED", "Las revisiones editorial y jurídica requieren referencias distintas.");
        }
        const assignment = {
          reviewKind: command.reviewKind,
          assigneeReference: command.assigneeReference,
          assignedByReference: command.context.actorReference,
          assignedAt: occurredAt,
        };
        return {
          next: command.reviewKind === "editorial_review"
            ? { ...current, editorialAssignment: assignment }
            : { ...current, legalAssignment: assignment },
          type: "review_assigned",
          payload: { reviewKind: command.reviewKind, assigneeReference: command.assigneeReference },
        };
      });
    } catch (error) {
      return this.reject(command.context, error);
    }
  }

  async recordObservation(input: unknown): Promise<JurisprudenceEditorialCaseView> {
    const parsed = recordJurisprudenceEditorialObservationCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudenceEditorialWorkflowError("VALIDATION_ERROR", "La observación no cumple el contrato estricto.");
    const command: RecordJurisprudenceEditorialObservationCommand = parsed.data;
    try {
      return await this.mutate(command, commandFingerprint("record_observation", command), (current, occurredAt) => {
        const observationId = this.#generateId();
        return {
          next: {
            ...current,
            observations: [...current.observations, {
              observationId,
              category: command.category,
              severity: command.severity,
              note: command.note,
              recordedByReference: command.context.actorReference,
              recordedAt: occurredAt,
              resolvedAt: null,
              resolvedByReference: null,
            }],
          },
          type: "observation_recorded",
          payload: { observationId, category: command.category, severity: command.severity },
        };
      });
    } catch (error) {
      return this.reject(command.context, error);
    }
  }

  async resolveObservation(input: unknown): Promise<JurisprudenceEditorialCaseView> {
    const parsed = resolveJurisprudenceEditorialObservationCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudenceEditorialWorkflowError("VALIDATION_ERROR", "La resolución de observación no cumple el contrato estricto.");
    const command: ResolveJurisprudenceEditorialObservationCommand = parsed.data;
    try {
      return await this.mutate(command, commandFingerprint("resolve_observation", command), (current, occurredAt) => {
        const observation = current.observations.find((entry) => entry.observationId === command.observationId);
        if (observation === undefined) throw new JurisprudenceEditorialWorkflowError("OBSERVATION_NOT_FOUND", "No existe la observación indicada.");
        if (observation.resolvedAt !== null) throw new JurisprudenceEditorialWorkflowError("VERSION_CONFLICT", "La observación ya fue resuelta.");
        return {
          next: {
            ...current,
            observations: current.observations.map((entry) => entry.observationId === command.observationId
              ? { ...entry, resolvedAt: occurredAt, resolvedByReference: command.context.actorReference }
              : entry),
          },
          type: "observation_resolved",
          payload: { observationId: command.observationId },
        };
      });
    } catch (error) {
      return this.reject(command.context, error);
    }
  }

  async recordDecision(input: unknown): Promise<JurisprudenceEditorialCaseView> {
    const parsed = recordJurisprudenceEditorialDecisionCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudenceEditorialWorkflowError("VALIDATION_ERROR", "La decisión no cumple el contrato estricto.");
    const command: RecordJurisprudenceEditorialDecisionCommand = parsed.data;
    try {
      return await this.mutate(command, commandFingerprint("record_decision", command), (current, occurredAt) => {
        if (command.decision === "close_without_approval") {
          return {
            next: { ...current, closedAt: occurredAt, closedByReference: command.context.actorReference },
            type: "case_closed",
            payload: { decision: command.decision },
          };
        }
        const decision: JurisprudenceEditorialDecisionRecord = {
          decision: command.decision,
          actorReference: command.context.actorReference,
          decidedAt: occurredAt,
          recordVersion: current.recordVersion,
        };
        if (isEditorialDecision(command.decision)) {
          if (current.editorialAssignment?.assigneeReference !== command.context.actorReference) {
            throw new JurisprudenceEditorialWorkflowError("ASSIGNMENT_REQUIRED", "La decisión editorial requiere la asignación correspondiente.");
          }
          return { next: { ...current, editorialDecision: decision, publicationEvaluation: null }, type: "editorial_decision_recorded", payload: { decision: command.decision } };
        }
        if (isLegalDecision(command.decision)) {
          if (current.legalAssignment?.assigneeReference !== command.context.actorReference) {
            throw new JurisprudenceEditorialWorkflowError("ASSIGNMENT_REQUIRED", "La decisión jurídica requiere la asignación correspondiente.");
          }
          return { next: { ...current, legalDecision: decision, publicationEvaluation: null }, type: "legal_decision_recorded", payload: { decision: command.decision } };
        }
        throw new JurisprudenceEditorialWorkflowError("VALIDATION_ERROR", "La decisión editorial no está soportada.");
      });
    } catch (error) {
      return this.reject(command.context, error);
    }
  }

  async evaluatePublication(input: unknown): Promise<JurisprudenceEditorialPublicationEvaluationResult> {
    const parsed = evaluateJurisprudenceEditorialPublicationCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudenceEditorialWorkflowError("VALIDATION_ERROR", "La evaluación no cumple el contrato estricto.");
    const command: EvaluateJurisprudenceEditorialPublicationCommand = parsed.data;
    try {
      this.assertOpen();
      const fingerprint = commandFingerprint("evaluate_publication", command);
      const replay = await this.replay(command.idempotencyKey, fingerprint);
      if (replay !== null && "eligibleForPublicationEvaluation" in replay) return cloneResult(replay);
      if (replay !== null) throw new JurisprudenceEditorialWorkflowError("IDEMPOTENCY_CONFLICT", "La clave no corresponde a una evaluación.");
      const current = await this.#repository.findById(command.caseId);
      if (current === null) throw new JurisprudenceEditorialWorkflowError("NOT_FOUND", "No existe el expediente editorial.");
      if (current.caseVersion !== command.expectedCaseVersion) throw new JurisprudenceEditorialWorkflowError("VERSION_CONFLICT", "La versión esperada del expediente no coincide.");
      const time = this.timestamp();
      if (current.supersededAt !== null) throw new JurisprudenceEditorialWorkflowError("CASE_SUPERSEDED", "El expediente fue superado por otra versión.");
      if (current.closedAt !== null) throw new JurisprudenceEditorialWorkflowError("CASE_CLOSED", "El expediente está cerrado.");
      if (Date.parse(current.expiresAt) <= time.milliseconds) throw new JurisprudenceEditorialWorkflowError("CASE_EXPIRED", "El expediente editorial expiró.");
      const evaluation = await this.#api.evaluatePublication({ context: applicationContext(command.context, time.iso), id: current.recordId });
      if (evaluation.recordVersion !== current.recordVersion) {
        const superseded: JurisprudenceEditorialCase = {
          ...current,
          caseVersion: current.caseVersion + 1,
          supersededAt: time.iso,
          supersededByRecordVersion: evaluation.recordVersion,
          updatedAt: time.iso,
        };
        const view = toJurisprudenceEditorialCaseView(superseded, evaluation.recordVersion, time.iso);
        const result: JurisprudenceEditorialPublicationEvaluationResult = {
          ...view,
          eligibleForPublicationEvaluation: false,
          blockers: ["record_version_changed"],
        };
        const event = this.event(superseded, "case_superseded", command.context, {
          previousRecordVersion: current.recordVersion,
          currentRecordVersion: evaluation.recordVersion,
        }, time.iso);
        await this.#repository.update({
          editorialCase: superseded,
          event,
          expectedCaseVersion: current.caseVersion,
          idempotency: { idempotencyKey: command.idempotencyKey, commandFingerprint: fingerprint, result },
        });
        this.emit(command.context, "case_superseded", "CASE_SUPERSEDED", time.iso, superseded);
        return result;
      }
      if (command.expectedRecordVersion !== evaluation.recordVersion) throw new JurisprudenceEditorialWorkflowError("VERSION_CONFLICT", "La versión esperada del registro no coincide.");
      const next: JurisprudenceEditorialCase = {
        ...current,
        caseVersion: current.caseVersion + 1,
        publicationEvaluation: {
          evaluatedAt: time.iso,
          evaluatedByReference: command.context.actorReference,
          recordVersion: evaluation.recordVersion,
          domainPublicable: evaluation.publicable,
          blockers: evaluation.blockers.map((entry) => entry.code),
          publicationAuthorizationGranted: false,
          publicationExecuted: false,
        },
        updatedAt: time.iso,
      };
      const view = toJurisprudenceEditorialCaseView(next, evaluation.recordVersion, time.iso);
      const readiness = evaluateJurisprudenceEditorialReadiness(next, evaluation.recordVersion, time.iso);
      const result: JurisprudenceEditorialPublicationEvaluationResult = {
        ...view,
        eligibleForPublicationEvaluation: readiness.publicationEvaluationReady,
        blockers: evaluation.blockers.map((entry) => entry.code),
      };
      const event = this.event(next, "publication_evaluation_recorded", command.context, {
        domainPublicable: evaluation.publicable,
        blockerCodes: evaluation.blockers.map((entry) => entry.code),
        publicationAuthorizationGranted: false,
        publicationExecuted: false,
      }, time.iso);
      await this.#repository.update({
        editorialCase: next,
        event,
        expectedCaseVersion: current.caseVersion,
        idempotency: { idempotencyKey: command.idempotencyKey, commandFingerprint: fingerprint, result },
      });
      this.emit(command.context, "publication_evaluation_recorded", "OK", time.iso, next);
      return result;
    } catch (error) {
      return this.reject(command.context, error);
    }
  }

  async synchronizeCase(input: unknown): Promise<JurisprudenceEditorialCaseView> {
    const parsed = synchronizeJurisprudenceEditorialCaseCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudenceEditorialWorkflowError("VALIDATION_ERROR", "La sincronización no cumple el contrato estricto.");
    const command: SynchronizeJurisprudenceEditorialCaseCommand = parsed.data;
    try {
      this.assertOpen();
      const fingerprint = commandFingerprint("synchronize_case", command);
      const replay = await this.replay(command.idempotencyKey, fingerprint);
      if (replay !== null) return cloneResult(replay);
      const current = await this.#repository.findById(command.caseId);
      if (current === null) throw new JurisprudenceEditorialWorkflowError("NOT_FOUND", "No existe el expediente editorial.");
      if (current.caseVersion !== command.expectedCaseVersion) throw new JurisprudenceEditorialWorkflowError("VERSION_CONFLICT", "La versión esperada del expediente no coincide.");
      const time = this.timestamp();
      const record = (await this.#api.getInternalRecord({ context: applicationContext(command.context, time.iso), id: current.recordId })).record;
      if (record.recordVersion === current.recordVersion) throw new JurisprudenceEditorialWorkflowError("VERSION_CONFLICT", "El registro conserva la versión del expediente.");
      const superseded: JurisprudenceEditorialCase = {
        ...current,
        caseVersion: current.caseVersion + 1,
        supersededAt: time.iso,
        supersededByRecordVersion: record.recordVersion,
        updatedAt: time.iso,
      };
      const result = toJurisprudenceEditorialCaseView(superseded, record.recordVersion, time.iso);
      const event = this.event(superseded, "case_superseded", command.context, { previousRecordVersion: current.recordVersion, currentRecordVersion: record.recordVersion }, time.iso);
      await this.#repository.update({
        editorialCase: superseded,
        event,
        expectedCaseVersion: current.caseVersion,
        idempotency: { idempotencyKey: command.idempotencyKey, commandFingerprint: fingerprint, result },
      });
      this.emit(command.context, "case_superseded", "OK", time.iso, superseded);
      return result;
    } catch (error) {
      return this.reject(command.context, error);
    }
  }

  async closeCase(input: unknown): Promise<JurisprudenceEditorialCaseView> {
    const parsed = closeJurisprudenceEditorialCaseCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudenceEditorialWorkflowError("VALIDATION_ERROR", "El cierre no cumple el contrato estricto.");
    const command: CloseJurisprudenceEditorialCaseCommand = parsed.data;
    try {
      return await this.mutate(command, commandFingerprint("close_case", command), (current, occurredAt) => ({
        next: { ...current, closedAt: occurredAt, closedByReference: command.context.actorReference },
        type: "case_closed",
        payload: { reason: command.reason },
      }));
    } catch (error) {
      return this.reject(command.context, error);
    }
  }

  async getCase(input: unknown): Promise<JurisprudenceEditorialCaseView> {
    const parsed = jurisprudenceEditorialCaseQuerySchema.safeParse(input);
    if (!parsed.success) throw new JurisprudenceEditorialWorkflowError("VALIDATION_ERROR", "La consulta no cumple el contrato estricto.");
    const query: JurisprudenceEditorialCaseQuery = parsed.data;
    try {
      this.assertOpen();
      const time = this.timestamp();
      const editorialCase = await this.#repository.findById(query.caseId);
      if (editorialCase === null) throw new JurisprudenceEditorialWorkflowError("NOT_FOUND", "No existe el expediente editorial.");
      const record = (await this.#api.getInternalRecord({ context: applicationContext(query.context, time.iso), id: editorialCase.recordId })).record;
      return toJurisprudenceEditorialCaseView(editorialCase, record.recordVersion, time.iso);
    } catch (error) {
      return this.reject(query.context, error);
    }
  }

  async getHistory(input: unknown): Promise<readonly JurisprudenceEditorialEvent[]> {
    const parsed = jurisprudenceEditorialCaseQuerySchema.safeParse(input);
    if (!parsed.success) throw new JurisprudenceEditorialWorkflowError("VALIDATION_ERROR", "La consulta de historial no cumple el contrato estricto.");
    const query: JurisprudenceEditorialCaseQuery = parsed.data;
    try {
      this.assertOpen();
      return (await this.#repository.getHistory(query.caseId)).map((event) => structuredClone(event));
    } catch (error) {
      return this.reject(query.context, error);
    }
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    const time = this.timestamp().iso;
    await this.#repository.close();
    await this.#api.close({
      requestId: "editorial-workflow-close",
      actor: { kind: "system", id: "editorial-workflow" },
      operationSource: "editorial_workflow",
      requestedAt: time,
    });
    this.#closed = true;
  }
}

export function createJurisprudenceEditorialWorkflow(
  dependencies: JurisprudenceEditorialWorkflowDependencies,
): JurisprudenceEditorialWorkflow {
  return new DefaultJurisprudenceEditorialWorkflow(dependencies);
}
