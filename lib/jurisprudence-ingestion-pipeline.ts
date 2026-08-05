import { JurisprudenceApplicationError } from "@/lib/jurisprudence-application-error";
import {
  fingerprintNormalizedJurisprudenceRecord,
  normalizeJurisprudenceIngestionRecord,
  sha256Hex,
} from "@/lib/jurisprudence-ingestion-normalization";
import {
  confirmJurisprudenceIngestionPreviewCommandSchema,
  jurisprudenceIngestionBatchSchema,
} from "@/lib/schemas/jurisprudence-ingestion";
import type {
  JurisprudenceApplicationContext,
  JurisprudenceInternalRecordDto,
} from "@/types/jurisprudence-application";
import type {
  ConfirmJurisprudenceIngestionPreviewCommand,
  JurisprudenceIngestionBatch,
  JurisprudenceIngestionBatchPreviewResult,
  JurisprudenceIngestionIssue,
  JurisprudenceIngestionItem,
  JurisprudenceIngestionItemResult,
  JurisprudenceIngestionLogEvent,
  JurisprudenceIngestionLogger,
  JurisprudenceIngestionPipeline,
  JurisprudenceIngestionPipelineDependencies,
  JurisprudenceNormalizedIngestionRecord,
} from "@/types/jurisprudence-ingestion";
import type { JurisprudenceNewRecord } from "@/types/jurisprudence-repository";

const DEFAULT_PREVIEW_TTL_MS = 15 * 60 * 1000;
const DEFAULT_MAX_BATCH_ITEMS = 50;
const DEFAULT_MAX_ITEM_BYTES = 256 * 1024;

const forbiddenFieldPattern = /(?:^|_)(?:dni|documento.?de.?identidad|domicilio|direccion|tel[eé]fono|correo.?personal|email|token|cookie|contrase[nñ]a|password|secreto|secret|credencial|credential|ruta.?absoluta|absolute.?path|sql|stack)(?:$|_)/i;
const absolutePathPattern = /^(?:[A-Za-z]:[\\/]|\\\\|\/)/;

const nullLogger: JurisprudenceIngestionLogger = { log: () => undefined };

interface StoredPreview {
  readonly previewId: string;
  readonly batchId: string;
  readonly ingestionItemId: string;
  readonly expiresAtMs: number;
  readonly normalized: JurisprudenceNormalizedIngestionRecord;
  readonly operation: "create" | "update";
  readonly idempotencyKey: string;
  readonly targetRecordId?: string;
  readonly expectedVersion?: number;
  readonly changeKind?: "editorial_update" | "source_update";
  confirmedResult?: JurisprudenceIngestionItemResult;
}

interface StoredBatchPreview {
  readonly fingerprint: string;
  readonly result: JurisprudenceIngestionBatchPreviewResult;
}

function issue(code: JurisprudenceIngestionIssue["code"], path: string, message: string): JurisprudenceIngestionIssue {
  return { code, path, message };
}

function cloneResult<T>(value: T): T {
  return structuredClone(value);
}

function safeBatchId(input: unknown): string | null {
  if (input === null || typeof input !== "object" || !("batchId" in input)) return null;
  return typeof input.batchId === "string" ? input.batchId : null;
}

function inspectForbiddenFields(value: unknown, path = "input"): JurisprudenceIngestionIssue[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => inspectForbiddenFields(entry, `${path}[${index}]`));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) => {
      const currentPath = `${path}.${key}`;
      const fieldIssues = forbiddenFieldPattern.test(key)
        ? [issue("PERSONAL_DATA_FIELD_FORBIDDEN", currentPath, "La entrada contiene un campo prohibido para 11.G.")]
        : [];
      return [...fieldIssues, ...inspectForbiddenFields(entry, currentPath)];
    });
  }
  if (typeof value === "string" && absolutePathPattern.test(value)) {
    return [issue("ABSOLUTE_PATH_FORBIDDEN", path, "La entrada no puede contener rutas absolutas.")];
  }
  return [];
}

function existingDtoToNewRecord(record: JurisprudenceInternalRecordDto): JurisprudenceNewRecord | null {
  if (record.officialFile !== null) return null;
  return {
    slug: record.slug,
    editorialStatus: record.editorialStatus,
    publicationStatus: record.publicationStatus,
    caseNumber: record.caseNumber,
    resolutionNumber: record.resolutionNumber,
    resolutionType: record.resolutionType,
    institution: structuredClone(record.institution),
    issuingBody: record.issuingBody,
    instanceLevel: record.instanceLevel,
    specialty: record.specialty,
    matter: record.matter,
    submatter: record.submatter,
    judicialDistrict: record.judicialDistrict,
    chamberOrCourt: record.chamberOrCourt,
    rapporteur: record.rapporteur,
    issuedAt: record.issuedAt,
    officiallyPublishedAt: record.officiallyPublishedAt,
    officialContent: structuredClone(record.officialContent),
    editorialContent: structuredClone(record.editorialContent),
    generatedContent: structuredClone(record.generatedContent),
    authority: structuredClone(record.authority),
    source: structuredClone(record.source),
    officialFile: null,
    search: structuredClone(record.search),
    internal: structuredClone(record.internal),
  };
}

function sameExistingFingerprint(record: JurisprudenceInternalRecordDto, normalized: JurisprudenceNormalizedIngestionRecord): boolean {
  const comparable = existingDtoToNewRecord(record);
  return comparable !== null
    && fingerprintNormalizedJurisprudenceRecord(comparable) === normalized.normalizedRecordFingerprint;
}

export class DefaultJurisprudenceIngestionPipeline implements JurisprudenceIngestionPipeline {
  readonly #api: JurisprudenceIngestionPipelineDependencies["api"];
  readonly #now: () => string;
  readonly #generateId: () => string;
  readonly #logger: JurisprudenceIngestionLogger;
  readonly #previewTtlMs: number;
  readonly #maxBatchItems: number;
  readonly #maxItemBytes: number;
  readonly #previews = new Map<string, StoredPreview>();
  readonly #batches = new Map<string, StoredBatchPreview>();
  #closed = false;

  constructor(dependencies: JurisprudenceIngestionPipelineDependencies) {
    this.#api = dependencies.api;
    this.#now = dependencies.now;
    this.#generateId = dependencies.generateId;
    this.#logger = dependencies.logger ?? nullLogger;
    this.#previewTtlMs = dependencies.previewTtlMs ?? DEFAULT_PREVIEW_TTL_MS;
    this.#maxBatchItems = dependencies.maxBatchItems ?? DEFAULT_MAX_BATCH_ITEMS;
    this.#maxItemBytes = dependencies.maxItemBytes ?? DEFAULT_MAX_ITEM_BYTES;
    if (!Number.isInteger(this.#previewTtlMs) || this.#previewTtlMs < 1_000) throw new Error("previewTtlMs inválido.");
    if (!Number.isInteger(this.#maxBatchItems) || this.#maxBatchItems < 1 || this.#maxBatchItems > 100) throw new Error("maxBatchItems inválido.");
    if (!Number.isInteger(this.#maxItemBytes) || this.#maxItemBytes < 1) throw new Error("maxItemBytes inválido.");
  }

  private emit(event: JurisprudenceIngestionLogEvent): void {
    this.#logger.log(structuredClone(event));
  }

  private currentTime(): { iso: string; milliseconds: number } {
    const milliseconds = Date.parse(this.#now());
    if (!Number.isFinite(milliseconds)) throw new Error("El reloj de ingesta devolvió una fecha inválida.");
    return { iso: new Date(milliseconds).toISOString(), milliseconds };
  }

  private rejectedClosed(batchId: string | null, now: string): JurisprudenceIngestionBatchPreviewResult {
    return {
      status: "rejected",
      batchId,
      previewedAt: now,
      issues: [issue("RESOURCE_CLOSED", "pipeline", "El pipeline de ingesta está cerrado.")],
      items: [],
    };
  }

  private async existingByIdentity(
    batch: JurisprudenceIngestionBatch,
    normalized: JurisprudenceNormalizedIngestionRecord,
  ): Promise<JurisprudenceInternalRecordDto | null> {
    try {
      return (await this.#api.getInternalRecordByIdentity({
        context: batch.context,
        identity: normalized.identity,
      })).record;
    } catch (error) {
      if (error instanceof JurisprudenceApplicationError && error.code === "NOT_FOUND") return null;
      throw error;
    }
  }

  private storePreview(
    batch: JurisprudenceIngestionBatch,
    item: JurisprudenceIngestionItem,
    normalized: JurisprudenceNormalizedIngestionRecord,
    operation: "create" | "update",
    nowMs: number,
    existing?: JurisprudenceInternalRecordDto,
  ): JurisprudenceIngestionItemResult {
    const previewId = this.#generateId();
    const expiresAtMs = nowMs + this.#previewTtlMs;
    const stored: StoredPreview = {
      previewId,
      batchId: batch.batchId,
      ingestionItemId: item.ingestionItemId,
      expiresAtMs,
      normalized,
      operation,
      idempotencyKey: item.idempotencyKey,
      ...(item.targetRecordId === undefined ? {} : { targetRecordId: item.targetRecordId }),
      ...(item.expectedVersion === undefined ? {} : { expectedVersion: item.expectedVersion }),
      ...(item.changeKind === undefined ? {} : { changeKind: item.changeKind }),
    };
    this.#previews.set(previewId, stored);
    return {
      status: "preview_ready",
      ingestionItemId: item.ingestionItemId,
      previewId,
      expiresAt: new Date(expiresAtMs).toISOString(),
      normalizedRecordFingerprint: normalized.normalizedRecordFingerprint,
      jurisprudenceIdentityKey: normalized.jurisprudenceIdentityKey,
      proposedCommand: operation,
      ...(existing === undefined ? {} : { existingRecordId: existing.id, expectedVersion: existing.recordVersion }),
    };
  }

  async previewBatch(input: unknown): Promise<JurisprudenceIngestionBatchPreviewResult> {
    const time = this.currentTime();
    if (this.#closed) return this.rejectedClosed(safeBatchId(input), time.iso);
    const privacyIssues = inspectForbiddenFields(input);
    const parsed = jurisprudenceIngestionBatchSchema.safeParse(input);
    if (!parsed.success || privacyIssues.length > 0) {
      const issues = [
        ...privacyIssues,
        ...(parsed.success ? [] : parsed.error.issues.map((entry) => issue("INVALID_BATCH", entry.path.join("."), "La entrada no cumple el contrato estricto de ingesta."))),
      ];
      return { status: "rejected", batchId: safeBatchId(input), previewedAt: time.iso, issues, items: [] };
    }
    const batch = parsed.data;
    this.emit({ requestId: batch.context.requestId, batchId: batch.batchId, operation: "preview_batch", phase: "started", resultCode: "STARTED" });
    if (batch.items.length > this.#maxBatchItems) {
      const result: JurisprudenceIngestionBatchPreviewResult = {
        status: "rejected",
        batchId: batch.batchId,
        previewedAt: time.iso,
        issues: [issue("BATCH_LIMIT_EXCEEDED", "items", "El lote supera el máximo configurado.")],
        items: [],
      };
      this.emit({ requestId: batch.context.requestId, batchId: batch.batchId, operation: "preview_batch", phase: "rejected", resultCode: "BATCH_LIMIT_EXCEEDED" });
      return result;
    }
    const batchFingerprint = sha256Hex(JSON.stringify(batch));
    const previous = this.#batches.get(batch.batchId);
    if (previous !== undefined) {
      if (previous.fingerprint === batchFingerprint) {
        this.emit({ requestId: batch.context.requestId, batchId: batch.batchId, operation: "preview_batch", phase: "completed", resultCode: "IDEMPOTENT_REPLAY" });
        return cloneResult(previous.result);
      }
      const result: JurisprudenceIngestionBatchPreviewResult = {
        status: "rejected",
        batchId: batch.batchId,
        previewedAt: time.iso,
        issues: [issue("INVALID_BATCH", "batchId", "El batchId ya fue usado con otro contenido.")],
        items: [],
      };
      this.emit({ requestId: batch.context.requestId, batchId: batch.batchId, operation: "preview_batch", phase: "rejected", resultCode: "BATCH_IDEMPOTENCY_CONFLICT" });
      return result;
    }

    const idempotencyKeys = new Map<string, string>();
    const checksums = new Map<string, string>();
    const fingerprints = new Map<string, string>();
    const identities = new Map<string, string>();
    const results: JurisprudenceIngestionItemResult[] = [];
    for (const item of batch.items) {
      if (item.source.byteSize > this.#maxItemBytes) {
        results.push({ status: "rejected", ingestionItemId: item.ingestionItemId, issues: [issue("ITEM_SIZE_EXCEEDED", "source.byteSize", "El elemento supera el máximo configurado.")] });
        continue;
      }
      if (item.requestedAction.startsWith("confirm_")) {
        results.push({ status: "rejected", ingestionItemId: item.ingestionItemId, issues: [issue("CONFIRM_ACTION_REQUIRES_PREVIEW", "requestedAction", "La confirmación requiere un previewId previo.")] });
        continue;
      }
      const normalized = normalizeJurisprudenceIngestionRecord(item.rawRecord, item.source.checksum);
      const duplicateChecks = [
        { map: idempotencyKeys, key: item.idempotencyKey, reason: "idempotency_key" as const },
        { map: checksums, key: normalized.sourceChecksum, reason: "source_checksum" as const },
        { map: fingerprints, key: normalized.normalizedRecordFingerprint, reason: "normalized_fingerprint" as const },
        { map: identities, key: normalized.jurisprudenceIdentityKey, reason: "identity" as const },
      ];
      const duplicate = duplicateChecks.find((entry) => entry.map.has(entry.key));
      if (duplicate !== undefined) {
        results.push({
          status: "duplicate_in_batch",
          ingestionItemId: item.ingestionItemId,
          duplicateOfItemId: duplicate.map.get(duplicate.key) ?? item.ingestionItemId,
          reason: duplicate.reason,
        });
        continue;
      }
      for (const entry of duplicateChecks) entry.map.set(entry.key, item.ingestionItemId);
      try {
        const existing = await this.existingByIdentity(batch, normalized);
        if (existing === null) {
          if (item.requestedAction === "preview_update") {
            results.push({ status: "conflict", ingestionItemId: item.ingestionItemId, issues: [issue("EXISTING_IDENTITY", "rawRecord", "La actualización no encontró la identidad indicada.")] });
          } else {
            results.push(this.storePreview(batch, item, normalized, "create", time.milliseconds));
          }
          continue;
        }
        if (sameExistingFingerprint(existing, normalized)) {
          results.push({ status: "unchanged", ingestionItemId: item.ingestionItemId, existingRecordId: existing.id, existingVersion: existing.recordVersion });
          continue;
        }
        if (item.requestedAction === "preview_create") {
          results.push({ status: "duplicate_existing", ingestionItemId: item.ingestionItemId, existingRecordId: existing.id, existingVersion: existing.recordVersion });
          continue;
        }
        if (item.targetRecordId !== existing.id) {
          results.push({ status: "conflict", ingestionItemId: item.ingestionItemId, issues: [issue("TARGET_RECORD_MISMATCH", "targetRecordId", "La identidad pertenece a otro registro.")] });
          continue;
        }
        if (item.expectedVersion !== existing.recordVersion) {
          results.push({ status: "conflict", ingestionItemId: item.ingestionItemId, issues: [issue("VERSION_CONFLICT", "expectedVersion", "La versión esperada no coincide con el registro actual.")] });
          continue;
        }
        results.push(this.storePreview(batch, item, normalized, "update", time.milliseconds, existing));
      } catch {
        results.push({ status: "rejected", ingestionItemId: item.ingestionItemId, issues: [issue("APPLICATION_ERROR", "rawRecord", "No fue posible evaluar el elemento mediante la API interna.")] });
      }
    }
    const result: JurisprudenceIngestionBatchPreviewResult = { status: "accepted", batchId: batch.batchId, previewedAt: time.iso, items: results };
    this.#batches.set(batch.batchId, { fingerprint: batchFingerprint, result: cloneResult(result) });
    this.emit({ requestId: batch.context.requestId, batchId: batch.batchId, operation: "preview_batch", phase: "completed", resultCode: "OK" });
    return cloneResult(result);
  }

  async confirmPreview(input: unknown): Promise<JurisprudenceIngestionItemResult> {
    const parsed = confirmJurisprudenceIngestionPreviewCommandSchema.safeParse(input);
    if (!parsed.success) return { status: "rejected", ingestionItemId: "invalid-confirmation", issues: [issue("INVALID_ITEM", "confirmation", "La confirmación no cumple el contrato estricto.")] };
    const command: ConfirmJurisprudenceIngestionPreviewCommand = parsed.data;
    if (this.#closed) return { status: "rejected", ingestionItemId: "closed-pipeline", issues: [issue("RESOURCE_CLOSED", "pipeline", "El pipeline de ingesta está cerrado.")] };
    const stored = this.#previews.get(command.previewId);
    const batchId = stored?.batchId ?? "unknown-batch";
    this.emit({ requestId: command.context.requestId, batchId, ...(stored === undefined ? {} : { ingestionItemId: stored.ingestionItemId }), operation: "confirm_preview", phase: "started", resultCode: "STARTED" });
    if (stored === undefined) {
      const result: JurisprudenceIngestionItemResult = { status: "rejected", ingestionItemId: "unknown-preview", issues: [issue("PREVIEW_NOT_FOUND", "previewId", "El preview no existe.")] };
      this.emit({ requestId: command.context.requestId, batchId, operation: "confirm_preview", phase: "rejected", resultCode: "PREVIEW_NOT_FOUND" });
      return result;
    }
    if (stored.confirmedResult !== undefined) {
      const confirmed = stored.confirmedResult;
      this.emit({
        requestId: command.context.requestId,
        batchId,
        ingestionItemId: stored.ingestionItemId,
        operation: "confirm_preview",
        phase: "completed",
        resultCode: "IDEMPOTENT_REPLAY",
        ...(confirmed.status === "persisted"
          ? { recordId: confirmed.recordId, recordVersion: confirmed.recordVersion }
          : {}),
      });
      return cloneResult(confirmed);
    }
    if (this.currentTime().milliseconds > stored.expiresAtMs) {
      const result: JurisprudenceIngestionItemResult = { status: "rejected", ingestionItemId: stored.ingestionItemId, issues: [issue("PREVIEW_EXPIRED", "previewId", "El preview expiró.")] };
      this.emit({ requestId: command.context.requestId, batchId, ingestionItemId: stored.ingestionItemId, operation: "confirm_preview", phase: "rejected", resultCode: "PREVIEW_EXPIRED" });
      return result;
    }
    if (command.normalizedRecordFingerprint !== stored.normalized.normalizedRecordFingerprint || command.idempotencyKey !== stored.idempotencyKey) {
      const result: JurisprudenceIngestionItemResult = { status: "conflict", ingestionItemId: stored.ingestionItemId, issues: [issue("PREVIEW_FINGERPRINT_MISMATCH", "normalizedRecordFingerprint", "El contenido o la idempotencia ya no coinciden con el preview.")] };
      this.emit({ requestId: command.context.requestId, batchId, ingestionItemId: stored.ingestionItemId, operation: "confirm_preview", phase: "rejected", resultCode: "PREVIEW_FINGERPRINT_MISMATCH" });
      return result;
    }
    if (stored.operation === "update" && command.expectedVersion !== stored.expectedVersion) {
      const result: JurisprudenceIngestionItemResult = { status: "conflict", ingestionItemId: stored.ingestionItemId, issues: [issue("VERSION_CONFLICT", "expectedVersion", "La versión confirmada no coincide con el preview.")] };
      this.emit({ requestId: command.context.requestId, batchId, ingestionItemId: stored.ingestionItemId, operation: "confirm_preview", phase: "rejected", resultCode: "VERSION_CONFLICT" });
      return result;
    }
    try {
      const mutation = stored.operation === "create"
        ? await this.#api.createRecord({ context: command.context, idempotencyKey: stored.idempotencyKey, record: stored.normalized.record })
        : await this.#api.updateRecord({
            context: command.context,
            id: stored.targetRecordId ?? "missing-target",
            expectedVersion: stored.expectedVersion ?? 0,
            changeKind: stored.changeKind ?? "editorial_update",
            record: stored.normalized.record,
          });
      const result: JurisprudenceIngestionItemResult = {
        status: "persisted",
        ingestionItemId: stored.ingestionItemId,
        recordId: mutation.id,
        recordVersion: mutation.recordVersion,
        operation: stored.operation,
      };
      stored.confirmedResult = cloneResult(result);
      this.emit({ requestId: command.context.requestId, batchId, ingestionItemId: stored.ingestionItemId, operation: "confirm_preview", phase: "completed", resultCode: "OK", recordId: mutation.id, recordVersion: mutation.recordVersion });
      return result;
    } catch (error) {
      const code = error instanceof JurisprudenceApplicationError ? error.code : "APPLICATION_ERROR";
      const status = code === "VERSION_CONFLICT" ? "conflict" as const : "rejected" as const;
      const result: JurisprudenceIngestionItemResult = status === "conflict"
        ? { status, ingestionItemId: stored.ingestionItemId, issues: [issue("VERSION_CONFLICT", "expectedVersion", "La versión cambió antes de persistir.")] }
        : { status, ingestionItemId: stored.ingestionItemId, issues: [issue("APPLICATION_ERROR", "confirmation", "La API interna rechazó la persistencia.")] };
      this.emit({ requestId: command.context.requestId, batchId, ingestionItemId: stored.ingestionItemId, operation: "confirm_preview", phase: "rejected", resultCode: code });
      return result;
    }
  }

  async close(context: JurisprudenceApplicationContext): Promise<void> {
    if (this.#closed) return;
    this.emit({ requestId: context.requestId, batchId: "pipeline-lifecycle", operation: "close", phase: "started", resultCode: "STARTED" });
    await this.#api.close(context);
    this.#closed = true;
    this.#previews.clear();
    this.#batches.clear();
    this.emit({ requestId: context.requestId, batchId: "pipeline-lifecycle", operation: "close", phase: "completed", resultCode: "OK" });
  }
}

export function createJurisprudenceIngestionPipeline(
  dependencies: JurisprudenceIngestionPipelineDependencies,
): JurisprudenceIngestionPipeline {
  return new DefaultJurisprudenceIngestionPipeline(dependencies);
}
