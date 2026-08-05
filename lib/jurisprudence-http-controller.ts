import { JurisprudenceApplicationError } from "@/lib/jurisprudence-application-error";
import { JurisprudenceHttpError, mapJurisprudenceApplicationErrorToHttp } from "@/lib/jurisprudence-http-error";
import {
  DEFAULT_JURISPRUDENCE_HTTP_BODY_LIMIT,
  DEFAULT_JURISPRUDENCE_HTTP_QUERY_LIMIT,
  assertJurisprudenceHttpMethod,
  assertJurisprudenceJsonAccepted,
  assertJurisprudenceJsonContentType,
  parsePositiveInteger,
  parseStrictJurisprudenceQuery,
  readJurisprudenceIdempotencyKey,
  readLimitedJurisprudenceJson,
  resolveJurisprudenceHttpRequestId,
} from "@/lib/jurisprudence-http-request";
import { jurisprudenceJsonError, jurisprudenceJsonSuccess } from "@/lib/jurisprudence-http-response";
import {
  jurisprudenceHttpCreateBodySchema,
  jurisprudenceHttpInternalListSchema,
  jurisprudenceHttpPublicSearchSchema,
  jurisprudenceHttpRecordIdSchema,
  jurisprudenceHttpSlugSchema,
  jurisprudenceHttpUpdateBodySchema,
} from "@/lib/schemas/jurisprudence-http";
import type { JurisprudenceApplicationContext } from "@/types/jurisprudence-application";
import type { JurisprudenceSearchInput } from "@/types/jurisprudence";
import type {
  JurisprudenceHttpControllerDependencies,
  JurisprudenceHttpLogEvent,
  JurisprudenceHttpLogger,
  JurisprudenceHttpOperation,
  JurisprudenceHttpPaginationMeta,
} from "@/types/jurisprudence-http";
import type { JurisprudenceRepositoryFilters, JurisprudenceRepositoryListInput } from "@/types/jurisprudence-repository";

const publicSearchKeys = new Set([
  "q", "expediente", "resolucion", "materia", "submateria", "organo", "instancia",
  "distritoJudicial", "tipoResolucion", "fechaDesde", "fechaHasta", "authority", "page", "pageSize", "sort",
]);
const internalListKeys = new Set([
  "expediente", "resolucion", "institutionId", "materia", "editorialStatus", "publicationStatus",
  "verificationStatus", "fechaDesde", "fechaHasta", "page", "pageSize", "sort",
]);
const nullHttpLogger: JurisprudenceHttpLogger = { log: () => undefined };

interface HttpOperationResult<T> {
  data: T;
  status?: number;
  pagination?: JurisprudenceHttpPaginationMeta;
}

function publicSearchInput(request: Request, maximumQueryLength: number): JurisprudenceSearchInput {
  const query = parseStrictJurisprudenceQuery(request, publicSearchKeys, maximumQueryLength);
  const parsed = jurisprudenceHttpPublicSearchSchema.parse({
    q: query.q,
    expediente: query.expediente,
    resolucion: query.resolucion,
    materia: query.materia,
    submateria: query.submateria,
    organo: query.organo,
    instancia: query.instancia,
    distritoJudicial: query.distritoJudicial,
    tipoResolucion: query.tipoResolucion,
    fechaDesde: query.fechaDesde,
    fechaHasta: query.fechaHasta,
    authority: query.authority,
    page: parsePositiveInteger(query.page, "page") ?? 1,
    pageSize: parsePositiveInteger(query.pageSize, "pageSize") ?? 20,
    sort: query.sort ?? "relevance",
  });
  return {
    q: parsed.q,
    expediente: parsed.expediente,
    resolucion: parsed.resolucion,
    materia: parsed.materia,
    submateria: parsed.submateria,
    organo: parsed.organo,
    instancia: parsed.instancia,
    distritoJudicial: parsed.distritoJudicial,
    tipoResolucion: parsed.tipoResolucion,
    fechaDesde: parsed.fechaDesde,
    fechaHasta: parsed.fechaHasta,
    authority: parsed.authority,
    page: parsed.page,
    pageSize: parsed.pageSize,
    sort: parsed.sort,
  };
}

function internalListInput(request: Request, maximumQueryLength: number): JurisprudenceRepositoryListInput {
  const query = parseStrictJurisprudenceQuery(request, internalListKeys, maximumQueryLength);
  const filters = {
    ...(query.expediente === undefined ? {} : { caseNumber: query.expediente }),
    ...(query.resolucion === undefined ? {} : { resolutionNumber: query.resolucion }),
    ...(query.institutionId === undefined ? {} : { institutionId: query.institutionId }),
    ...(query.materia === undefined ? {} : { matter: query.materia }),
    ...(query.editorialStatus === undefined ? {} : { editorialStatus: query.editorialStatus }),
    ...(query.publicationStatus === undefined ? {} : { publicationStatus: query.publicationStatus }),
    ...(query.verificationStatus === undefined ? {} : { verificationStatus: query.verificationStatus }),
    ...(query.fechaDesde === undefined ? {} : { issuedFrom: query.fechaDesde }),
    ...(query.fechaHasta === undefined ? {} : { issuedTo: query.fechaHasta }),
  };
  const parsed = jurisprudenceHttpInternalListSchema.parse({
    filters,
    page: parsePositiveInteger(query.page, "page") ?? 1,
    pageSize: parsePositiveInteger(query.pageSize, "pageSize") ?? 20,
    sort: query.sort ?? "updated_at_desc",
  });
  const cleanFilters: JurisprudenceRepositoryFilters = {
    ...(parsed.filters.caseNumber === undefined ? {} : { caseNumber: parsed.filters.caseNumber }),
    ...(parsed.filters.resolutionNumber === undefined ? {} : { resolutionNumber: parsed.filters.resolutionNumber }),
    ...(parsed.filters.institutionId === undefined ? {} : { institutionId: parsed.filters.institutionId }),
    ...(parsed.filters.matter === undefined ? {} : { matter: parsed.filters.matter }),
    ...(parsed.filters.editorialStatus === undefined ? {} : { editorialStatus: parsed.filters.editorialStatus }),
    ...(parsed.filters.publicationStatus === undefined ? {} : { publicationStatus: parsed.filters.publicationStatus }),
    ...(parsed.filters.verificationStatus === undefined ? {} : { verificationStatus: parsed.filters.verificationStatus }),
    ...(parsed.filters.issuedFrom === undefined ? {} : { issuedFrom: parsed.filters.issuedFrom }),
    ...(parsed.filters.issuedTo === undefined ? {} : { issuedTo: parsed.filters.issuedTo }),
  };
  return { filters: cleanFilters, page: parsed.page, pageSize: parsed.pageSize, sort: parsed.sort };
}

export class JurisprudenceHttpController {
  readonly #api: JurisprudenceHttpControllerDependencies["api"];
  readonly #now: () => string;
  readonly #requestIdGenerator: () => string;
  readonly #actorId: string;
  readonly #logger: NonNullable<JurisprudenceHttpControllerDependencies["logger"]>;
  readonly #maxBodyBytes: number;
  readonly #maxQueryLength: number;

  constructor(dependencies: JurisprudenceHttpControllerDependencies) {
    this.#api = dependencies.api;
    this.#now = dependencies.now;
    this.#requestIdGenerator = dependencies.requestIdGenerator;
    this.#actorId = dependencies.actorId;
    this.#logger = dependencies.logger ?? nullHttpLogger;
    this.#maxBodyBytes = dependencies.maxBodyBytes ?? DEFAULT_JURISPRUDENCE_HTTP_BODY_LIMIT;
    this.#maxQueryLength = dependencies.maxQueryLength ?? DEFAULT_JURISPRUDENCE_HTTP_QUERY_LIMIT;
    if (!Number.isInteger(this.#maxBodyBytes) || this.#maxBodyBytes < 1_024 || this.#maxBodyBytes > 1_048_576) {
      throw new JurisprudenceHttpError(500, "INTERNAL_ERROR", "La configuración del límite de cuerpo no es válida.");
    }
    if (!Number.isInteger(this.#maxQueryLength) || this.#maxQueryLength < 256 || this.#maxQueryLength > 8_192) {
      throw new JurisprudenceHttpError(500, "INTERNAL_ERROR", "La configuración del límite de consulta no es válida.");
    }
  }

  #context(requestId: string): JurisprudenceApplicationContext {
    return {
      requestId,
      actor: { kind: "system", id: this.#actorId },
      operationSource: "internal_api",
      requestedAt: new Date(this.#now()).toISOString(),
    };
  }

  #emit(event: JurisprudenceHttpLogEvent): void {
    try { this.#logger.log(structuredClone(event)); } catch { /* logging never controls the operation */ }
  }

  async #run<T>(
    request: Request,
    operation: JurisprudenceHttpOperation,
    allowedMethods: readonly string[],
    callback: (context: JurisprudenceApplicationContext) => Promise<HttpOperationResult<T>>,
  ): Promise<Response> {
    const requestId = resolveJurisprudenceHttpRequestId(request.headers, this.#requestIdGenerator);
    this.#emit({ requestId, operation, phase: "request_received", method: request.method });
    try {
      assertJurisprudenceHttpMethod(request, allowedMethods);
      assertJurisprudenceJsonAccepted(request);
      const result = await callback(this.#context(requestId));
      const status = result.status ?? 200;
      this.#emit({ requestId, operation, phase: "request_completed", method: request.method, status, resultCode: "OK" });
      return jurisprudenceJsonSuccess({
        data: result.data,
        requestId,
        generatedAt: new Date(this.#now()).toISOString(),
        status,
        ...(result.pagination === undefined ? {} : { pagination: result.pagination }),
      });
    } catch (error) {
      const mapped = mapJurisprudenceApplicationErrorToHttp(error);
      this.#emit({ requestId, operation, phase: "request_rejected", method: request.method, status: mapped.status, resultCode: mapped.code });
      return jurisprudenceJsonError({
        code: mapped.code,
        message: mapped.message,
        requestId,
        generatedAt: new Date(this.#now()).toISOString(),
        status: mapped.status,
        headers: mapped.headers,
      });
    }
  }

  handleSearchPublicJurisprudence(request: Request): Promise<Response> {
    return this.#run(request, "search_public", ["GET"], async (context) => {
      const result = await this.#api.searchPublicRecords({ context, input: publicSearchInput(request, this.#maxQueryLength) });
      return {
        data: result,
        pagination: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages },
      };
    });
  }

  handleGetPublicJurisprudenceDetail(request: Request, slug: string): Promise<Response> {
    return this.#run(request, "get_public_detail", ["GET"], async (context) => {
      const parsedSlug = jurisprudenceHttpSlugSchema.parse(slug);
      const lookup = await this.#api.getPublicDetail({ context, slug: parsedSlug });
      if (lookup.status === "not_found") throw new JurisprudenceApplicationError("NOT_FOUND", "No encontrado.");
      return { data: lookup.detail };
    });
  }

  handleListInternalJurisprudence(request: Request): Promise<Response> {
    return this.#run(request, "list_internal", ["GET"], async (context) => {
      const input = internalListInput(request, this.#maxQueryLength);
      const result = await this.#api.listInternalRecords({ context, input });
      return {
        data: result,
        pagination: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages },
      };
    });
  }

  handleGetInternalJurisprudenceRecord(request: Request, id: string): Promise<Response> {
    return this.#run(request, "get_internal", ["GET"], async (context) => ({
      data: await this.#api.getInternalRecord({ context, id: jurisprudenceHttpRecordIdSchema.parse(id) }),
    }));
  }

  handleCreateJurisprudenceRecord(request: Request): Promise<Response> {
    return this.#run(request, "create_record", ["POST"], async (context) => {
      assertJurisprudenceJsonContentType(request);
      const idempotencyKey = readJurisprudenceIdempotencyKey(request);
      const body = jurisprudenceHttpCreateBodySchema.parse(await readLimitedJurisprudenceJson(request, this.#maxBodyBytes));
      return { data: await this.#api.createRecord({ context, idempotencyKey, record: body.record }), status: 201 };
    });
  }

  handleUpdateJurisprudenceRecord(request: Request, id: string): Promise<Response> {
    return this.#run(request, "update_record", ["PUT"], async (context) => {
      assertJurisprudenceJsonContentType(request);
      const parsedId = jurisprudenceHttpRecordIdSchema.parse(id);
      const body = jurisprudenceHttpUpdateBodySchema.parse(await readLimitedJurisprudenceJson(request, this.#maxBodyBytes));
      return { data: await this.#api.updateRecord({ context, id: parsedId, expectedVersion: body.expectedVersion, changeKind: body.changeKind, record: body.record }) };
    });
  }

  handleEvaluateJurisprudencePublication(request: Request, id: string): Promise<Response> {
    return this.#run(request, "evaluate_publication", ["GET"], async (context) => ({
      data: await this.#api.evaluatePublication({ context, id: jurisprudenceHttpRecordIdSchema.parse(id) }),
    }));
  }

  handleGetJurisprudenceHistory(request: Request, id: string): Promise<Response> {
    return this.#run(request, "get_history", ["GET"], async (context) => ({
      data: await this.#api.getVersionHistory({ context, id: jurisprudenceHttpRecordIdSchema.parse(id) }),
    }));
  }

  async close(): Promise<void> {
    const requestId = this.#requestIdGenerator();
    await this.#api.close(this.#context(requestId));
  }
}
