import type {
  JurisprudenceInternalPageDto,
  JurisprudenceInternalRecordResultDto,
  JurisprudenceInternalApi,
  JurisprudencePublicationEvaluationDto,
  JurisprudenceRecordMutationResultDto,
  JurisprudenceVersionHistoryDto,
  PublicJurisprudenceDetailLookup,
} from "@/types/jurisprudence-application";
import type { JurisprudenceSearchResult } from "@/types/jurisprudence";

export type JurisprudenceHttpPublicErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "NOT_ACCEPTABLE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "DUPLICATE_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "VERSION_CONFLICT"
  | "PUBLICATION_BLOCKED"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface JurisprudenceHttpPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface JurisprudenceHttpMeta {
  requestId: string;
  generatedAt: string;
  pagination?: JurisprudenceHttpPaginationMeta;
}

export interface JurisprudenceHttpSuccessResponse<T> {
  ok: true;
  data: T;
  meta: JurisprudenceHttpMeta;
}

export interface JurisprudenceHttpErrorResponse {
  ok: false;
  error: {
    code: JurisprudenceHttpPublicErrorCode;
    message: string;
    details?: Readonly<Record<string, string | number | boolean>>;
  };
  meta: JurisprudenceHttpMeta;
}

export type JurisprudenceHttpResponse<T> =
  | JurisprudenceHttpSuccessResponse<T>
  | JurisprudenceHttpErrorResponse;

export type JurisprudenceHttpOperation =
  | "search_public"
  | "get_public_detail"
  | "list_internal"
  | "get_internal"
  | "create_record"
  | "update_record"
  | "evaluate_publication"
  | "get_history"
  | "close";

export interface JurisprudenceHttpLogEvent {
  requestId: string;
  operation: JurisprudenceHttpOperation;
  phase: "request_received" | "request_completed" | "request_rejected";
  method: string;
  status?: number;
  resultCode?: JurisprudenceHttpPublicErrorCode | "OK";
  durationMs?: number;
}

export interface JurisprudenceHttpLogger {
  log(event: JurisprudenceHttpLogEvent): void;
}

export interface JurisprudenceHttpControllerDependencies {
  api: JurisprudenceInternalApi;
  now: () => string;
  requestIdGenerator: () => string;
  actorId: string;
  logger?: JurisprudenceHttpLogger;
  maxBodyBytes?: number;
  maxQueryLength?: number;
}

export interface PublicJurisprudenceHttpHandlers {
  search(request: Request): Promise<Response>;
  detail(request: Request, params: { slug: string }): Promise<Response>;
}

export interface InternalEditorialJurisprudenceHttpHandlers {
  create(request: Request): Promise<Response>;
  update(request: Request, params: { id: string }): Promise<Response>;
  getInternal(request: Request, params: { id: string }): Promise<Response>;
  listInternal(request: Request): Promise<Response>;
  history(request: Request, params: { id: string }): Promise<Response>;
  evaluatePublication(request: Request, params: { id: string }): Promise<Response>;
}

export interface JurisprudenceRouteHandlers {
  public: PublicJurisprudenceHttpHandlers;
  internal: InternalEditorialJurisprudenceHttpHandlers;
  close(): Promise<void>;
}

export type JurisprudenceHttpData =
  | JurisprudenceSearchResult
  | PublicJurisprudenceDetailLookup
  | JurisprudenceInternalPageDto
  | JurisprudenceInternalRecordResultDto
  | JurisprudenceRecordMutationResultDto
  | JurisprudencePublicationEvaluationDto
  | JurisprudenceVersionHistoryDto;
