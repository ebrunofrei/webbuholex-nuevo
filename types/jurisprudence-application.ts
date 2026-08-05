import type {
  JurisprudenceAppliedFilters,
  JurisprudenceDetail,
  JurisprudenceEditorialStatus,
  JurisprudenceLegalAuthority,
  JurisprudencePublicationBlocker,
  JurisprudencePublicationStatus,
  JurisprudenceRecord,
  JurisprudenceSearchInput,
  JurisprudenceSearchResult,
  JurisprudenceVerificationStatus,
} from "@/types/jurisprudence";
import type {
  JurisprudenceExternalIdentity,
  JurisprudenceNewRecord,
  JurisprudenceRepository,
  JurisprudenceRepositoryFilters,
  JurisprudenceRepositoryListInput,
  JurisprudenceRepositorySort,
  JurisprudenceVersionChangeKind,
} from "@/types/jurisprudence-repository";

export type JurisprudenceApplicationActorKind = "system" | "editorial_operator" | "internal_test";
export type JurisprudenceApplicationOperationSource = "internal_api" | "editorial_workflow" | "test";

export interface JurisprudenceApplicationActor {
  kind: JurisprudenceApplicationActorKind;
  id: string;
  displayName?: string;
}

export interface JurisprudenceApplicationContext {
  requestId: string;
  actor: JurisprudenceApplicationActor;
  operationSource: JurisprudenceApplicationOperationSource;
  requestedAt: string;
}

export interface CreateJurisprudenceRecordCommand {
  context: JurisprudenceApplicationContext;
  idempotencyKey: string;
  record: JurisprudenceNewRecord;
}

export interface UpdateJurisprudenceRecordCommand {
  context: JurisprudenceApplicationContext;
  id: string;
  expectedVersion: number;
  changeKind: Exclude<JurisprudenceVersionChangeKind, "created">;
  record: JurisprudenceNewRecord;
}

export interface GetInternalJurisprudenceRecordQuery {
  context: JurisprudenceApplicationContext;
  id: string;
}

export interface GetInternalJurisprudenceRecordBySlugQuery {
  context: JurisprudenceApplicationContext;
  slug: string;
}

export interface GetInternalJurisprudenceRecordByIdentityQuery {
  context: JurisprudenceApplicationContext;
  identity: JurisprudenceExternalIdentity;
}

export interface GetJurisprudenceVersionHistoryQuery {
  context: JurisprudenceApplicationContext;
  id: string;
}

export interface EvaluateJurisprudencePublicationQuery {
  context: JurisprudenceApplicationContext;
  id: string;
}

export interface ListInternalJurisprudenceRecordsQuery {
  context: JurisprudenceApplicationContext;
  input?: JurisprudenceRepositoryListInput;
}

export interface SearchInternalJurisprudenceRecordsQuery {
  context: JurisprudenceApplicationContext;
  q: string;
  filters?: JurisprudenceRepositoryFilters;
  page?: number;
  pageSize?: number;
  sort?: JurisprudenceRepositorySort;
}

export interface CountInternalJurisprudenceRecordsQuery {
  context: JurisprudenceApplicationContext;
  filters?: JurisprudenceRepositoryFilters;
}

export interface SearchPublicJurisprudenceQuery {
  context: JurisprudenceApplicationContext;
  input: JurisprudenceSearchInput;
}

export interface GetPublicJurisprudenceDetailQuery {
  context: JurisprudenceApplicationContext;
  slug: string;
}

export interface JurisprudenceInternalSummaryDto {
  id: string;
  slug: string | null;
  recordVersion: number;
  editorialStatus: JurisprudenceEditorialStatus;
  publicationStatus: JurisprudencePublicationStatus;
  verificationStatus: JurisprudenceVerificationStatus;
  caseNumber: string;
  resolutionNumber: string;
  resolutionType: string;
  institutionId: string;
  institutionName: string;
  issuingBody: string;
  specialty: string;
  matter: string;
  submatter: string | null;
  issuedAt: string;
  updatedAt: string;
  legalAuthority: JurisprudenceLegalAuthority;
  publicable: boolean;
}

export interface JurisprudenceInternalRecordDto extends JurisprudenceInternalSummaryDto {
  createdAt: string;
  officiallyPublishedAt: string | null;
  instanceLevel: string;
  judicialDistrict: string | null;
  chamberOrCourt: string;
  rapporteur: string | null;
  institution: JurisprudenceRecord["institution"];
  officialContent: JurisprudenceRecord["officialContent"];
  editorialContent: JurisprudenceRecord["editorialContent"];
  generatedContent: JurisprudenceRecord["generatedContent"];
  authority: JurisprudenceRecord["authority"];
  source: JurisprudenceRecord["source"];
  officialFile: Omit<NonNullable<JurisprudenceRecord["officialFile"]>, "internalLocation"> | null;
  search: JurisprudenceRecord["search"];
  internal: JurisprudenceRecord["internal"];
}

export interface JurisprudenceRecordMutationResultDto {
  requestId: string;
  id: string;
  slug: string | null;
  recordVersion: number;
  createdAt: string;
  updatedAt: string;
  editorialStatus: JurisprudenceEditorialStatus;
  publicationStatus: JurisprudencePublicationStatus;
  verificationStatus: JurisprudenceVerificationStatus;
}

export interface JurisprudenceInternalRecordResultDto {
  requestId: string;
  record: JurisprudenceInternalRecordDto;
}

export interface JurisprudenceInternalPageDto {
  requestId: string;
  items: readonly JurisprudenceInternalSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: JurisprudenceRepositorySort;
}

export interface JurisprudenceInternalCountDto {
  requestId: string;
  total: number;
}

export interface JurisprudenceVersionHistoryEntryDto {
  version: number;
  changeKind: JurisprudenceVersionChangeKind;
  recordedAt: string;
  snapshot: JurisprudenceInternalRecordDto;
}

export interface JurisprudenceVersionHistoryDto {
  requestId: string;
  recordId: string;
  entries: readonly JurisprudenceVersionHistoryEntryDto[];
}

export interface JurisprudencePublicationEvaluationDto {
  requestId: string;
  recordId: string;
  recordVersion: number;
  evaluatedAt: string;
  publicable: boolean;
  blockers: readonly JurisprudencePublicationBlocker[];
}

export type PublicJurisprudenceDetailLookup =
  | { status: "found"; detail: JurisprudenceDetail }
  | { status: "not_found" };

export type JurisprudenceApplicationErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "NOT_PUBLIC"
  | "DUPLICATE_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "VERSION_CONFLICT"
  | "PUBLICATION_BLOCKED"
  | "REPOSITORY_UNAVAILABLE"
  | "RESOURCE_CLOSED"
  | "INTERNAL_ERROR";

export interface JurisprudenceApplicationErrorDetails {
  requestId?: string;
  recordId?: string;
  expectedVersion?: number;
  actualVersion?: number;
}

export type JurisprudenceApplicationOperation =
  | "create_record"
  | "update_record"
  | "get_internal_record"
  | "get_internal_record_by_slug"
  | "get_internal_record_by_identity"
  | "get_version_history"
  | "evaluate_publication"
  | "list_internal_records"
  | "search_internal_records"
  | "count_internal_records"
  | "search_public_records"
  | "get_public_detail"
  | "close";

export interface JurisprudenceApplicationLogEvent {
  requestId: string;
  operation: JurisprudenceApplicationOperation;
  phase: "started" | "completed" | "rejected";
  resultCode?: JurisprudenceApplicationErrorCode | "OK" | "NOT_PUBLIC";
  recordId?: string;
  recordVersion?: number;
}

export interface JurisprudenceApplicationLogger {
  log(event: JurisprudenceApplicationLogEvent): void;
}

export interface JurisprudenceApplicationDependencies {
  repository: JurisprudenceRepository;
  now: () => string;
  logger?: JurisprudenceApplicationLogger;
  maxPublicScanRecords?: number;
}

export interface JurisprudenceInternalApi {
  createRecord(command: CreateJurisprudenceRecordCommand): Promise<JurisprudenceRecordMutationResultDto>;
  updateRecord(command: UpdateJurisprudenceRecordCommand): Promise<JurisprudenceRecordMutationResultDto>;
  getInternalRecord(query: GetInternalJurisprudenceRecordQuery): Promise<JurisprudenceInternalRecordResultDto>;
  getInternalRecordBySlug(query: GetInternalJurisprudenceRecordBySlugQuery): Promise<JurisprudenceInternalRecordResultDto>;
  getInternalRecordByIdentity(query: GetInternalJurisprudenceRecordByIdentityQuery): Promise<JurisprudenceInternalRecordResultDto>;
  getVersionHistory(query: GetJurisprudenceVersionHistoryQuery): Promise<JurisprudenceVersionHistoryDto>;
  evaluatePublication(query: EvaluateJurisprudencePublicationQuery): Promise<JurisprudencePublicationEvaluationDto>;
  listInternalRecords(query: ListInternalJurisprudenceRecordsQuery): Promise<JurisprudenceInternalPageDto>;
  searchInternalRecords(query: SearchInternalJurisprudenceRecordsQuery): Promise<JurisprudenceInternalPageDto>;
  countInternalRecords(query: CountInternalJurisprudenceRecordsQuery): Promise<JurisprudenceInternalCountDto>;
  searchPublicRecords(query: SearchPublicJurisprudenceQuery): Promise<JurisprudenceSearchResult>;
  getPublicDetail(query: GetPublicJurisprudenceDetailQuery): Promise<PublicJurisprudenceDetailLookup>;
  close(context: JurisprudenceApplicationContext): Promise<void>;
}

export interface JurisprudenceSqliteApplicationFactoryInput {
  databasePath: string;
  now?: () => string;
  logger?: JurisprudenceApplicationLogger;
  maxPublicScanRecords?: number;
}

export interface JurisprudenceRepositoryApplicationFactoryInput {
  repository: JurisprudenceRepository;
  now?: () => string;
  logger?: JurisprudenceApplicationLogger;
  maxPublicScanRecords?: number;
}

export type JurisprudencePublicAppliedFilters = JurisprudenceAppliedFilters;
