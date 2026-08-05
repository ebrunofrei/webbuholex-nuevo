import { createHash } from "node:crypto";
import { JurisprudenceApplicationError } from "@/lib/jurisprudence-application-error";
import { JurisprudenceEditorialWorkflowError } from "@/lib/jurisprudence-editorial-case-repository";
import {
  clonePublicationAuthorizationEvent,
  clonePublicationAuthorizationView,
  isPublicationAuthorizationCurrent,
  JurisprudencePublicationAuthorizationError,
} from "@/lib/jurisprudence-publication-authorization-repository";
import { JurisprudencePublicationGovernanceError } from "@/lib/jurisprudence-publication-dossier-repository";
import {
  authorizeJurisprudencePublicationCommandSchema,
  deferJurisprudencePublicationAuthorizationCommandSchema,
  evaluateJurisprudencePublicationAuthorizationCommandSchema,
  jurisprudencePublicationAuthorizationHistoryQuerySchema,
  jurisprudencePublicationAuthorizationQuerySchema,
  rejectJurisprudencePublicationAuthorizationCommandSchema,
  revokeJurisprudencePublicationAuthorizationCommandSchema,
  supersedeJurisprudencePublicationAuthorizationCommandSchema,
} from "@/lib/schemas/jurisprudence-publication-authorization";
import { JURISPRUDENCE_PUBLICATION_AUTHORIZATION_REQUIRED_CONDITIONS } from "@/types/jurisprudence-publication-authorization";
import type { JurisprudenceApplicationContext } from "@/types/jurisprudence-application";
import type {
  AuthorizeJurisprudencePublicationCommand,
  DeferJurisprudencePublicationAuthorizationCommand,
  EvaluateJurisprudencePublicationAuthorizationCommand,
  JurisprudencePublicationAuthorizationBlocker,
  JurisprudencePublicationAuthorizationCase,
  JurisprudencePublicationAuthorizationContext,
  JurisprudencePublicationAuthorizationDependencies,
  JurisprudencePublicationAuthorizationDecision,
  JurisprudencePublicationAuthorizationEvaluation,
  JurisprudencePublicationAuthorizationEvent,
  JurisprudencePublicationAuthorizationEventType,
  JurisprudencePublicationAuthorizationService,
  JurisprudencePublicationAuthorizationView,
  RejectJurisprudencePublicationAuthorizationCommand,
  RevokeJurisprudencePublicationAuthorizationCommand,
  SupersedeJurisprudencePublicationAuthorizationCommand,
} from "@/types/jurisprudence-publication-authorization";

const nullLogger = { log: () => undefined };

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right, "en")).map(([key, entry]) => [key, stableValue(entry)]));
  return value;
}
function fingerprint<T extends { readonly context: JurisprudencePublicationAuthorizationContext }>(operation: string, command: T): string {
  const { context, ...payload } = command;
  return createHash("sha256").update(JSON.stringify(stableValue({ operation, actorReference: context.actorReference, payload }))).digest("hex");
}
function applicationContext(context: JurisprudencePublicationAuthorizationContext, requestedAt: string): JurisprudenceApplicationContext {
  return { requestId: context.requestId, actor: { kind: "editorial_operator", id: context.actorReference }, operationSource: "editorial_workflow", requestedAt };
}
function unique<T>(values: readonly T[]): readonly T[] { return [...new Set(values)]; }

interface AuthorizationFoundation {
  readonly dossierId: string;
  readonly recordId: string;
  readonly recordVersion: number;
  readonly evaluation: JurisprudencePublicationAuthorizationEvaluation;
}

export class DefaultJurisprudencePublicationAuthorizationService implements JurisprudencePublicationAuthorizationService {
  readonly #api: JurisprudencePublicationAuthorizationDependencies["api"];
  readonly #editorialWorkflow: JurisprudencePublicationAuthorizationDependencies["editorialWorkflow"];
  readonly #publicationGovernance: JurisprudencePublicationAuthorizationDependencies["publicationGovernance"];
  readonly #repository: JurisprudencePublicationAuthorizationDependencies["repository"];
  readonly #now: () => string;
  readonly #generateId: () => string;
  readonly #logger: NonNullable<JurisprudencePublicationAuthorizationDependencies["logger"]>;
  #closed = false;

  constructor(dependencies: JurisprudencePublicationAuthorizationDependencies) {
    this.#api = dependencies.api;
    this.#editorialWorkflow = dependencies.editorialWorkflow;
    this.#publicationGovernance = dependencies.publicationGovernance;
    this.#repository = dependencies.repository;
    this.#now = dependencies.now;
    this.#generateId = dependencies.generateId;
    this.#logger = dependencies.logger ?? nullLogger;
  }
  private timestamp(): string { const value = new Date(this.#now()); if (Number.isNaN(value.valueOf())) throw new JurisprudencePublicationAuthorizationError("INTERNAL_ERROR", "El reloj produjo una fecha inválida."); return value.toISOString(); }
  private assertOpen(): void { if (this.#closed) throw new JurisprudencePublicationAuthorizationError("RESOURCE_CLOSED", "El servicio de autorización está cerrado."); }
  private reject(context: JurisprudencePublicationAuthorizationContext | undefined, error: unknown): never {
    const mapped = error instanceof JurisprudencePublicationAuthorizationError ? error
      : error instanceof JurisprudenceApplicationError || error instanceof JurisprudenceEditorialWorkflowError || error instanceof JurisprudencePublicationGovernanceError
        ? new JurisprudencePublicationAuthorizationError(error.code === "NOT_FOUND" ? "NOT_FOUND" : error.code === "RESOURCE_CLOSED" ? "RESOURCE_CLOSED" : error.code === "VERSION_CONFLICT" ? "VERSION_CONFLICT" : "INTERNAL_ERROR", "Una dependencia interna rechazó la operación.")
        : new JurisprudencePublicationAuthorizationError("INTERNAL_ERROR", "No fue posible completar la operación.");
    this.#logger.log({ requestId: context?.requestId ?? "authorization-validation", operation: "authorization_error", resultCode: mapped.code, timestamp: this.#now() });
    throw mapped;
  }
  private async replay(idempotencyKey: string, commandFingerprint: string): Promise<JurisprudencePublicationAuthorizationView | null> {
    const stored = await this.#repository.findIdempotencyResult(idempotencyKey);
    if (stored === null) return null;
    if (stored.commandFingerprint !== commandFingerprint) throw new JurisprudencePublicationAuthorizationError("IDEMPOTENCY_CONFLICT", "La clave de idempotencia fue utilizada con otro comando.");
    return clonePublicationAuthorizationView(stored.result);
  }
  private view(authorizationCase: JurisprudencePublicationAuthorizationCase, evaluatedAt: string): JurisprudencePublicationAuthorizationView {
    const current = isPublicationAuthorizationCurrent(authorizationCase, evaluatedAt);
    return { authorizationCase: structuredClone(authorizationCase), authorizationCurrent: current, publicationAuthorizationGranted: current, publicationExecuted: false };
  }
  private event(authorizationCase: JurisprudencePublicationAuthorizationCase, type: JurisprudencePublicationAuthorizationEventType, occurredAt: string): JurisprudencePublicationAuthorizationEvent {
    return { eventId: this.#generateId(), authorizationCaseId: authorizationCase.authorizationCaseId, sequence: authorizationCase.version, type, occurredAt, recordVersion: authorizationCase.recordVersion, authorizationVersion: authorizationCase.version, payload: { decision: authorizationCase.decision, status: authorizationCase.status } };
  }
  private async foundation(command: EvaluateJurisprudencePublicationAuthorizationCommand): Promise<AuthorizationFoundation> {
    this.assertOpen();
    const blockers: JurisprudencePublicationAuthorizationBlocker[] = [];
    const dossierView = await this.#publicationGovernance.getDossier({ context: command.context, dossierId: command.publicationDossierId });
    const dossier = dossierView.dossier;
    if (dossier.recordVersion !== command.expectedRecordVersion) blockers.push("record_version_mismatch");
    const record = (await this.#api.getInternalRecord({ context: applicationContext(command.context, this.timestamp()), id: dossier.recordId })).record;
    if (record.recordVersion !== dossier.recordVersion) blockers.push("record_version_mismatch");
    if (dossier.status !== "complete_for_authorization_evaluation" || dossierView.evaluation.decision !== "ready_for_authorization_evaluation") blockers.push("publication_dossier_incomplete");
    if (dossier.provenanceAssessment?.status !== "verified" || (dossier.integrityAssessment?.status !== "checksum_verified" && dossier.integrityAssessment?.status !== "certified_copy_verified")) blockers.push("source_governance_incomplete");
    if (dossier.rightsAssessment?.status !== "public_display_permitted") blockers.push("rights_not_cleared");
    if (dossier.privacyAssessment?.status !== "approved_for_public_projection") blockers.push("privacy_not_cleared");
    if (dossier.publicProjectionAssessment?.status !== "approved") blockers.push("public_projection_not_assessed");
    try {
      const editorial = await this.#editorialWorkflow.getCase({ context: command.context, caseId: dossier.editorialCaseId });
      if (editorial.case.recordId !== dossier.recordId || editorial.case.recordVersion !== dossier.recordVersion || editorial.case.caseVersion !== dossier.editorialCaseVersion) blockers.push("editorial_case_superseded");
      if (editorial.status === "superseded" || editorial.case.supersededAt !== null) blockers.push("editorial_case_superseded");
      if (editorial.status !== "verified_for_publication_evaluation" || editorial.case.legalDecision?.decision !== "legal_verification_approved") blockers.push("legal_verification_missing");
    } catch (error) {
      if (error instanceof JurisprudenceEditorialWorkflowError && error.code === "NOT_FOUND") blockers.push("editorial_case_missing"); else throw error;
    }
    const normalized = unique(blockers);
    const evaluation: JurisprudencePublicationAuthorizationEvaluation = normalized.length > 0
      ? { decision: "incomplete", blockers: normalized, publicationAuthorizationGranted: false, publicationExecuted: false }
      : { decision: "ready_for_institutional_decision", conditions: JURISPRUDENCE_PUBLICATION_AUTHORIZATION_REQUIRED_CONDITIONS, publicationAuthorizationGranted: false, publicationExecuted: false };
    return { dossierId: dossier.dossierId, recordId: dossier.recordId, recordVersion: dossier.recordVersion, evaluation };
  }
  async evaluateAuthorization(input: unknown) {
    const parsed = evaluateJurisprudencePublicationAuthorizationCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("VALIDATION_ERROR", "La evaluación no cumple el contrato estricto.");
    try { return (await this.foundation(parsed.data)).evaluation; } catch (error) { return this.reject(parsed.data.context, error); }
  }
  private async createDecision(
    operation: string,
    decision: Exclude<JurisprudencePublicationAuthorizationDecision, "revoke">,
    command: AuthorizeJurisprudencePublicationCommand | RejectJurisprudencePublicationAuthorizationCommand | DeferJurisprudencePublicationAuthorizationCommand,
  ): Promise<JurisprudencePublicationAuthorizationView> {
    this.assertOpen();
    const commandHash = fingerprint(operation, command);
    const replayed = await this.replay(command.idempotencyKey, commandHash);
    if (replayed !== null) return replayed;
    const foundation = await this.foundation(command);
    if (decision === "authorize" && foundation.evaluation.decision !== "ready_for_institutional_decision") {
      if (foundation.evaluation.blockers.includes("record_version_mismatch")) throw new JurisprudencePublicationAuthorizationError("VERSION_CONFLICT", "La versión del registro no coincide.");
      throw new JurisprudencePublicationAuthorizationError("DOSSIER_INCOMPLETE", "El expediente no está completo para una decisión institucional.");
    }
    const now = this.timestamp();
    if (decision === "authorize" && await this.#repository.findActiveByRecordVersion(foundation.recordId, foundation.recordVersion, now) !== null) throw new JurisprudencePublicationAuthorizationError("EXISTING_ACTIVE_AUTHORIZATION", "Ya existe una autorización vigente.");
    const effectiveFrom = "effectiveFrom" in command ? command.effectiveFrom : now;
    const reasons = "reasons" in command ? command.reasons : [];
    const blockers = "blockers" in command ? command.blockers : [];
    const conditions = "conditions" in command ? command.conditions : [];
    const status = decision === "authorize" ? "authorized" : decision === "reject" ? "rejected" : "deferred";
    const authorizationCase: JurisprudencePublicationAuthorizationCase = {
      authorizationCaseId: this.#generateId(),
      publicationDossierId: foundation.dossierId,
      recordId: foundation.recordId,
      recordVersion: foundation.recordVersion,
      decision,
      status,
      institutionalAuthorityRef: command.institutionalAuthorityRef,
      decisionRef: command.decisionRef,
      authorizationScopeRef: command.authorizationScopeRef,
      decidedAt: now,
      effectiveFrom,
      ...("expiresAt" in command && command.expiresAt !== undefined ? { expiresAt: command.expiresAt } : {}),
      reasons,
      blockers,
      conditions,
      version: 1,
      createdAt: now,
      updatedAt: now,
      revokedAt: null,
      supersededAt: null,
      publicationAuthorizationGranted: decision === "authorize",
      publicationExecuted: false,
    };
    const result = this.view(authorizationCase, now);
    const eventType = decision === "authorize" ? "authorization_granted" : decision === "reject" ? "authorization_rejected" : "authorization_deferred";
    const event = this.event(authorizationCase, eventType, now);
    await this.#repository.createDecision({ authorizationCase, event, idempotency: { idempotencyKey: command.idempotencyKey, commandFingerprint: commandHash, result } });
    this.#logger.log({ requestId: command.context.requestId, operation, resultCode: "OK", authorizationCaseRef: authorizationCase.authorizationCaseId, recordRef: authorizationCase.recordId, recordVersion: authorizationCase.recordVersion, decision, authorizationStatus: status, timestamp: now });
    return clonePublicationAuthorizationView(result);
  }
  async authorizePublication(input: unknown) { const parsed = authorizeJurisprudencePublicationCommandSchema.safeParse(input); if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("VALIDATION_ERROR", "La autorización no cumple el contrato estricto."); try { return await this.createDecision("authorize_publication", "authorize", parsed.data); } catch (error) { return this.reject(parsed.data.context, error); } }
  async rejectAuthorization(input: unknown) { const parsed = rejectJurisprudencePublicationAuthorizationCommandSchema.safeParse(input); if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("VALIDATION_ERROR", "El rechazo no cumple el contrato estricto."); try { return await this.createDecision("reject_authorization", "reject", parsed.data); } catch (error) { return this.reject(parsed.data.context, error); } }
  async deferAuthorization(input: unknown) { const parsed = deferJurisprudencePublicationAuthorizationCommandSchema.safeParse(input); if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("VALIDATION_ERROR", "El diferimiento no cumple el contrato estricto."); try { return await this.createDecision("defer_authorization", "defer", parsed.data); } catch (error) { return this.reject(parsed.data.context, error); } }
  async revokeAuthorization(input: unknown) {
    const parsed = revokeJurisprudencePublicationAuthorizationCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("VALIDATION_ERROR", "La revocación no cumple el contrato estricto.");
    const command: RevokeJurisprudencePublicationAuthorizationCommand = parsed.data;
    try {
      this.assertOpen(); const commandHash = fingerprint("revoke_authorization", command); const replayed = await this.replay(command.idempotencyKey, commandHash); if (replayed !== null) return replayed;
      const current = await this.#repository.findById(command.authorizationCaseId); if (current === null) throw new JurisprudencePublicationAuthorizationError("NOT_FOUND", "No existe la autorización.");
      if (current.version !== command.expectedVersion) throw new JurisprudencePublicationAuthorizationError("VERSION_CONFLICT", "La versión no coincide.");
      const now = this.timestamp(); if (!isPublicationAuthorizationCurrent(current, now)) throw new JurisprudencePublicationAuthorizationError("AUTHORIZATION_NOT_CURRENT", "La autorización no está vigente.");
      const next: JurisprudencePublicationAuthorizationCase = { ...current, decision: "revoke", status: "revoked", institutionalAuthorityRef: command.institutionalAuthorityRef, decisionRef: command.decisionRef, reasons: command.reasons, blockers: [], conditions: current.conditions, version: current.version + 1, updatedAt: now, revokedAt: now, publicationAuthorizationGranted: false, publicationExecuted: false };
      const result = this.view(next, now); const event = this.event(next, "authorization_revoked", now);
      await this.#repository.revokeAuthorization({ authorizationCase: next, event, expectedVersion: current.version, idempotency: { idempotencyKey: command.idempotencyKey, commandFingerprint: commandHash, result } });
      this.#logger.log({ requestId: command.context.requestId, operation: "revoke_authorization", resultCode: "OK", authorizationCaseRef: next.authorizationCaseId, recordRef: next.recordId, recordVersion: next.recordVersion, decision: "revoke", authorizationStatus: "revoked", timestamp: now }); return clonePublicationAuthorizationView(result);
    } catch (error) { return this.reject(command.context, error); }
  }
  async supersedeAuthorizationForNewVersion(input: unknown) {
    const parsed = supersedeJurisprudencePublicationAuthorizationCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("VALIDATION_ERROR", "La sustitución no cumple el contrato estricto.");
    const command: SupersedeJurisprudencePublicationAuthorizationCommand = parsed.data;
    try {
      this.assertOpen(); const commandHash = fingerprint("supersede_authorization", command); const replayed = await this.replay(command.idempotencyKey, commandHash); if (replayed !== null) return replayed;
      const current = await this.#repository.findById(command.authorizationCaseId); if (current === null) throw new JurisprudencePublicationAuthorizationError("NOT_FOUND", "No existe la autorización.");
      if (current.version !== command.expectedVersion || command.newRecordVersion === current.recordVersion) throw new JurisprudencePublicationAuthorizationError("VERSION_CONFLICT", "La versión nueva no es válida.");
      const record = (await this.#api.getInternalRecord({ context: applicationContext(command.context, this.timestamp()), id: current.recordId })).record;
      if (record.recordVersion !== command.newRecordVersion) throw new JurisprudencePublicationAuthorizationError("VERSION_CONFLICT", "La versión vigente del registro no coincide.");
      const now = this.timestamp(); const next: JurisprudencePublicationAuthorizationCase = { ...current, status: "superseded", version: current.version + 1, updatedAt: now, supersededAt: now, publicationAuthorizationGranted: false, publicationExecuted: false };
      const result = this.view(next, now); const event = this.event(next, "authorization_superseded", now);
      await this.#repository.supersedeByRecordVersion({ authorizationCase: next, event, expectedVersion: current.version, idempotency: { idempotencyKey: command.idempotencyKey, commandFingerprint: commandHash, result } }); return clonePublicationAuthorizationView(result);
    } catch (error) { return this.reject(command.context, error); }
  }
  async getAuthorizationCase(input: unknown) { const parsed = jurisprudencePublicationAuthorizationQuerySchema.safeParse(input); if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("VALIDATION_ERROR", "La consulta no cumple el contrato estricto."); try { this.assertOpen(); const value = await this.#repository.findById(parsed.data.authorizationCaseId); if (value === null) throw new JurisprudencePublicationAuthorizationError("NOT_FOUND", "No existe la autorización."); return this.view(value, this.timestamp()); } catch (error) { return this.reject(parsed.data.context, error); } }
  async getAuthorizationHistory(input: unknown) { const parsed = jurisprudencePublicationAuthorizationHistoryQuerySchema.safeParse(input); if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("VALIDATION_ERROR", "La consulta no cumple el contrato estricto."); try { this.assertOpen(); return (await this.#repository.listHistoryByRecord(parsed.data.recordId)).map(clonePublicationAuthorizationEvent); } catch (error) { return this.reject(parsed.data.context, error); } }
  async close() { if (this.#closed) return; await this.#repository.close(); this.#closed = true; }
}

export function createJurisprudencePublicationAuthorizationService(dependencies: JurisprudencePublicationAuthorizationDependencies): JurisprudencePublicationAuthorizationService {
  return new DefaultJurisprudencePublicationAuthorizationService(dependencies);
}
