import type {
  JurisprudenceEditorialStatus,
  JurisprudencePublicationStatus,
  JurisprudenceRecord,
  JurisprudenceRecordSourceType,
  JurisprudenceVerificationStatus,
} from "@/types/jurisprudence";

export type JurisprudenceNewRecord = Omit<JurisprudenceRecord, "id" | "recordVersion" | "createdAt" | "updatedAt">;
export type JurisprudenceRepositorySort = "issued_at_asc" | "issued_at_desc" | "updated_at_asc" | "updated_at_desc";
export type JurisprudenceVersionChangeKind = "created" | "editorial_update" | "source_update";

export interface JurisprudenceExternalIdentity {
  sourceType: JurisprudenceRecordSourceType;
  sourceDocumentId: string | null;
  caseNumber: string;
  resolutionNumber: string;
  institutionId: string;
  issuedAt: string;
}

export interface NormalizedJurisprudenceExternalIdentity {
  sourceType: JurisprudenceRecordSourceType;
  sourceDocumentId: string | null;
  caseNumber: string;
  resolutionNumber: string;
  institutionId: string;
  issuedAt: string;
}

export interface JurisprudenceIdentityComparison {
  relation: "exact" | "possible_collision" | "different";
  reasons: readonly string[];
}

export interface JurisprudenceCreateInput {
  record: JurisprudenceNewRecord;
  idempotencyKey: string;
}

export interface JurisprudenceUpdateInput {
  id: string;
  expectedVersion: number;
  changeKind: Exclude<JurisprudenceVersionChangeKind, "created">;
  record: JurisprudenceNewRecord;
}

export interface JurisprudenceRepositoryFilters {
  caseNumber?: string;
  resolutionNumber?: string;
  institutionId?: string;
  matter?: string;
  editorialStatus?: JurisprudenceEditorialStatus;
  publicationStatus?: JurisprudencePublicationStatus;
  verificationStatus?: JurisprudenceVerificationStatus;
  issuedFrom?: string;
  issuedTo?: string;
}

export interface JurisprudenceRepositoryListInput {
  filters?: JurisprudenceRepositoryFilters;
  page?: number;
  pageSize?: number;
  sort?: JurisprudenceRepositorySort;
}

export interface JurisprudenceRepositorySearchInput extends JurisprudenceRepositoryListInput {
  q: string;
}

export interface NormalizedJurisprudenceRepositoryQuery {
  q?: string;
  filters: JurisprudenceRepositoryFilters;
  page: number;
  pageSize: number;
  sort: JurisprudenceRepositorySort;
}

export interface JurisprudenceRepositoryPage {
  items: readonly JurisprudenceRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: JurisprudenceRepositorySort;
}

export interface JurisprudenceVersionEntry {
  recordId: string;
  version: number;
  changeKind: JurisprudenceVersionChangeKind;
  recordedAt: string;
  snapshot: JurisprudenceRecord;
}

export interface JurisprudenceRepository {
  findById(id: string): Promise<JurisprudenceRecord | null>;
  findBySlug(slug: string): Promise<JurisprudenceRecord | null>;
  findByExternalIdentity(identity: JurisprudenceExternalIdentity): Promise<JurisprudenceRecord | null>;
  create(input: JurisprudenceCreateInput): Promise<JurisprudenceRecord>;
  update(input: JurisprudenceUpdateInput): Promise<JurisprudenceRecord>;
  list(input?: JurisprudenceRepositoryListInput): Promise<JurisprudenceRepositoryPage>;
  search(input: JurisprudenceRepositorySearchInput): Promise<JurisprudenceRepositoryPage>;
  count(filters?: JurisprudenceRepositoryFilters): Promise<number>;
  existsByExternalIdentity(identity: JurisprudenceExternalIdentity): Promise<boolean>;
  getVersionHistory(id: string): Promise<readonly JurisprudenceVersionEntry[]>;
  close(): Promise<void>;
}

export type JurisprudenceRepositoryErrorCode =
  | "VALIDATION_ERROR"
  | "DUPLICATE_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "VERSION_CONFLICT"
  | "NOT_FOUND"
  | "PERSISTENCE_ERROR"
  | "RESOURCE_CLOSED";

export interface JurisprudenceRepositoryErrorDetails {
  recordId?: string;
  expectedVersion?: number;
  actualVersion?: number;
  deduplicationKey?: string;
  cause?: string;
}

export interface JurisprudencePersistedRecordRow {
  id: string;
  slug: string | null;
  recordVersion: number;
  deduplicationKey: string;
  sourceType: JurisprudenceRecordSourceType;
  sourceDocumentId: string | null;
  normalizedCaseNumber: string;
  normalizedResolutionNumber: string;
  institutionId: string;
  normalizedMatter: string;
  normalizedSearchText: string;
  issuedAt: string;
  editorialStatus: JurisprudenceEditorialStatus;
  publicationStatus: JurisprudencePublicationStatus;
  verificationStatus: JurisprudenceVerificationStatus;
  createdAt: string;
  updatedAt: string;
  payloadJson: string;
}

export interface JurisprudencePersistedVersionRow {
  recordId: string;
  version: number;
  changeKind: JurisprudenceVersionChangeKind;
  recordedAt: string;
  snapshotJson: string;
}

export interface JurisprudenceRepositoryDependencies {
  now: () => string;
  generateId: () => string;
}
