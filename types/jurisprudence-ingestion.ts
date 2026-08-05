import type {
  JurisprudenceApplicationContext,
  JurisprudenceInternalApi,
} from "@/types/jurisprudence-application";
import type {
  JurisprudenceExternalIdentity,
  JurisprudenceNewRecord,
  JurisprudenceVersionChangeKind,
} from "@/types/jurisprudence-repository";

export type JurisprudenceIngestionSourceKind =
  | "local_json"
  | "local_structured_record"
  | "test_fixture";

export type JurisprudenceIngestionRequestedAction =
  | "preview_create"
  | "preview_update"
  | "confirm_create"
  | "confirm_update";

export interface JurisprudenceIngestionSource {
  readonly sourceKind: JurisprudenceIngestionSourceKind;
  readonly sourceReference: string;
  readonly acquiredAt: string;
  readonly acquiredBy: string;
  readonly checksum: string;
  readonly mediaType: "application/json";
  readonly originalFileName?: string;
  readonly byteSize: number;
  readonly sourceSystem?: string;
}

export interface JurisprudenceIngestionItem {
  readonly ingestionItemId: string;
  readonly source: JurisprudenceIngestionSource;
  readonly rawRecord: JurisprudenceNewRecord;
  readonly requestedAction: JurisprudenceIngestionRequestedAction;
  readonly idempotencyKey: string;
  readonly targetRecordId?: string;
  readonly expectedVersion?: number;
  readonly changeKind?: Exclude<JurisprudenceVersionChangeKind, "created">;
}

export interface JurisprudenceIngestionBatch {
  readonly batchId: string;
  readonly context: JurisprudenceApplicationContext;
  readonly items: readonly JurisprudenceIngestionItem[];
}

export type JurisprudenceIngestionIssueCode =
  | "INVALID_BATCH"
  | "INVALID_ITEM"
  | "PERSONAL_DATA_FIELD_FORBIDDEN"
  | "ABSOLUTE_PATH_FORBIDDEN"
  | "BATCH_LIMIT_EXCEEDED"
  | "ITEM_SIZE_EXCEEDED"
  | "CONFIRM_ACTION_REQUIRES_PREVIEW"
  | "IDEMPOTENCY_KEY_REPEATED"
  | "SOURCE_CHECKSUM_REPEATED"
  | "NORMALIZED_FINGERPRINT_REPEATED"
  | "IDENTITY_REPEATED"
  | "EXISTING_IDENTITY"
  | "EXISTING_RECORD_CHANGED"
  | "TARGET_RECORD_MISMATCH"
  | "VERSION_CONFLICT"
  | "PREVIEW_NOT_FOUND"
  | "PREVIEW_EXPIRED"
  | "PREVIEW_FINGERPRINT_MISMATCH"
  | "RESOURCE_CLOSED"
  | "APPLICATION_ERROR";

export interface JurisprudenceIngestionIssue {
  readonly code: JurisprudenceIngestionIssueCode;
  readonly path: string;
  readonly message: string;
}

interface JurisprudenceIngestionItemResultBase {
  readonly ingestionItemId: string;
}

export type JurisprudenceIngestionItemResult =
  | (JurisprudenceIngestionItemResultBase & {
      readonly status: "rejected";
      readonly issues: readonly JurisprudenceIngestionIssue[];
    })
  | (JurisprudenceIngestionItemResultBase & {
      readonly status: "duplicate_in_batch";
      readonly duplicateOfItemId: string;
      readonly reason: "idempotency_key" | "source_checksum" | "normalized_fingerprint" | "identity";
    })
  | (JurisprudenceIngestionItemResultBase & {
      readonly status: "duplicate_existing";
      readonly existingRecordId: string;
      readonly existingVersion: number;
    })
  | (JurisprudenceIngestionItemResultBase & {
      readonly status: "conflict";
      readonly issues: readonly JurisprudenceIngestionIssue[];
    })
  | (JurisprudenceIngestionItemResultBase & {
      readonly status: "preview_ready";
      readonly previewId: string;
      readonly expiresAt: string;
      readonly normalizedRecordFingerprint: string;
      readonly jurisprudenceIdentityKey: string;
      readonly proposedCommand: "create" | "update";
      readonly existingRecordId?: string;
      readonly expectedVersion?: number;
    })
  | (JurisprudenceIngestionItemResultBase & {
      readonly status: "persisted";
      readonly recordId: string;
      readonly recordVersion: number;
      readonly operation: "create" | "update";
    })
  | (JurisprudenceIngestionItemResultBase & {
      readonly status: "unchanged";
      readonly existingRecordId: string;
      readonly existingVersion: number;
    });

export type JurisprudenceIngestionBatchPreviewResult =
  | {
      readonly status: "accepted";
      readonly batchId: string;
      readonly previewedAt: string;
      readonly items: readonly JurisprudenceIngestionItemResult[];
    }
  | {
      readonly status: "rejected";
      readonly batchId: string | null;
      readonly previewedAt: string;
      readonly issues: readonly JurisprudenceIngestionIssue[];
      readonly items: readonly [];
    };

export interface ConfirmJurisprudenceIngestionPreviewCommand {
  readonly context: JurisprudenceApplicationContext;
  readonly previewId: string;
  readonly normalizedRecordFingerprint: string;
  readonly idempotencyKey: string;
  readonly expectedVersion?: number;
}

export interface JurisprudenceIngestionLogEvent {
  readonly requestId: string;
  readonly batchId: string;
  readonly ingestionItemId?: string;
  readonly operation: "preview_batch" | "confirm_preview" | "close";
  readonly phase: "started" | "completed" | "rejected";
  readonly resultCode: string;
  readonly sourceKind?: JurisprudenceIngestionSourceKind;
  readonly recordId?: string;
  readonly recordVersion?: number;
  readonly durationMs?: number;
}

export interface JurisprudenceIngestionLogger {
  log(event: JurisprudenceIngestionLogEvent): void;
}

export interface JurisprudenceIngestionPipelineDependencies {
  readonly api: JurisprudenceInternalApi;
  readonly now: () => string;
  readonly generateId: () => string;
  readonly logger?: JurisprudenceIngestionLogger;
  readonly previewTtlMs?: number;
  readonly maxBatchItems?: number;
  readonly maxItemBytes?: number;
}

export interface JurisprudenceNormalizedIngestionRecord {
  readonly record: JurisprudenceNewRecord;
  readonly sourceChecksum: string;
  readonly normalizedRecordFingerprint: string;
  readonly identity: JurisprudenceExternalIdentity;
  readonly jurisprudenceIdentityKey: string;
}

export interface JurisprudenceIngestionPipeline {
  previewBatch(input: unknown): Promise<JurisprudenceIngestionBatchPreviewResult>;
  confirmPreview(input: unknown): Promise<JurisprudenceIngestionItemResult>;
  close(context: JurisprudenceApplicationContext): Promise<void>;
}

export type JurisprudenceIngestionReadinessBlocker =
  | "real_source_policy_missing"
  | "source_ownership_missing"
  | "personal_data_policy_missing"
  | "anonymization_process_missing"
  | "production_storage_missing"
  | "malware_scanning_missing"
  | "file_validation_policy_missing"
  | "audit_retention_missing"
  | "operator_authentication_missing"
  | "ingestion_endpoint_not_authorized"
  | "publication_workflow_missing";

export interface JurisprudenceIngestionReadiness {
  readonly phase: "11.G";
  readonly ingestionContractsReady: true;
  readonly deterministicNormalizationReady: true;
  readonly previewWorkflowReady: true;
  readonly persistenceIntegrationReadyForTesting: true;
  readonly realSourceAcquisitionReady: false;
  readonly personalDataReviewReady: false;
  readonly productionIngestionReady: false;
  readonly automatedPublicationReady: false;
  readonly endpointsMounted: false;
  readonly uiConnected: false;
  readonly overrideSupported: false;
  readonly blockers: readonly JurisprudenceIngestionReadinessBlocker[];
}
