import { createHash } from "node:crypto";
import { JurisprudenceApplicationError } from "@/lib/jurisprudence-application-error";
import { JurisprudenceEditorialWorkflowError } from "@/lib/jurisprudence-editorial-case-repository";
import { evaluatePublicationDossierCompleteness } from "@/lib/jurisprudence-publication-governance-readiness";
import { JurisprudencePublicationGovernanceError } from "@/lib/jurisprudence-publication-dossier-repository";
import {
  assessIntegrityCommandSchema,
  assessPrivacyCommandSchema,
  assessProvenanceCommandSchema,
  assessPublicProjectionCommandSchema,
  assessRightsCommandSchema,
  bindJurisprudenceSourceCommandSchema,
  closePublicationDossierCommandSchema,
  evaluatePublicationDossierCommandSchema,
  openPublicationDossierCommandSchema,
  publicationDossierQuerySchema,
  registerJurisprudenceSourceCommandSchema,
  synchronizePublicationDossierCommandSchema,
  supersedeJurisprudenceSourceBindingCommandSchema,
} from "@/lib/schemas/jurisprudence-publication-governance";
import type { JurisprudenceApplicationContext } from "@/types/jurisprudence-application";
import type {
  AssessIntegrityCommand,
  AssessPrivacyCommand,
  AssessProvenanceCommand,
  AssessPublicProjectionCommand,
  AssessRightsCommand,
  BindJurisprudenceSourceCommand,
  ClosePublicationDossierCommand,
  EvaluatePublicationDossierCommand,
  JurisprudencePublicationDossier,
  JurisprudencePublicationGovernanceService,
  JurisprudenceSourceBinding,
  JurisprudenceSourceRecord,
  OpenPublicationDossierCommand,
  PublicationAuthorizationEvaluation,
  PublicationDossierEvent,
  PublicationDossierEventType,
  PublicationDossierMutationBase,
  PublicationDossierQuery,
  PublicationDossierView,
  PublicationGovernanceContext,
  PublicationGovernanceDependencies,
  PublicationGovernanceStoredResult,
  RegisterJurisprudenceSourceCommand,
  SynchronizePublicationDossierCommand,
  SupersedeJurisprudenceSourceBindingCommand,
} from "@/types/jurisprudence-publication-governance";

const nullLogger = { log: () => undefined };

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right, "en")).map(([key, entry]) => [key, stableValue(entry)]));
  return value;
}
function fingerprint<T extends { readonly context: PublicationGovernanceContext }>(operation: string, command: T): string {
  const { context, ...payload } = command;
  return createHash("sha256").update(JSON.stringify(stableValue({ operation, actorReference: context.actorReference, payload }))).digest("hex");
}
function applicationContext(context: PublicationGovernanceContext, requestedAt: string): JurisprudenceApplicationContext {
  return { requestId: context.requestId, actor: { kind: "editorial_operator", id: context.actorReference }, operationSource: "editorial_workflow", requestedAt };
}
function clone<T>(value: T): T { return structuredClone(value); }

interface DossierChange { readonly next: JurisprudencePublicationDossier; readonly type: PublicationDossierEventType; readonly payload: PublicationDossierEvent["payload"] }

export class DefaultJurisprudencePublicationGovernanceService implements JurisprudencePublicationGovernanceService {
  readonly #api: PublicationGovernanceDependencies["api"];
  readonly #editorialWorkflow: PublicationGovernanceDependencies["editorialWorkflow"];
  readonly #repository: PublicationGovernanceDependencies["repository"];
  readonly #now: () => string;
  readonly #generateId: () => string;
  readonly #logger: NonNullable<PublicationGovernanceDependencies["logger"]>;
  #closed = false;

  constructor(dependencies: PublicationGovernanceDependencies) {
    this.#api = dependencies.api;
    this.#editorialWorkflow = dependencies.editorialWorkflow;
    this.#repository = dependencies.repository;
    this.#now = dependencies.now;
    this.#generateId = dependencies.generateId;
    this.#logger = dependencies.logger ?? nullLogger;
  }
  private timestamp(): string { const value = new Date(this.#now()); if (Number.isNaN(value.valueOf())) throw new JurisprudencePublicationGovernanceError("INTERNAL_ERROR", "El reloj produjo una fecha inválida."); return value.toISOString(); }
  private assertOpen(): void { if (this.#closed) throw new JurisprudencePublicationGovernanceError("RESOURCE_CLOSED", "El servicio de gobierno está cerrado."); }
  private reject(context: PublicationGovernanceContext | undefined, error: unknown): never {
    const mapped = error instanceof JurisprudencePublicationGovernanceError ? error
      : error instanceof JurisprudenceApplicationError || error instanceof JurisprudenceEditorialWorkflowError
        ? new JurisprudencePublicationGovernanceError(error.code === "NOT_FOUND" ? "NOT_FOUND" : error.code === "RESOURCE_CLOSED" ? "RESOURCE_CLOSED" : error.code === "VERSION_CONFLICT" ? "VERSION_CONFLICT" : "INTERNAL_ERROR", "La dependencia interna rechazó la operación.")
        : new JurisprudencePublicationGovernanceError("INTERNAL_ERROR", "No fue posible completar la operación.");
    this.#logger.log({ requestId: context?.requestId ?? "governance-validation", operation: "publication_dossier_error", resultCode: mapped.code, timestamp: this.#now() });
    throw mapped;
  }
  private async replay(idempotencyKey: string, commandFingerprint: string): Promise<PublicationGovernanceStoredResult | null> {
    const stored = await this.#repository.findIdempotencyResult(idempotencyKey);
    if (stored === null) return null;
    if (stored.commandFingerprint !== commandFingerprint) throw new JurisprudencePublicationGovernanceError("IDEMPOTENCY_CONFLICT", "La clave de idempotencia fue utilizada con otro comando.");
    return clone(stored.result);
  }
  private event(dossier: JurisprudencePublicationDossier, type: PublicationDossierEventType, occurredAt: string, payload: PublicationDossierEvent["payload"]): PublicationDossierEvent {
    return { eventId: this.#generateId(), dossierId: dossier.dossierId, sequence: dossier.version, type, occurredAt, recordVersion: dossier.recordVersion, dossierVersion: dossier.version, payload };
  }
  private async resolveEvaluation(dossier: JurisprudencePublicationDossier, context: PublicationGovernanceContext): Promise<PublicationAuthorizationEvaluation> {
    const record = (await this.#api.getInternalRecord({ context: applicationContext(context, this.timestamp()), id: dossier.recordId })).record;
    let editorialCase = null;
    try { editorialCase = await this.#editorialWorkflow.getCase({ context, caseId: dossier.editorialCaseId }); } catch (error) { if (!(error instanceof JurisprudenceEditorialWorkflowError) || error.code !== "NOT_FOUND") throw error; }
    const bindings: JurisprudenceSourceBinding[] = [];
    const sources: JurisprudenceSourceRecord[] = [];
    for (const bindingId of dossier.sourceBindingIds) {
      const binding = await this.#repository.findBindingById(bindingId);
      if (binding !== null) {
        bindings.push(binding);
        const source = await this.#repository.findSourceById(binding.sourceId);
        if (source !== null) sources.push(source);
      }
    }
    return evaluatePublicationDossierCompleteness({ dossier, currentRecordVersion: record.recordVersion, editorialCase, bindings, sources });
  }
  private async view(dossier: JurisprudencePublicationDossier, context: PublicationGovernanceContext): Promise<PublicationDossierView> { return { dossier: clone(dossier), evaluation: await this.resolveEvaluation(dossier, context) }; }
  private async mutate<T extends PublicationDossierMutationBase>(operation: string, command: T, change: (current: JurisprudencePublicationDossier, now: string) => DossierChange): Promise<PublicationDossierView> {
    this.assertOpen();
    const commandHash = fingerprint(operation, command);
    const replayed = await this.replay(command.idempotencyKey, commandHash);
    if (replayed !== null) { if (!("dossier" in replayed)) throw new JurisprudencePublicationGovernanceError("IDEMPOTENCY_CONFLICT", "La clave pertenece a otra operación."); return replayed; }
    const current = await this.#repository.findById(command.dossierId);
    if (current === null) throw new JurisprudencePublicationGovernanceError("NOT_FOUND", "No existe el expediente.");
    if (current.version !== command.expectedDossierVersion || current.recordVersion !== command.expectedRecordVersion) throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "La versión esperada no coincide.");
    if (current.supersededAt !== null) throw new JurisprudencePublicationGovernanceError("DOSSIER_SUPERSEDED", "El expediente está superado.");
    if (current.closedAt !== null) throw new JurisprudencePublicationGovernanceError("DOSSIER_CLOSED", "El expediente está cerrado.");
    const now = this.timestamp();
    const changed = change(current, now);
    const result = await this.view(changed.next, command.context);
    const event = this.event(changed.next, changed.type, now, changed.payload);
    await this.#repository.commit({ dossier: changed.next, event, expectedVersion: current.version, idempotency: { idempotencyKey: command.idempotencyKey, commandFingerprint: commandHash, result } });
    this.#logger.log({ requestId: command.context.requestId, operation: changed.type, resultCode: "OK", dossierRef: changed.next.dossierId, recordVersion: changed.next.recordVersion, dossierVersion: changed.next.version, timestamp: now });
    return clone(result);
  }

  async registerSource(input: unknown) {
    const parsed = registerJurisprudenceSourceCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudencePublicationGovernanceError("VALIDATION_ERROR", "El comando de fuente no cumple el contrato estricto.");
    const command: RegisterJurisprudenceSourceCommand = parsed.data;
    try {
      this.assertOpen(); const hash = fingerprint("register_source", command); const replayed = await this.replay(command.idempotencyKey, hash);
      if (replayed !== null) { if (!("source" in replayed)) throw new JurisprudencePublicationGovernanceError("IDEMPOTENCY_CONFLICT", "La clave pertenece a otra operación."); return replayed; }
      const now = this.timestamp(); const source: JurisprudenceSourceRecord = { sourceId: this.#generateId(), ...command.source, metadataVersion: 1, createdAt: now, updatedAt: now };
      const result = { source }; await this.#repository.createSource(source, { idempotencyKey: command.idempotencyKey, commandFingerprint: hash, result }); return clone(result);
    } catch (error) { return this.reject(command.context, error); }
  }

  async bindSource(input: unknown) {
    const parsed = bindJurisprudenceSourceCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudencePublicationGovernanceError("VALIDATION_ERROR", "El comando de vínculo no cumple el contrato estricto.");
    const command: BindJurisprudenceSourceCommand = parsed.data;
    try {
      this.assertOpen(); const hash = fingerprint("bind_source", command); const replayed = await this.replay(command.idempotencyKey, hash);
      if (replayed !== null) { if (!("binding" in replayed)) throw new JurisprudencePublicationGovernanceError("IDEMPOTENCY_CONFLICT", "La clave pertenece a otra operación."); return replayed; }
      const source = await this.#repository.findSourceById(command.sourceId); if (source === null) throw new JurisprudencePublicationGovernanceError("NOT_FOUND", "No existe la fuente.");
      if (source.provenanceStatus === "disputed" || source.verificationStatus === "disputed") throw new JurisprudencePublicationGovernanceError("SOURCE_NOT_ELIGIBLE", "Una fuente disputada no puede vincularse como evidencia vigente.");
      const secondary = source.sourceKind === "secondary_reference" || source.originType === "secondary_source" || source.originType === "simple_copy" || source.originType === "third_party_submission";
      if (secondary && command.isPrimarySource) throw new JurisprudencePublicationGovernanceError("SOURCE_NOT_ELIGIBLE", "Una fuente secundaria no puede declararse primaria automáticamente.");
      const record = (await this.#api.getInternalRecord({ context: applicationContext(command.context, this.timestamp()), id: command.recordId })).record;
      if (record.recordVersion !== command.expectedRecordVersion) throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "La versión del registro no coincide.");
      const binding: JurisprudenceSourceBinding = { bindingId: this.#generateId(), sourceId: source.sourceId, recordId: record.id, recordVersion: record.recordVersion, bindingKind: command.bindingKind, isPrimarySource: command.isPrimarySource, secondarySourceJustificationReference: command.secondarySourceJustificationReference, bindingStatus: "active", createdAt: this.timestamp(), supersededAt: null, supersededByBindingId: null };
      const result = { binding }; await this.#repository.createBinding(binding, { idempotencyKey: command.idempotencyKey, commandFingerprint: hash, result }); return clone(result);
    } catch (error) { return this.reject(command.context, error); }
  }

  async supersedeSourceBinding(input: unknown) {
    const parsed = supersedeJurisprudenceSourceBindingCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudencePublicationGovernanceError("VALIDATION_ERROR", "El comando de sustitución no cumple el contrato estricto.");
    const command: SupersedeJurisprudenceSourceBindingCommand = parsed.data;
    try {
      this.assertOpen(); const hash = fingerprint("supersede_source_binding", command); const replayed = await this.replay(command.idempotencyKey, hash);
      if (replayed !== null) { if (!("binding" in replayed)) throw new JurisprudencePublicationGovernanceError("IDEMPOTENCY_CONFLICT", "La clave pertenece a otra operación."); return replayed; }
      const previous = await this.#repository.findBindingById(command.bindingId); if (previous === null) throw new JurisprudencePublicationGovernanceError("NOT_FOUND", "No existe el vínculo anterior.");
      if (previous.bindingStatus !== "active" || previous.recordVersion !== command.expectedRecordVersion) throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "El vínculo anterior no está activo para la versión esperada.");
      const source = await this.#repository.findSourceById(command.replacementSourceId); if (source === null) throw new JurisprudencePublicationGovernanceError("NOT_FOUND", "No existe la fuente de reemplazo.");
      if (source.provenanceStatus === "disputed" || source.verificationStatus === "disputed") throw new JurisprudencePublicationGovernanceError("SOURCE_NOT_ELIGIBLE", "La fuente de reemplazo está disputada.");
      const secondary = source.sourceKind === "secondary_reference" || source.originType === "secondary_source" || source.originType === "simple_copy" || source.originType === "third_party_submission";
      if (secondary && command.isPrimarySource) throw new JurisprudencePublicationGovernanceError("SOURCE_NOT_ELIGIBLE", "Una fuente secundaria no puede declararse primaria automáticamente.");
      const record = (await this.#api.getInternalRecord({ context: applicationContext(command.context, this.timestamp()), id: previous.recordId })).record;
      if (record.recordVersion !== command.expectedRecordVersion) throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "La versión del registro cambió.");
      const now = this.timestamp(); const replacementId = this.#generateId();
      const superseded: JurisprudenceSourceBinding = { ...previous, bindingStatus: "superseded", supersededAt: now, supersededByBindingId: replacementId };
      const replacement: JurisprudenceSourceBinding = { bindingId: replacementId, sourceId: source.sourceId, recordId: previous.recordId, recordVersion: previous.recordVersion, bindingKind: command.bindingKind, isPrimarySource: command.isPrimarySource, secondarySourceJustificationReference: command.secondarySourceJustificationReference, bindingStatus: "active", createdAt: now, supersededAt: null, supersededByBindingId: null };
      const result = { binding: replacement }; await this.#repository.supersedeBinding(superseded, replacement, { idempotencyKey: command.idempotencyKey, commandFingerprint: hash, result }); return clone(result);
    } catch (error) { return this.reject(command.context, error); }
  }

  async openDossier(input: unknown) {
    const parsed = openPublicationDossierCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudencePublicationGovernanceError("VALIDATION_ERROR", "El comando de apertura no cumple el contrato estricto.");
    const command: OpenPublicationDossierCommand = parsed.data;
    try {
      this.assertOpen(); const hash = fingerprint("open_dossier", command); const replayed = await this.replay(command.idempotencyKey, hash);
      if (replayed !== null) { if (!("dossier" in replayed)) throw new JurisprudencePublicationGovernanceError("IDEMPOTENCY_CONFLICT", "La clave pertenece a otra operación."); return replayed; }
      if (await this.#repository.findActiveByRecordAndVersion(command.recordId, command.expectedRecordVersion) !== null) throw new JurisprudencePublicationGovernanceError("DUPLICATE_ACTIVE_DOSSIER", "Ya existe un expediente activo.");
      const record = (await this.#api.getInternalRecord({ context: applicationContext(command.context, this.timestamp()), id: command.recordId })).record;
      if (record.recordVersion !== command.expectedRecordVersion) throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "La versión del registro no coincide.");
      const editorial = await this.#editorialWorkflow.getCase({ context: command.context, caseId: command.editorialCaseId });
      if (editorial.case.recordId !== command.recordId || editorial.case.recordVersion !== command.expectedRecordVersion || editorial.case.caseVersion !== command.expectedEditorialCaseVersion) throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "El expediente editorial no coincide con el registro y versión.");
      for (const bindingId of command.sourceBindingIds) { const binding = await this.#repository.findBindingById(bindingId); if (binding === null || binding.recordId !== command.recordId || binding.recordVersion !== command.expectedRecordVersion || binding.bindingStatus !== "active") throw new JurisprudencePublicationGovernanceError("SOURCE_NOT_ELIGIBLE", "El vínculo de fuente no es vigente para el registro."); }
      const now = this.timestamp(); const dossier: JurisprudencePublicationDossier = { dossierId: this.#generateId(), recordId: command.recordId, recordVersion: command.expectedRecordVersion, editorialCaseId: command.editorialCaseId, editorialCaseVersion: command.expectedEditorialCaseVersion, sourceBindingIds: [...new Set(command.sourceBindingIds)], provenanceAssessment: null, integrityAssessment: null, rightsAssessment: null, privacyAssessment: null, publicProjectionAssessment: null, institutionalOwnerReference: command.institutionalOwnerReference, status: "draft", version: 1, createdAt: now, updatedAt: now, supersededAt: null, closedAt: null };
      const result = await this.view(dossier, command.context); const event = this.event(dossier, "dossier_opened", now, { sourceBindingIds: dossier.sourceBindingIds });
      await this.#repository.create({ dossier, event, idempotency: { idempotencyKey: command.idempotencyKey, commandFingerprint: hash, result } });
      this.#logger.log({ requestId: command.context.requestId, operation: "publication_dossier_opened", resultCode: "OK", dossierRef: dossier.dossierId, recordVersion: dossier.recordVersion, dossierVersion: dossier.version, timestamp: now }); return clone(result);
    } catch (error) { return this.reject(command.context, error); }
  }

  async assessProvenance(input: unknown) { const parsed = assessProvenanceCommandSchema.safeParse(input); if (!parsed.success) throw new JurisprudencePublicationGovernanceError("VALIDATION_ERROR", "Evaluación inválida."); const command: AssessProvenanceCommand = parsed.data; try { return await this.mutate("assess_provenance", command, (current, now) => ({ next: { ...current, provenanceAssessment: { assessmentId: this.#generateId(), status: command.status, assessedAt: now }, status: "under_review", version: current.version + 1, updatedAt: now }, type: "provenance_assessed", payload: { status: command.status } })); } catch (error) { return this.reject(command.context, error); } }
  async assessIntegrity(input: unknown) { const parsed = assessIntegrityCommandSchema.safeParse(input); if (!parsed.success) throw new JurisprudencePublicationGovernanceError("VALIDATION_ERROR", "Evaluación inválida."); const command: AssessIntegrityCommand = parsed.data; try { return await this.mutate("assess_integrity", command, (current, now) => ({ next: { ...current, integrityAssessment: { assessmentId: this.#generateId(), status: command.status, assessedAt: now }, status: "under_review", version: current.version + 1, updatedAt: now }, type: "integrity_assessed", payload: { status: command.status } })); } catch (error) { return this.reject(command.context, error); } }
  async assessRights(input: unknown) { const parsed = assessRightsCommandSchema.safeParse(input); if (!parsed.success) throw new JurisprudencePublicationGovernanceError("VALIDATION_ERROR", "Evaluación inválida."); const command: AssessRightsCommand = parsed.data; try { return await this.mutate("assess_rights", command, (current, now) => ({ next: { ...current, rightsAssessment: { assessmentId: this.#generateId(), status: command.status, assessedAt: now }, status: "under_review", version: current.version + 1, updatedAt: now }, type: "rights_assessed", payload: { status: command.status } })); } catch (error) { return this.reject(command.context, error); } }
  async assessPrivacy(input: unknown) { const parsed = assessPrivacyCommandSchema.safeParse(input); if (!parsed.success) throw new JurisprudencePublicationGovernanceError("VALIDATION_ERROR", "Evaluación inválida."); const command: AssessPrivacyCommand = parsed.data; try { return await this.mutate("assess_privacy", command, (current, now) => ({ next: { ...current, privacyAssessment: { assessmentId: this.#generateId(), status: command.status, riskCategories: command.riskCategories, otherRiskReference: command.otherRiskReference, assessedAt: now }, status: "under_review", version: current.version + 1, updatedAt: now }, type: "privacy_assessed", payload: { status: command.status, riskCategories: command.riskCategories } })); } catch (error) { return this.reject(command.context, error); } }
  async assessPublicProjection(input: unknown) { const parsed = assessPublicProjectionCommandSchema.safeParse(input); if (!parsed.success) throw new JurisprudencePublicationGovernanceError("VALIDATION_ERROR", "Evaluación inválida."); const command: AssessPublicProjectionCommand = parsed.data; try { return await this.mutate("assess_projection", command, (current, now) => ({ next: { ...current, publicProjectionAssessment: { assessmentId: this.#generateId(), status: command.status, assessedAt: now }, status: "under_review", version: current.version + 1, updatedAt: now }, type: "projection_assessed", payload: { status: command.status } })); } catch (error) { return this.reject(command.context, error); } }
  async evaluateDossier(input: unknown) {
    const parsed = evaluatePublicationDossierCommandSchema.safeParse(input);
    if (!parsed.success) throw new JurisprudencePublicationGovernanceError("VALIDATION_ERROR", "Evaluación inválida.");
    const command: EvaluatePublicationDossierCommand = parsed.data;
    try {
      this.assertOpen();
      const commandHash = fingerprint("evaluate_dossier", command);
      const replayed = await this.replay(command.idempotencyKey, commandHash);
      if (replayed !== null) { if (!("dossier" in replayed)) throw new JurisprudencePublicationGovernanceError("IDEMPOTENCY_CONFLICT", "La clave pertenece a otra operación."); return replayed; }
      const current = await this.#repository.findById(command.dossierId);
      if (current === null) throw new JurisprudencePublicationGovernanceError("NOT_FOUND", "No existe el expediente.");
      if (current.version !== command.expectedDossierVersion || current.recordVersion !== command.expectedRecordVersion) throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "La versión esperada no coincide.");
      if (current.supersededAt !== null) throw new JurisprudencePublicationGovernanceError("DOSSIER_SUPERSEDED", "El expediente está superado.");
      if (current.closedAt !== null) throw new JurisprudencePublicationGovernanceError("DOSSIER_CLOSED", "El expediente está cerrado.");
      const currentEvaluation = await this.resolveEvaluation(current, command.context);
      const ready = currentEvaluation.decision === "ready_for_authorization_evaluation";
      const now = this.timestamp();
      const next: JurisprudencePublicationDossier = { ...current, status: ready ? "complete_for_authorization_evaluation" : "blocked", version: current.version + 1, updatedAt: now };
      const result: PublicationDossierView = { dossier: next, evaluation: currentEvaluation };
      const type = ready ? "dossier_completed" : "dossier_blocked";
      const event = this.event(next, type, now, { decision: currentEvaluation.decision });
      await this.#repository.commit({ dossier: next, event, expectedVersion: current.version, idempotency: { idempotencyKey: command.idempotencyKey, commandFingerprint: commandHash, result } });
      this.#logger.log({ requestId: command.context.requestId, operation: ready ? "publication_dossier_ready_for_evaluation" : "publication_dossier_blocked", resultCode: ready ? "READY_FOR_AUTHORIZATION_EVALUATION" : "BLOCKED", dossierRef: next.dossierId, recordVersion: next.recordVersion, dossierVersion: next.version, timestamp: now });
      return clone(result);
    } catch (error) { return this.reject(command.context, error); }
  }
  async synchronizeDossier(input: unknown) {
    const parsed = synchronizePublicationDossierCommandSchema.safeParse(input); if (!parsed.success) throw new JurisprudencePublicationGovernanceError("VALIDATION_ERROR", "Sincronización inválida."); const command: SynchronizePublicationDossierCommand = parsed.data;
    try {
      this.assertOpen(); const hash = fingerprint("synchronize_dossier", command); const replayed = await this.replay(command.idempotencyKey, hash); if (replayed !== null) { if (!("dossier" in replayed)) throw new JurisprudencePublicationGovernanceError("IDEMPOTENCY_CONFLICT", "La clave pertenece a otra operación."); return replayed; }
      const current = await this.#repository.findById(command.dossierId); if (current === null) throw new JurisprudencePublicationGovernanceError("NOT_FOUND", "No existe el expediente."); if (current.version !== command.expectedDossierVersion) throw new JurisprudencePublicationGovernanceError("VERSION_CONFLICT", "La versión no coincide.");
      const record = (await this.#api.getInternalRecord({ context: applicationContext(command.context, this.timestamp()), id: current.recordId })).record; if (record.recordVersion === current.recordVersion) return this.view(current, command.context);
      const now = this.timestamp(); const next = { ...current, status: "superseded" as const, version: current.version + 1, updatedAt: now, supersededAt: now }; const result = await this.view(next, command.context); const event = this.event(next, "dossier_superseded", now, { newRecordVersion: record.recordVersion }); await this.#repository.commit({ dossier: next, event, expectedVersion: current.version, idempotency: { idempotencyKey: command.idempotencyKey, commandFingerprint: hash, result } }); return clone(result);
    } catch (error) { return this.reject(command.context, error); }
  }
  async closeDossier(input: unknown) { const parsed = closePublicationDossierCommandSchema.safeParse(input); if (!parsed.success) throw new JurisprudencePublicationGovernanceError("VALIDATION_ERROR", "Cierre inválido."); const command: ClosePublicationDossierCommand = parsed.data; try { return await this.mutate("close_dossier", command, (current, now) => ({ next: { ...current, status: "closed", version: current.version + 1, updatedAt: now, closedAt: now }, type: "dossier_closed", payload: {} })); } catch (error) { return this.reject(command.context, error); } }
  async getDossier(input: unknown) { const parsed = publicationDossierQuerySchema.safeParse(input); if (!parsed.success) throw new JurisprudencePublicationGovernanceError("VALIDATION_ERROR", "Consulta inválida."); const query: PublicationDossierQuery = parsed.data; try { this.assertOpen(); const dossier = await this.#repository.findById(query.dossierId); if (dossier === null) throw new JurisprudencePublicationGovernanceError("NOT_FOUND", "No existe el expediente."); return await this.view(dossier, query.context); } catch (error) { return this.reject(query.context, error); } }
  async getHistory(input: unknown) { const parsed = publicationDossierQuerySchema.safeParse(input); if (!parsed.success) throw new JurisprudencePublicationGovernanceError("VALIDATION_ERROR", "Consulta inválida."); const query: PublicationDossierQuery = parsed.data; try { this.assertOpen(); return (await this.#repository.listEvents(query.dossierId)).map(clone); } catch (error) { return this.reject(query.context, error); } }
  async close() { if (this.#closed) return; await this.#repository.close(); await this.#editorialWorkflow.close(); this.#closed = true; }
}

export function createJurisprudencePublicationGovernanceService(dependencies: PublicationGovernanceDependencies): JurisprudencePublicationGovernanceService { return new DefaultJurisprudencePublicationGovernanceService(dependencies); }
