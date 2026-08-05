import {
  getJurisprudencePublicationBlockers,
  isJurisprudenceRecordPublic,
  normalizeJurisprudenceSearchInput,
  toPublicJurisprudenceDetail,
  toPublicJurisprudenceSearchItem,
} from "@/lib/jurisprudence-domain";
import { JurisprudenceApplicationError, toJurisprudenceApplicationError } from "@/lib/jurisprudence-application-error";
import {
  countInternalJurisprudenceRecordsQuerySchema,
  createJurisprudenceRecordCommandSchema,
  evaluateJurisprudencePublicationQuerySchema,
  getInternalJurisprudenceRecordByIdentityQuerySchema,
  getInternalJurisprudenceRecordBySlugQuerySchema,
  getInternalJurisprudenceRecordQuerySchema,
  getJurisprudenceVersionHistoryQuerySchema,
  getPublicJurisprudenceDetailQuerySchema,
  jurisprudenceApplicationContextSchema,
  listInternalJurisprudenceRecordsQuerySchema,
  searchInternalJurisprudenceRecordsQuerySchema,
  searchPublicJurisprudenceQuerySchema,
  updateJurisprudenceRecordCommandSchema,
} from "@/lib/schemas/jurisprudence-application";
import type {
  JurisprudenceEditorialStatus,
  JurisprudencePublicationStatus,
  JurisprudenceRecord,
  JurisprudenceSearchInput,
  JurisprudenceSearchResult,
  JurisprudenceVerificationStatus,
} from "@/types/jurisprudence";
import type {
  CountInternalJurisprudenceRecordsQuery,
  CreateJurisprudenceRecordCommand,
  EvaluateJurisprudencePublicationQuery,
  GetInternalJurisprudenceRecordByIdentityQuery,
  GetInternalJurisprudenceRecordBySlugQuery,
  GetInternalJurisprudenceRecordQuery,
  GetJurisprudenceVersionHistoryQuery,
  GetPublicJurisprudenceDetailQuery,
  JurisprudenceApplicationContext,
  JurisprudenceApplicationDependencies,
  JurisprudenceApplicationLogEvent,
  JurisprudenceApplicationLogger,
  JurisprudenceApplicationOperation,
  JurisprudenceInternalCountDto,
  JurisprudenceInternalPageDto,
  JurisprudenceInternalRecordDto,
  JurisprudenceInternalRecordResultDto,
  JurisprudenceInternalSummaryDto,
  JurisprudencePublicationEvaluationDto,
  JurisprudenceRecordMutationResultDto,
  JurisprudenceVersionHistoryDto,
  ListInternalJurisprudenceRecordsQuery,
  PublicJurisprudenceDetailLookup,
  SearchInternalJurisprudenceRecordsQuery,
  SearchPublicJurisprudenceQuery,
  UpdateJurisprudenceRecordCommand,
} from "@/types/jurisprudence-application";
import type {
  JurisprudenceNewRecord,
  JurisprudenceRepositoryFilters,
  JurisprudenceRepositoryListInput,
  JurisprudenceRepositoryPage,
  JurisprudenceRepositorySearchInput,
} from "@/types/jurisprudence-repository";

const nullLogger: JurisprudenceApplicationLogger = { log: () => undefined };

interface ParsedRepositoryFilters {
  caseNumber?: string | undefined;
  resolutionNumber?: string | undefined;
  institutionId?: string | undefined;
  matter?: string | undefined;
  editorialStatus?: JurisprudenceEditorialStatus | undefined;
  publicationStatus?: JurisprudencePublicationStatus | undefined;
  verificationStatus?: JurisprudenceVerificationStatus | undefined;
  issuedFrom?: string | undefined;
  issuedTo?: string | undefined;
}

function cleanRepositoryFilters(filters: ParsedRepositoryFilters): JurisprudenceRepositoryFilters {
  return {
    ...(filters.caseNumber === undefined ? {} : { caseNumber: filters.caseNumber }),
    ...(filters.resolutionNumber === undefined ? {} : { resolutionNumber: filters.resolutionNumber }),
    ...(filters.institutionId === undefined ? {} : { institutionId: filters.institutionId }),
    ...(filters.matter === undefined ? {} : { matter: filters.matter }),
    ...(filters.editorialStatus === undefined ? {} : { editorialStatus: filters.editorialStatus }),
    ...(filters.publicationStatus === undefined ? {} : { publicationStatus: filters.publicationStatus }),
    ...(filters.verificationStatus === undefined ? {} : { verificationStatus: filters.verificationStatus }),
    ...(filters.issuedFrom === undefined ? {} : { issuedFrom: filters.issuedFrom }),
    ...(filters.issuedTo === undefined ? {} : { issuedTo: filters.issuedTo }),
  };
}

function requestIdFromInput(input: unknown): string | undefined {
  if (typeof input !== "object" || input === null || !("context" in input)) return undefined;
  const context = input.context;
  if (typeof context !== "object" || context === null || !("requestId" in context)) return undefined;
  return typeof context.requestId === "string" ? context.requestId : undefined;
}

function toInternalSummary(record: JurisprudenceRecord): JurisprudenceInternalSummaryDto {
  return {
    id: record.id,
    slug: record.slug,
    recordVersion: record.recordVersion,
    editorialStatus: record.editorialStatus,
    publicationStatus: record.publicationStatus,
    verificationStatus: record.source.verificationStatus,
    caseNumber: record.caseNumber,
    resolutionNumber: record.resolutionNumber,
    resolutionType: record.resolutionType,
    institutionId: record.institution.id,
    institutionName: record.institution.name,
    issuingBody: record.issuingBody,
    specialty: record.specialty,
    matter: record.matter,
    submatter: record.submatter,
    issuedAt: record.issuedAt,
    updatedAt: record.updatedAt,
    legalAuthority: record.authority.legalAuthority,
    publicable: isJurisprudenceRecordPublic(record),
  };
}

function toInternalRecord(record: JurisprudenceRecord): JurisprudenceInternalRecordDto {
  let officialFile: JurisprudenceInternalRecordDto["officialFile"] = null;
  if (record.officialFile !== null) {
    const { internalLocation, ...safeFile } = structuredClone(record.officialFile);
    void internalLocation;
    officialFile = safeFile;
  }
  return {
    ...toInternalSummary(record),
    createdAt: record.createdAt,
    officiallyPublishedAt: record.officiallyPublishedAt,
    instanceLevel: record.instanceLevel,
    judicialDistrict: record.judicialDistrict,
    chamberOrCourt: record.chamberOrCourt,
    rapporteur: record.rapporteur,
    institution: structuredClone(record.institution),
    officialContent: structuredClone(record.officialContent),
    editorialContent: structuredClone(record.editorialContent),
    generatedContent: structuredClone(record.generatedContent),
    authority: structuredClone(record.authority),
    source: structuredClone(record.source),
    officialFile,
    search: structuredClone(record.search),
    internal: structuredClone(record.internal),
  };
}

function toMutationResult(requestId: string, record: JurisprudenceRecord): JurisprudenceRecordMutationResultDto {
  return {
    requestId,
    id: record.id,
    slug: record.slug,
    recordVersion: record.recordVersion,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    editorialStatus: record.editorialStatus,
    publicationStatus: record.publicationStatus,
    verificationStatus: record.source.verificationStatus,
  };
}

function normalizeComparable(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleUpperCase("es-PE");
}

function optionalEquals(actual: string | null, expected: string | undefined): boolean {
  return expected === undefined || (actual !== null && normalizeComparable(actual) === normalizeComparable(expected));
}

function recordMatchesPublicFilters(record: JurisprudenceRecord, input: JurisprudenceSearchInput): boolean {
  return optionalEquals(record.submatter, input.submateria)
    && optionalEquals(record.issuingBody, input.organo)
    && optionalEquals(record.instanceLevel, input.instancia)
    && optionalEquals(record.judicialDistrict, input.distritoJudicial)
    && optionalEquals(record.resolutionType, input.tipoResolucion)
    && (input.authority === undefined || record.authority.legalAuthority === input.authority);
}

function publicRecordComparator(input: JurisprudenceSearchInput): (left: JurisprudenceRecord, right: JurisprudenceRecord) => number {
  return (left, right) => {
    let compared = 0;
    if (input.sort === "date_asc") compared = left.issuedAt.localeCompare(right.issuedAt);
    else if (input.sort === "date_desc") compared = right.issuedAt.localeCompare(left.issuedAt);
    else compared = right.search.editorialRelevance - left.search.editorialRelevance;
    if (compared !== 0) return compared;
    const dateFallback = right.issuedAt.localeCompare(left.issuedAt);
    return dateFallback !== 0 ? dateFallback : left.id.localeCompare(right.id);
  };
}

function sourceChangeFingerprint(record: JurisprudenceRecord | JurisprudenceNewRecord): string {
  return JSON.stringify({
    caseNumber: record.caseNumber,
    resolutionNumber: record.resolutionNumber,
    institution: record.institution,
    issuedAt: record.issuedAt,
    source: record.source,
    officialContent: record.officialContent,
    officialFile: record.officialFile,
  });
}

export class JurisprudenceApplicationService {
  readonly #repository: JurisprudenceApplicationDependencies["repository"];
  readonly #now: () => string;
  readonly #logger: JurisprudenceApplicationLogger;
  readonly #maxPublicScanRecords: number;
  #closed = false;

  constructor(dependencies: JurisprudenceApplicationDependencies) {
    this.#repository = dependencies.repository;
    this.#now = dependencies.now;
    this.#logger = dependencies.logger ?? nullLogger;
    this.#maxPublicScanRecords = dependencies.maxPublicScanRecords ?? 500;
    if (!Number.isInteger(this.#maxPublicScanRecords) || this.#maxPublicScanRecords < 50 || this.#maxPublicScanRecords > 5_000) {
      throw new JurisprudenceApplicationError("VALIDATION_ERROR", "El límite interno de exploración debe estar entre 50 y 5000.");
    }
  }

  private emit(event: JurisprudenceApplicationLogEvent): void {
    this.#logger.log(structuredClone(event));
  }

  private async run<T>(operation: JurisprudenceApplicationOperation, input: unknown, callback: () => Promise<T>): Promise<T> {
    const requestId = requestIdFromInput(input);
    if (requestId !== undefined) this.emit({ requestId, operation, phase: "started" });
    try {
      if (this.#closed) throw new JurisprudenceApplicationError("RESOURCE_CLOSED", "La API interna jurisprudencial está cerrada.", requestId === undefined ? {} : { requestId });
      const value = await callback();
      if (requestId !== undefined) this.emit({ requestId, operation, phase: "completed", resultCode: "OK" });
      return value;
    } catch (error) {
      const translated = toJurisprudenceApplicationError(error, requestId);
      if (requestId !== undefined) this.emit({ requestId, operation, phase: "rejected", resultCode: translated.code, ...(translated.details.recordId === undefined ? {} : { recordId: translated.details.recordId }) });
      throw translated;
    }
  }

  async createRecord(command: CreateJurisprudenceRecordCommand): Promise<JurisprudenceRecordMutationResultDto> {
    return this.run("create_record", command, async () => {
      const parsed = createJurisprudenceRecordCommandSchema.parse(command);
      const created = await this.#repository.create({ record: parsed.record, idempotencyKey: parsed.idempotencyKey });
      return toMutationResult(parsed.context.requestId, created);
    });
  }

  async updateRecord(command: UpdateJurisprudenceRecordCommand): Promise<JurisprudenceRecordMutationResultDto> {
    return this.run("update_record", command, async () => {
      const parsed = updateJurisprudenceRecordCommandSchema.parse(command);
      const current = await this.#repository.findById(parsed.id);
      if (current === null) throw new JurisprudenceApplicationError("NOT_FOUND", "No existe el registro jurisprudencial solicitado.", { requestId: parsed.context.requestId, recordId: parsed.id });
      const sourceChanged = sourceChangeFingerprint(current) !== sourceChangeFingerprint(parsed.record);
      if (parsed.changeKind === "editorial_update" && sourceChanged) {
        throw new JurisprudenceApplicationError("VALIDATION_ERROR", "Un cambio editorial no puede modificar la identidad, fuente o contenido oficial.", { requestId: parsed.context.requestId, recordId: parsed.id });
      }
      if (parsed.changeKind === "source_update" && !sourceChanged) {
        throw new JurisprudenceApplicationError("VALIDATION_ERROR", "Un cambio de fuente debe modificar información trazable de fuente o contenido oficial.", { requestId: parsed.context.requestId, recordId: parsed.id });
      }
      const updated = await this.#repository.update({
        id: parsed.id,
        expectedVersion: parsed.expectedVersion,
        changeKind: parsed.changeKind,
        record: parsed.record,
      });
      return toMutationResult(parsed.context.requestId, updated);
    });
  }

  async getInternalRecord(query: GetInternalJurisprudenceRecordQuery): Promise<JurisprudenceInternalRecordResultDto> {
    return this.run("get_internal_record", query, async () => {
      const parsed = getInternalJurisprudenceRecordQuerySchema.parse(query);
      const record = await this.#repository.findById(parsed.id);
      if (record === null) throw new JurisprudenceApplicationError("NOT_FOUND", "No existe el registro jurisprudencial solicitado.", { requestId: parsed.context.requestId, recordId: parsed.id });
      return { requestId: parsed.context.requestId, record: toInternalRecord(record) };
    });
  }

  async getInternalRecordBySlug(query: GetInternalJurisprudenceRecordBySlugQuery): Promise<JurisprudenceInternalRecordResultDto> {
    return this.run("get_internal_record_by_slug", query, async () => {
      const parsed = getInternalJurisprudenceRecordBySlugQuerySchema.parse(query);
      const record = await this.#repository.findBySlug(parsed.slug);
      if (record === null) throw new JurisprudenceApplicationError("NOT_FOUND", "No existe el registro jurisprudencial solicitado.", { requestId: parsed.context.requestId });
      return { requestId: parsed.context.requestId, record: toInternalRecord(record) };
    });
  }

  async getInternalRecordByIdentity(query: GetInternalJurisprudenceRecordByIdentityQuery): Promise<JurisprudenceInternalRecordResultDto> {
    return this.run("get_internal_record_by_identity", query, async () => {
      const parsed = getInternalJurisprudenceRecordByIdentityQuerySchema.parse(query);
      const record = await this.#repository.findByExternalIdentity(parsed.identity);
      if (record === null) throw new JurisprudenceApplicationError("NOT_FOUND", "No existe el registro jurisprudencial solicitado.", { requestId: parsed.context.requestId });
      return { requestId: parsed.context.requestId, record: toInternalRecord(record) };
    });
  }

  async getVersionHistory(query: GetJurisprudenceVersionHistoryQuery): Promise<JurisprudenceVersionHistoryDto> {
    return this.run("get_version_history", query, async () => {
      const parsed = getJurisprudenceVersionHistoryQuerySchema.parse(query);
      const entries = await this.#repository.getVersionHistory(parsed.id);
      return {
        requestId: parsed.context.requestId,
        recordId: parsed.id,
        entries: entries.map((entry) => ({
          version: entry.version,
          changeKind: entry.changeKind,
          recordedAt: entry.recordedAt,
          snapshot: toInternalRecord(entry.snapshot),
        })),
      };
    });
  }

  async evaluatePublication(query: EvaluateJurisprudencePublicationQuery): Promise<JurisprudencePublicationEvaluationDto> {
    return this.run("evaluate_publication", query, async () => {
      const parsed = evaluateJurisprudencePublicationQuerySchema.parse(query);
      const record = await this.#repository.findById(parsed.id);
      if (record === null) throw new JurisprudenceApplicationError("NOT_FOUND", "No existe el registro jurisprudencial solicitado.", { requestId: parsed.context.requestId, recordId: parsed.id });
      const blockers = structuredClone(getJurisprudencePublicationBlockers(record));
      return {
        requestId: parsed.context.requestId,
        recordId: record.id,
        recordVersion: record.recordVersion,
        evaluatedAt: new Date(this.#now()).toISOString(),
        publicable: blockers.length === 0,
        blockers,
      };
    });
  }

  private toInternalPage(requestId: string, page: JurisprudenceRepositoryPage): JurisprudenceInternalPageDto {
    return {
      requestId,
      items: page.items.map(toInternalSummary),
      total: page.total,
      page: page.page,
      pageSize: page.pageSize,
      totalPages: page.totalPages,
      sort: page.sort,
    };
  }

  async listInternalRecords(query: ListInternalJurisprudenceRecordsQuery): Promise<JurisprudenceInternalPageDto> {
    return this.run("list_internal_records", query, async () => {
      const parsed = listInternalJurisprudenceRecordsQuerySchema.parse(query);
      const input: JurisprudenceRepositoryListInput = parsed.input === undefined ? {} : {
        ...(parsed.input.filters === undefined ? {} : { filters: cleanRepositoryFilters(parsed.input.filters) }),
        ...(parsed.input.page === undefined ? {} : { page: parsed.input.page }),
        ...(parsed.input.pageSize === undefined ? {} : { pageSize: parsed.input.pageSize }),
        ...(parsed.input.sort === undefined ? {} : { sort: parsed.input.sort }),
      };
      return this.toInternalPage(parsed.context.requestId, await this.#repository.list(input));
    });
  }

  async searchInternalRecords(query: SearchInternalJurisprudenceRecordsQuery): Promise<JurisprudenceInternalPageDto> {
    return this.run("search_internal_records", query, async () => {
      const parsed = searchInternalJurisprudenceRecordsQuerySchema.parse(query);
      const input: JurisprudenceRepositorySearchInput = {
        q: parsed.q,
        ...(parsed.filters === undefined ? {} : { filters: cleanRepositoryFilters(parsed.filters) }),
        ...(parsed.page === undefined ? {} : { page: parsed.page }),
        ...(parsed.pageSize === undefined ? {} : { pageSize: parsed.pageSize }),
        ...(parsed.sort === undefined ? {} : { sort: parsed.sort }),
      };
      return this.toInternalPage(parsed.context.requestId, await this.#repository.search(input));
    });
  }

  async countInternalRecords(query: CountInternalJurisprudenceRecordsQuery): Promise<JurisprudenceInternalCountDto> {
    return this.run("count_internal_records", query, async () => {
      const parsed = countInternalJurisprudenceRecordsQuerySchema.parse(query);
      const filters = parsed.filters === undefined ? undefined : cleanRepositoryFilters(parsed.filters);
      return { requestId: parsed.context.requestId, total: await this.#repository.count(filters) };
    });
  }

  private async publicCandidates(input: JurisprudenceSearchInput): Promise<{ records: JurisprudenceRecord[]; truncated: boolean }> {
    const filters: JurisprudenceRepositoryFilters = {
      editorialStatus: "verified",
      publicationStatus: "published",
      verificationStatus: "verified",
      ...(input.expediente === undefined ? {} : { caseNumber: input.expediente }),
      ...(input.resolucion === undefined ? {} : { resolutionNumber: input.resolucion }),
      ...(input.materia === undefined ? {} : { matter: input.materia }),
      ...(input.fechaDesde === undefined ? {} : { issuedFrom: input.fechaDesde }),
      ...(input.fechaHasta === undefined ? {} : { issuedTo: input.fechaHasta }),
    };
    const records: JurisprudenceRecord[] = [];
    let pageNumber = 1;
    let candidateTotal = 0;
    do {
      const base: JurisprudenceRepositoryListInput = { filters, page: pageNumber, pageSize: 50, sort: "issued_at_desc" };
      const page = input.q === undefined
        ? await this.#repository.list(base)
        : await this.#repository.search({ ...base, q: input.q });
      candidateTotal = page.total;
      records.push(...page.items);
      pageNumber += 1;
      if (page.items.length === 0) break;
    } while (records.length < candidateTotal && records.length < this.#maxPublicScanRecords);
    return {
      records: records.slice(0, this.#maxPublicScanRecords),
      truncated: candidateTotal > this.#maxPublicScanRecords,
    };
  }

  async searchPublicRecords(query: SearchPublicJurisprudenceQuery): Promise<JurisprudenceSearchResult> {
    return this.run("search_public_records", query, async () => {
      const parsed = searchPublicJurisprudenceQuerySchema.parse(query);
      const input = normalizeJurisprudenceSearchInput(parsed.input);
      const candidates = await this.publicCandidates(input);
      const publicRecords = candidates.records
        .filter((record) => isJurisprudenceRecordPublic(record) && recordMatchesPublicFilters(record, input))
        .sort(publicRecordComparator(input));
      const total = publicRecords.length;
      const start = (input.page - 1) * input.pageSize;
      const items = publicRecords
        .slice(start, start + input.pageSize)
        .map(toPublicJurisprudenceSearchItem)
        .filter((item) => item !== null);
      const { page, pageSize, sort, ...appliedFilters } = input;
      return {
        items,
        total,
        page,
        pageSize,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        appliedFilters,
        sort,
        dataStatus: candidates.truncated ? "partial" : total === 0 ? "empty" : "available",
        generatedAt: new Date(this.#now()).toISOString(),
      };
    });
  }

  async getPublicDetail(query: GetPublicJurisprudenceDetailQuery): Promise<PublicJurisprudenceDetailLookup> {
    return this.run("get_public_detail", query, async () => {
      const parsed = getPublicJurisprudenceDetailQuerySchema.parse(query);
      const record = await this.#repository.findBySlug(parsed.slug);
      if (record === null) return { status: "not_found" };
      const detail = toPublicJurisprudenceDetail(record);
      if (detail === null) {
        return { status: "not_found" };
      }
      return { status: "found", detail };
    });
  }

  async close(context: JurisprudenceApplicationContext): Promise<void> {
    const parsed = jurisprudenceApplicationContextSchema.parse(context);
    if (this.#closed) return;
    this.emit({ requestId: parsed.requestId, operation: "close", phase: "started" });
    try {
      await this.#repository.close();
      this.#closed = true;
      this.emit({ requestId: parsed.requestId, operation: "close", phase: "completed", resultCode: "OK" });
    } catch (error) {
      const translated = toJurisprudenceApplicationError(error, parsed.requestId);
      this.emit({ requestId: parsed.requestId, operation: "close", phase: "rejected", resultCode: translated.code });
      throw translated;
    }
  }
}
