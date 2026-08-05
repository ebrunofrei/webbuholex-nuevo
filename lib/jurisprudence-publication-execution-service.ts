import { createHash } from "node:crypto";
import { buildJurisprudencePublicProjection } from "@/lib/jurisprudence-public-projection-builder";
import {
  clonePublicationExecutionEvent,
  clonePublicationExecutionView,
  isPublicationExecutionCurrent,
  JurisprudencePublicationExecutionError,
} from "@/lib/jurisprudence-publication-execution-repository";
import {
  evaluateJurisprudencePublicationExecutionCommandSchema,
  executeJurisprudencePublicationCommandSchema,
  jurisprudencePublicationExecutionHistoryQuerySchema,
  jurisprudencePublicationExecutionQuerySchema,
  supersedeJurisprudencePublicationExecutionCommandSchema,
  withdrawJurisprudencePublicationCommandSchema,
} from "@/lib/schemas/jurisprudence-publication-execution";
import type { JurisprudenceApplicationContext, JurisprudenceInternalRecordDto } from "@/types/jurisprudence-application";
import type {
  EvaluateJurisprudencePublicationExecutionCommand,
  ExecuteJurisprudencePublicationCommand,
  JurisprudencePublicProjection,
  JurisprudencePublicationExecution,
  JurisprudencePublicationExecutionBlocker,
  JurisprudencePublicationExecutionContext,
  JurisprudencePublicationExecutionDependencies,
  JurisprudencePublicationExecutionEvaluation,
  JurisprudencePublicationExecutionEvent,
  JurisprudencePublicationExecutionEventType,
  JurisprudencePublicationExecutionService,
  JurisprudencePublicationExecutionView,
  SupersedeJurisprudencePublicationExecutionCommand,
  WithdrawJurisprudencePublicationCommand,
} from "@/types/jurisprudence-publication-execution";

const nullLogger = { log: () => undefined };

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right, "en")).map(([key, entry]) => [key, stableValue(entry)]));
  return value;
}
function commandFingerprint(operation: string, command: { readonly context: JurisprudencePublicationExecutionContext }): string {
  const { context, ...payload } = command;
  return createHash("sha256").update(JSON.stringify(stableValue({ operation, actorReference: context.actorReference, payload }))).digest("hex");
}
function applicationContext(context: JurisprudencePublicationExecutionContext, requestedAt: string): JurisprudenceApplicationContext {
  return { requestId: context.requestId, actor: { kind: "editorial_operator", id: context.actorReference }, operationSource: "editorial_workflow", requestedAt };
}
function unique<T>(values: readonly T[]): readonly T[] { return [...new Set(values)]; }

interface ExecutionFoundation {
  readonly record: JurisprudenceInternalRecordDto | null;
  readonly blockers: readonly JurisprudencePublicationExecutionBlocker[];
}

export class DefaultJurisprudencePublicationExecutionService implements JurisprudencePublicationExecutionService {
  readonly #dependencies: JurisprudencePublicationExecutionDependencies;
  readonly #logger: NonNullable<JurisprudencePublicationExecutionDependencies["logger"]>;
  #closed = false;
  constructor(dependencies: JurisprudencePublicationExecutionDependencies) {
    this.#dependencies = dependencies;
    this.#logger = dependencies.logger ?? nullLogger;
  }
  private timestamp(): string {
    const value = new Date(this.#dependencies.now());
    if (Number.isNaN(value.valueOf())) throw new JurisprudencePublicationExecutionError("INTERNAL_ERROR", "El reloj produjo una fecha inválida.");
    return value.toISOString();
  }
  private assertOpen(): void { if (this.#closed) throw new JurisprudencePublicationExecutionError("RESOURCE_CLOSED", "El servicio de ejecución está cerrado."); }
  private emit(context: JurisprudencePublicationExecutionContext, operation: JurisprudencePublicationExecutionEventType | "evaluate_execution" | "get_execution" | "get_execution_history", resultCode: string, timestamp: string, execution?: JurisprudencePublicationExecution): void {
    this.#logger.log({
      requestId: context.requestId,
      operation: operation === "publication_executed" ? "execute_publication" : operation === "publication_withdrawn" ? "withdraw_publication" : operation === "publication_execution_superseded" ? "supersede_execution" : operation,
      resultCode,
      ...(execution === undefined ? {} : { executionReference: execution.executionId, recordReference: execution.recordId, recordVersion: execution.recordVersion }),
      timestamp,
    });
  }
  private reject(context: JurisprudencePublicationExecutionContext | undefined, operation: "evaluate_execution" | "execute_publication" | "withdraw_publication" | "supersede_execution" | "get_execution" | "get_execution_history", error: unknown): never {
    const mapped = error instanceof JurisprudencePublicationExecutionError
      ? error
      : new JurisprudencePublicationExecutionError("INTERNAL_ERROR", "No fue posible completar la operación de ejecución.");
    this.#logger.log({ requestId: context?.requestId ?? "publication-execution-validation", operation, resultCode: mapped.code, timestamp: this.#dependencies.now() });
    throw mapped;
  }
  private async replay(idempotencyKey: string, fingerprint: string): Promise<JurisprudencePublicationExecutionView | null> {
    const stored = await this.#dependencies.executionRepository.findIdempotencyResult(idempotencyKey);
    if (stored === null) return null;
    if (stored.commandFingerprint !== fingerprint) throw new JurisprudencePublicationExecutionError("IDEMPOTENCY_CONFLICT", "La clave de idempotencia fue utilizada con otro comando.");
    return clonePublicationExecutionView(stored.result);
  }
  private async view(execution: JurisprudencePublicationExecution): Promise<JurisprudencePublicationExecutionView> {
    const projection = await this.#dependencies.projectionRepository.findById(execution.projectionId);
    if (projection === null) throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "La ejecución no tiene una proyección vinculada.");
    const current = isPublicationExecutionCurrent(execution);
    return { execution: structuredClone(execution), projection: structuredClone(projection), current, publicationExecuted: current, publicProjectionExposed: false, deployed: false };
  }
  private event(execution: JurisprudencePublicationExecution, type: JurisprudencePublicationExecutionEventType, occurredAt: string, payload: JurisprudencePublicationExecutionEvent["payload"]): JurisprudencePublicationExecutionEvent {
    return { eventId: this.#dependencies.generateId(), executionId: execution.executionId, recordId: execution.recordId, recordVersion: execution.recordVersion, executionVersion: execution.version, sequence: execution.version, type, occurredAt, payload };
  }
  private async foundation(command: EvaluateJurisprudencePublicationExecutionCommand): Promise<ExecutionFoundation> {
    this.assertOpen();
    const blockers: JurisprudencePublicationExecutionBlocker[] = [];
    const time = this.timestamp();
    let record: JurisprudenceInternalRecordDto | null = null;
    try { record = (await this.#dependencies.api.getInternalRecord({ context: applicationContext(command.context, time), id: command.recordId })).record; }
    catch { blockers.push("record_not_found"); }
    if (record !== null && record.recordVersion !== command.expectedRecordVersion) blockers.push("record_version_mismatch");

    try {
      const editorial = await this.#dependencies.editorialWorkflow.getCase({ context: command.context, caseId: command.editorialCaseId });
      if (editorial.case.recordId !== command.recordId || editorial.case.recordVersion !== command.expectedRecordVersion) blockers.push("record_version_mismatch");
      if (editorial.status !== "verified_for_publication_evaluation") blockers.push("editorial_case_not_verified");
    } catch { blockers.push("editorial_case_missing"); }

    try {
      const dossier = await this.#dependencies.publicationGovernance.getDossier({ context: command.context, dossierId: command.publicationDossierId });
      if (dossier.dossier.recordId !== command.recordId || dossier.dossier.recordVersion !== command.expectedRecordVersion) blockers.push("record_version_mismatch");
      if (dossier.dossier.status !== "complete_for_authorization_evaluation" || dossier.evaluation.decision !== "ready_for_authorization_evaluation") blockers.push("publication_dossier_incomplete");
      if (dossier.dossier.provenanceAssessment?.status !== "verified") blockers.push("source_governance_incomplete");
      if (dossier.dossier.integrityAssessment === null || dossier.dossier.integrityAssessment.status === "not_checked" || dossier.dossier.integrityAssessment.status === "integrity_conflict") blockers.push("integrity_not_cleared");
      if (dossier.dossier.rightsAssessment?.status !== "public_display_permitted") blockers.push("rights_not_cleared");
      if (dossier.dossier.privacyAssessment?.status !== "approved_for_public_projection") blockers.push("privacy_not_cleared");
    } catch { blockers.push("publication_dossier_incomplete"); }

    try {
      const authorization = await this.#dependencies.publicationAuthorization.getAuthorizationCase({ context: command.context, authorizationCaseId: command.authorizationCaseId });
      const authorizationCase = authorization.authorizationCase;
      if (authorizationCase.recordId !== command.recordId) blockers.push("authorization_record_mismatch");
      if (authorizationCase.recordVersion !== command.expectedRecordVersion) blockers.push("authorization_version_mismatch");
      if (authorizationCase.publicationDossierId !== command.publicationDossierId) blockers.push("authorization_record_mismatch");
      if (authorizationCase.status === "revoked") blockers.push("authorization_revoked");
      else if (authorizationCase.status === "superseded") blockers.push("authorization_superseded");
      else if (authorizationCase.expiresAt !== undefined && Date.parse(authorizationCase.expiresAt) <= Date.parse(time)) blockers.push("authorization_expired");
      else if (!authorization.authorizationCurrent || !authorization.publicationAuthorizationGranted) blockers.push("authorization_not_current");
    } catch { blockers.push("authorization_missing"); }

    if (record !== null && (record.editorialContent.editorialTitle.trim() === "" || record.source.name.trim() === "")) blockers.push("public_projection_unavailable");
    return { record, blockers: unique(blockers) };
  }

  async evaluateExecution(input: unknown): Promise<JurisprudencePublicationExecutionEvaluation> {
    const parsed = evaluateJurisprudencePublicationExecutionCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudencePublicationExecutionError("VALIDATION_ERROR", "La evaluación no cumple el contrato estricto.");
    const command = parsed.data;
    try {
      this.assertOpen();
      const latest = await this.#dependencies.executionRepository.findLatestByRecordVersion(command.recordId, command.expectedRecordVersion);
      if (latest?.status === "executed") return { status: "already_executed", executionId: latest.executionId, blockers: ["execution_already_active"], publicationExecuted: true };
      if (latest?.status === "withdrawn") return { status: "withdrawn", executionId: latest.executionId, blockers: ["execution_withdrawn"], publicationExecuted: false };
      if (latest?.status === "superseded") return { status: "superseded", executionId: latest.executionId, blockers: ["execution_superseded"], publicationExecuted: false };
      const foundation = await this.foundation(command);
      const timestamp = this.timestamp();
      const result: JurisprudencePublicationExecutionEvaluation = foundation.blockers.length === 0
        ? { status: "ready", blockers: [], publicationExecuted: false }
        : { status: "blocked", blockers: foundation.blockers, publicationExecuted: false };
      this.emit(command.context, "evaluate_execution", result.status === "ready" ? "OK" : "EXECUTION_BLOCKED", timestamp);
      return result;
    } catch (error) { return this.reject(command.context, "evaluate_execution", error); }
  }

  async executePublication(input: unknown): Promise<JurisprudencePublicationExecutionView> {
    const parsed = executeJurisprudencePublicationCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudencePublicationExecutionError("VALIDATION_ERROR", "La ejecución no cumple el contrato estricto.");
    const command: ExecuteJurisprudencePublicationCommand = parsed.data;
    try {
      this.assertOpen();
      const fingerprint = commandFingerprint("execute_publication", command);
      const replay = await this.replay(command.idempotencyKey, fingerprint);
      if (replay !== null) return replay;
      const evaluation = await this.evaluateExecution({
        context: command.context,
        recordId: command.recordId,
        expectedRecordVersion: command.expectedRecordVersion,
        editorialCaseId: command.editorialCaseId,
        publicationDossierId: command.publicationDossierId,
        authorizationCaseId: command.authorizationCaseId,
      });
      if (evaluation.status !== "ready") throw new JurisprudencePublicationExecutionError(evaluation.status === "already_executed" ? "EXECUTION_ALREADY_ACTIVE" : "EXECUTION_BLOCKED", "La ejecución no satisface sus precondiciones.");
      const foundation = await this.foundation(command);
      if (foundation.record === null || foundation.blockers.length > 0) throw new JurisprudencePublicationExecutionError("EXECUTION_BLOCKED", "La ejecución no satisface sus precondiciones.");
      const occurredAt = this.timestamp();
      const executionId = this.#dependencies.generateId();
      const projectionId = this.#dependencies.generateId();
      const execution: JurisprudencePublicationExecution = {
        executionId,
        recordId: command.recordId,
        recordVersion: command.expectedRecordVersion,
        editorialCaseId: command.editorialCaseId,
        publicationDossierId: command.publicationDossierId,
        authorizationCaseId: command.authorizationCaseId,
        projectionId,
        status: "executed",
        version: 1,
        executedAt: occurredAt,
        executedByReference: command.context.actorReference,
        withdrawnAt: null,
        withdrawalReason: null,
        supersededAt: null,
        supersededByRecordVersion: null,
        createdAt: occurredAt,
        updatedAt: occurredAt,
        publicationExecuted: true,
        deployed: false,
      };
      const projection = buildJurisprudencePublicProjection({ record: foundation.record, projectionId, executionId, authorizationCaseId: command.authorizationCaseId, generatedAt: occurredAt });
      const result: JurisprudencePublicationExecutionView = { execution, projection, current: true, publicationExecuted: true, publicProjectionExposed: false, deployed: false };
      const event = this.event(execution, "publication_executed", occurredAt, { authorizationCaseId: command.authorizationCaseId, projectionId, publicationExecuted: true, deployed: false });
      await this.#dependencies.executionRepository.createExecution({ execution, projection, event, idempotency: { idempotencyKey: command.idempotencyKey, commandFingerprint: fingerprint, result } });
      this.emit(command.context, "publication_executed", "OK", occurredAt, execution);
      return clonePublicationExecutionView(result);
    } catch (error) { return this.reject(command.context, "execute_publication", error); }
  }

  private async update(
    command: WithdrawJurisprudencePublicationCommand | SupersedeJurisprudencePublicationExecutionCommand,
    operation: "withdraw_publication" | "supersede_execution",
  ): Promise<JurisprudencePublicationExecutionView> {
    const fingerprint = commandFingerprint(operation, command);
    const replay = await this.replay(command.idempotencyKey, fingerprint);
    if (replay !== null) return replay;
    const current = await this.#dependencies.executionRepository.findById(command.executionId);
    if (current === null) throw new JurisprudencePublicationExecutionError("NOT_FOUND", "No existe la ejecución.");
    if (current.version !== command.expectedVersion) throw new JurisprudencePublicationExecutionError("VERSION_CONFLICT", "La versión esperada no coincide.");
    if (!isPublicationExecutionCurrent(current)) throw new JurisprudencePublicationExecutionError("EXECUTION_NOT_CURRENT", "La ejecución ya no está vigente.");
    const projection = await this.#dependencies.projectionRepository.findById(current.projectionId);
    if (projection === null) throw new JurisprudencePublicationExecutionError("REPOSITORY_UNAVAILABLE", "No existe la proyección vinculada.");
    const occurredAt = this.timestamp();
    const withdrawing = "reason" in command;
    const next: JurisprudencePublicationExecution = {
      ...current,
      status: withdrawing ? "withdrawn" : "superseded",
      version: current.version + 1,
      ...(withdrawing
        ? { withdrawnAt: occurredAt, withdrawalReason: command.reason }
        : { supersededAt: occurredAt, supersededByRecordVersion: command.newRecordVersion }),
      updatedAt: occurredAt,
      publicationExecuted: false,
    };
    const nextProjection: JurisprudencePublicProjection = { ...projection, status: withdrawing ? "withdrawn" : "superseded", updatedAt: occurredAt };
    const result: JurisprudencePublicationExecutionView = { execution: next, projection: nextProjection, current: false, publicationExecuted: false, publicProjectionExposed: false, deployed: false };
    const type: JurisprudencePublicationExecutionEventType = withdrawing ? "publication_withdrawn" : "publication_execution_superseded";
    const event = this.event(next, type, occurredAt, withdrawing
      ? { reason: command.reason, publicationExecuted: false }
      : { newRecordVersion: command.newRecordVersion, publicationExecuted: false });
    await this.#dependencies.executionRepository.updateExecution({ execution: next, projection: nextProjection, event, expectedVersion: current.version, idempotency: { idempotencyKey: command.idempotencyKey, commandFingerprint: fingerprint, result } });
    this.emit(command.context, type, "OK", occurredAt, next);
    return clonePublicationExecutionView(result);
  }

  async withdrawPublication(input: unknown) {
    const parsed = withdrawJurisprudencePublicationCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudencePublicationExecutionError("VALIDATION_ERROR", "El retiro no cumple el contrato estricto.");
    try { this.assertOpen(); return await this.update(parsed.data, "withdraw_publication"); }
    catch (error) { return this.reject(parsed.data.context, "withdraw_publication", error); }
  }
  async supersedeExecution(input: unknown) {
    const parsed = supersedeJurisprudencePublicationExecutionCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudencePublicationExecutionError("VALIDATION_ERROR", "La supersesión no cumple el contrato estricto.");
    try { this.assertOpen(); return await this.update(parsed.data, "supersede_execution"); }
    catch (error) { return this.reject(parsed.data.context, "supersede_execution", error); }
  }
  async getExecution(input: unknown) {
    const parsed = jurisprudencePublicationExecutionQuerySchema.safeParse(input);
    if (!parsed.success) throw new JurisprudencePublicationExecutionError("VALIDATION_ERROR", "La consulta no cumple el contrato estricto.");
    try {
      this.assertOpen();
      const execution = await this.#dependencies.executionRepository.findById(parsed.data.executionId);
      if (execution === null) throw new JurisprudencePublicationExecutionError("NOT_FOUND", "No existe la ejecución.");
      const result = await this.view(execution);
      this.emit(parsed.data.context, "get_execution", "OK", this.timestamp(), execution);
      return result;
    } catch (error) { return this.reject(parsed.data.context, "get_execution", error); }
  }
  async getExecutionHistory(input: unknown) {
    const parsed = jurisprudencePublicationExecutionHistoryQuerySchema.safeParse(input);
    if (!parsed.success) throw new JurisprudencePublicationExecutionError("VALIDATION_ERROR", "La consulta de historial no cumple el contrato estricto.");
    try { this.assertOpen(); const events = await this.#dependencies.executionRepository.listHistory(parsed.data.recordId); this.emit(parsed.data.context, "get_execution_history", "OK", this.timestamp()); return events.map(clonePublicationExecutionEvent); }
    catch (error) { return this.reject(parsed.data.context, "get_execution_history", error); }
  }
  async close() {
    if (this.#closed) return;
    await this.#dependencies.projectionRepository.close();
    await this.#dependencies.executionRepository.close();
    this.#closed = true;
  }
}

export function createJurisprudencePublicationExecutionService(
  dependencies: JurisprudencePublicationExecutionDependencies,
): JurisprudencePublicationExecutionService {
  return new DefaultJurisprudencePublicationExecutionService(dependencies);
}
