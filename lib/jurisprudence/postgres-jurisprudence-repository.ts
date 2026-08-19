import "server-only";
import { sql, and, eq, desc, asc } from "drizzle-orm";
import { getJurisprudenceInternalWriteDatabase } from "@/database/client";
import { withJurisprudenceInternalWriteRole } from "@/database/roles";
import { jurisprudenceIdempotency, jurisprudenceRecords, jurisprudenceRecordVersions } from "@/database/schema/jurisprudence";
import { JurisprudenceRepositoryError } from "@/lib/jurisprudence-repository-error";
import {
  cloneJurisprudenceNewRecord,
  cloneJurisprudenceRecord,
  nextRepositoryTimestamp,
  normalizeJurisprudenceRepositoryQuery,
  validateJurisprudenceRecordForPersistence,
  normalizeJurisprudenceIdempotencyPayload,
  normalizeJurisprudenceTimestamp,
} from "@/lib/jurisprudence-repository-utils";
import { jurisprudenceCreateInputSchema, jurisprudenceUpdateInputSchema } from "@/lib/schemas/jurisprudence-repository";
import { buildJurisprudenceDeduplicationKey, getJurisprudenceExternalIdentity, normalizeJurisprudenceExternalIdentity } from "@/lib/jurisprudence-identity";
import { jurisprudenceRecordSchema } from "@/lib/schemas/jurisprudence";
import type { JurisprudenceRecord } from "@/types/jurisprudence";
import type {
  JurisprudenceCreateInput,
  JurisprudenceExternalIdentity,
  JurisprudenceRepository,
  JurisprudenceRepositoryDependencies,
  JurisprudenceRepositoryFilters,
  JurisprudenceRepositoryListInput,
  JurisprudenceRepositoryPage,
  JurisprudenceRepositorySearchInput,
  JurisprudenceUpdateInput,
  JurisprudenceVersionChangeKind,
  JurisprudenceVersionEntry,
} from "@/types/jurisprudence-repository";

const defaultDependencies: JurisprudenceRepositoryDependencies = {
  now: () => new Date().toISOString(),
  generateId: () => crypto.randomUUID(),
};

function normalizeSqlText(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleUpperCase("es-PE");
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export class PostgresJurisprudenceRepository implements JurisprudenceRepository {
  private closed = false;

  constructor(private readonly dependencies: JurisprudenceRepositoryDependencies = defaultDependencies) {}

  private assertOpen(): void {
    if (this.closed) throw new JurisprudenceRepositoryError("RESOURCE_CLOSED", "El repositorio PostgreSQL está cerrado.");
  }

  async findById(id: string): Promise<JurisprudenceRecord | null> {
    this.assertOpen();
    const db = getJurisprudenceInternalWriteDatabase();
    return await withJurisprudenceInternalWriteRole(db, async (tx) => {
      const rows = await tx.select().from(jurisprudenceRecords).where(eq(jurisprudenceRecords.id, id)).limit(1);
      if (rows.length === 0) return null;
      return this.mapToRecord(rows[0]!.payloadJson, id);
    });
  }

  async findBySlug(slug: string): Promise<JurisprudenceRecord | null> {
    this.assertOpen();
    const db = getJurisprudenceInternalWriteDatabase();
    return await withJurisprudenceInternalWriteRole(db, async (tx) => {
      const rows = await tx.select().from(jurisprudenceRecords).where(eq(jurisprudenceRecords.slug, slug)).limit(1);
      if (rows.length === 0) return null;
      return this.mapToRecord(rows[0]!.payloadJson, rows[0]!.id);
    });
  }

  async findByExternalIdentity(identity: JurisprudenceExternalIdentity): Promise<JurisprudenceRecord | null> {
    this.assertOpen();
    const key = buildJurisprudenceDeduplicationKey(identity);
    const db = getJurisprudenceInternalWriteDatabase();
    return await withJurisprudenceInternalWriteRole(db, async (tx) => {
      const rows = await tx.select().from(jurisprudenceRecords).where(eq(jurisprudenceRecords.deduplicationKey, key)).limit(1);
      if (rows.length === 0) return null;
      return this.mapToRecord(rows[0]!.payloadJson, rows[0]!.id);
    });
  }

  async create(input: JurisprudenceCreateInput): Promise<JurisprudenceRecord> {
    this.assertOpen();
    const parsed = jurisprudenceCreateInputSchema.parse(input);
    const recordInput = cloneJurisprudenceNewRecord(parsed.record);

    // We stringify the record input to store in idempotency logic exactly as sqlite does
    const inputJson = JSON.parse(JSON.stringify(recordInput));

    const db = getJurisprudenceInternalWriteDatabase();
    return await withJurisprudenceInternalWriteRole(db, async (tx) => {
      // 1. Idempotency lookup
      const idempotencyRows = await tx.select().from(jurisprudenceIdempotency)
        .where(eq(jurisprudenceIdempotency.idempotencyKey, parsed.idempotencyKey));

      if (idempotencyRows.length > 0) {
        const idempotency = idempotencyRows[0]!;
        // PostgreSQL jsonb equivalence check using JSON.stringify for deep equal is risky if keys reorder,
        // but since we stringified above, we should do the same. SQLite does strict string comparison.
        if (normalizeJurisprudenceIdempotencyPayload(idempotency.inputJson) !== normalizeJurisprudenceIdempotencyPayload(inputJson)) {
          throw new JurisprudenceRepositoryError("IDEMPOTENCY_CONFLICT", "La clave de idempotencia ya fue usada con otro contenido.", { recordId: idempotency.recordId });
        }
        const existingRows = await tx.select().from(jurisprudenceRecords).where(eq(jurisprudenceRecords.id, idempotency.recordId)).limit(1);
        if (existingRows.length === 0) throw new JurisprudenceRepositoryError("PERSISTENCE_ERROR", "La referencia de idempotencia no conserva su registro.", { recordId: idempotency.recordId });
        return this.mapToRecord(existingRows[0]!.payloadJson, idempotency.recordId);
      }

      const timestamp = nextRepositoryTimestamp(this.dependencies.now());
      const candidate = validateJurisprudenceRecordForPersistence({
        ...recordInput,
        id: this.dependencies.generateId(),
        recordVersion: 1,
        createdAt: timestamp,
        updatedAt: timestamp
      });
      const key = buildJurisprudenceDeduplicationKey(getJurisprudenceExternalIdentity(candidate));
      const normalized = normalizeJurisprudenceExternalIdentity(getJurisprudenceExternalIdentity(candidate));

      // Uniqueness backstops using direct queries, relying on transactions
      const dupRows = await tx.select({ id: jurisprudenceRecords.id }).from(jurisprudenceRecords).where(eq(jurisprudenceRecords.deduplicationKey, key)).limit(1);
      if (dupRows.length > 0) throw new JurisprudenceRepositoryError("DUPLICATE_CONFLICT", "Ya existe un registro con la misma identidad externa.", { deduplicationKey: key });

      if (candidate.slug) {
        const slugRows = await tx.select({ id: jurisprudenceRecords.id }).from(jurisprudenceRecords).where(eq(jurisprudenceRecords.slug, candidate.slug)).limit(1);
        if (slugRows.length > 0) throw new JurisprudenceRepositoryError("DUPLICATE_CONFLICT", "Ya existe un registro con el mismo slug.");
      }

      const payload = JSON.parse(JSON.stringify(candidate));

      // 3. Insert record
      await tx.insert(jurisprudenceRecords).values({
        id: candidate.id,
        slug: candidate.slug,
        recordVersion: candidate.recordVersion,
        deduplicationKey: key,
        sourceType: candidate.source.type,
        sourceDocumentId: normalized.sourceDocumentId,
        normalizedCaseNumber: normalized.caseNumber,
        normalizedResolutionNumber: normalized.resolutionNumber,
        institutionId: normalized.institutionId,
        normalizedMatter: normalizeSqlText(candidate.matter),
        normalizedSearchText: normalizeSqlText(candidate.search.normalizedSearchText),
        issuedAt: candidate.issuedAt,
        editorialStatus: candidate.editorialStatus,
        publicationStatus: candidate.publicationStatus,
        verificationStatus: candidate.source.verificationStatus,
        createdAt: new Date(candidate.createdAt),
        updatedAt: new Date(candidate.updatedAt),
        payloadJson: payload,
      });

      // 4. Insert version 1
      await tx.insert(jurisprudenceRecordVersions).values({
        recordId: candidate.id,
        version: candidate.recordVersion,
        changeKind: "created",
        recordedAt: new Date(candidate.updatedAt),
        snapshotJson: payload,
      });

      // 5. Insert idempotency
      await tx.insert(jurisprudenceIdempotency).values({
        idempotencyKey: parsed.idempotencyKey,
        inputJson: inputJson,
        recordId: candidate.id,
        createdAt: new Date(candidate.createdAt),
      });

      return cloneJurisprudenceRecord(candidate);
    });
  }

  async update(input: JurisprudenceUpdateInput): Promise<JurisprudenceRecord> {
    this.assertOpen();
    const parsed = jurisprudenceUpdateInputSchema.parse(input);
    const db = getJurisprudenceInternalWriteDatabase();

    return await withJurisprudenceInternalWriteRole(db, async (tx) => {
      // 1. Lock row FOR UPDATE to ensure safe concurrency
      const lockRows = await tx.execute(
        sql`SELECT id, record_version AS "recordVersion", created_at AS "createdAt", updated_at AS "updatedAt" FROM jurisprudence_internal.jurisprudence_records WHERE id = ${parsed.id} FOR UPDATE`
      );

      if (lockRows.length === 0) {
        throw new JurisprudenceRepositoryError("NOT_FOUND", "No existe el registro jurisprudencial solicitado.", { recordId: parsed.id });
      }

      const current = lockRows[0] as { id: string; recordVersion: number; createdAt: Date | string; updatedAt: Date | string; };

      // Validate optimistic version
      if (current.recordVersion !== parsed.expectedVersion) {
        throw new JurisprudenceRepositoryError("VERSION_CONFLICT", "La versión esperada no coincide con la versión persistida.", { recordId: parsed.id, expectedVersion: parsed.expectedVersion, actualVersion: current.recordVersion });
      }

      const nextVersion = current.recordVersion + 1;
      const candidate = validateJurisprudenceRecordForPersistence({
        ...cloneJurisprudenceNewRecord(parsed.record),
        id: current.id,
        recordVersion: nextVersion,
        createdAt: normalizeJurisprudenceTimestamp(current.createdAt),
        updatedAt: nextRepositoryTimestamp(this.dependencies.now(), normalizeJurisprudenceTimestamp(current.updatedAt)),
      });

      const key = buildJurisprudenceDeduplicationKey(getJurisprudenceExternalIdentity(candidate));
      const normalized = normalizeJurisprudenceExternalIdentity(getJurisprudenceExternalIdentity(candidate));

      // Uniqueness backstops
      const dupRows = await tx.select({ id: jurisprudenceRecords.id }).from(jurisprudenceRecords).where(and(eq(jurisprudenceRecords.deduplicationKey, key), sql`${jurisprudenceRecords.id} <> ${candidate.id}`)).limit(1);
      if (dupRows.length > 0) throw new JurisprudenceRepositoryError("DUPLICATE_CONFLICT", "La actualización colisiona con otra identidad externa.", { recordId: candidate.id, deduplicationKey: key });

      if (candidate.slug) {
        const slugRows = await tx.select({ id: jurisprudenceRecords.id }).from(jurisprudenceRecords).where(and(eq(jurisprudenceRecords.slug, candidate.slug), sql`${jurisprudenceRecords.id} <> ${candidate.id}`)).limit(1);
        if (slugRows.length > 0) throw new JurisprudenceRepositoryError("DUPLICATE_CONFLICT", "La actualización colisiona con otro slug.", { recordId: candidate.id });
      }

      const payload = JSON.parse(JSON.stringify(candidate));

      const updateResult = await tx.update(jurisprudenceRecords).set({
        slug: candidate.slug,
        recordVersion: candidate.recordVersion,
        deduplicationKey: key,
        sourceType: candidate.source.type,
        sourceDocumentId: normalized.sourceDocumentId,
        normalizedCaseNumber: normalized.caseNumber,
        normalizedResolutionNumber: normalized.resolutionNumber,
        institutionId: normalized.institutionId,
        normalizedMatter: normalizeSqlText(candidate.matter),
        normalizedSearchText: normalizeSqlText(candidate.search.normalizedSearchText),
        issuedAt: candidate.issuedAt,
        editorialStatus: candidate.editorialStatus,
        publicationStatus: candidate.publicationStatus,
        verificationStatus: candidate.source.verificationStatus,
        updatedAt: new Date(candidate.updatedAt),
        payloadJson: payload,
      }).where(and(
        eq(jurisprudenceRecords.id, candidate.id),
        eq(jurisprudenceRecords.recordVersion, parsed.expectedVersion)
      ));

      // Just in case, though row lock prevents this
      if (updateResult.count !== 1) {
        throw new JurisprudenceRepositoryError("VERSION_CONFLICT", "La versión cambió durante la actualización.", { recordId: candidate.id, expectedVersion: parsed.expectedVersion });
      }

      await tx.insert(jurisprudenceRecordVersions).values({
        recordId: candidate.id,
        version: candidate.recordVersion,
        changeKind: parsed.changeKind,
        recordedAt: new Date(candidate.updatedAt),
        snapshotJson: payload,
      });

      return cloneJurisprudenceRecord(candidate);
    });
  }

  async list(input: JurisprudenceRepositoryListInput = {}): Promise<JurisprudenceRepositoryPage> {
    this.assertOpen();
    return this.executeQuery(input);
  }

  async search(input: JurisprudenceRepositorySearchInput): Promise<JurisprudenceRepositoryPage> {
    this.assertOpen();
    return this.executeQuery(input);
  }

  private async executeQuery(input: JurisprudenceRepositoryListInput | JurisprudenceRepositorySearchInput): Promise<JurisprudenceRepositoryPage> {
    const query = normalizeJurisprudenceRepositoryQuery(input);
    const db = getJurisprudenceInternalWriteDatabase();
    return await withJurisprudenceInternalWriteRole(db, async (tx) => {
      const conditions = [];

      if (query.filters.caseNumber) conditions.push(eq(jurisprudenceRecords.normalizedCaseNumber, normalizeSqlText(query.filters.caseNumber)));
      if (query.filters.resolutionNumber) conditions.push(eq(jurisprudenceRecords.normalizedResolutionNumber, normalizeSqlText(query.filters.resolutionNumber)));
      if (query.filters.institutionId) conditions.push(eq(jurisprudenceRecords.institutionId, normalizeSqlText(query.filters.institutionId)));
      if (query.filters.matter) conditions.push(eq(jurisprudenceRecords.normalizedMatter, normalizeSqlText(query.filters.matter)));
      if (query.filters.editorialStatus) conditions.push(eq(jurisprudenceRecords.editorialStatus, query.filters.editorialStatus));
      if (query.filters.publicationStatus) conditions.push(eq(jurisprudenceRecords.publicationStatus, query.filters.publicationStatus));
      if (query.filters.verificationStatus) conditions.push(eq(jurisprudenceRecords.verificationStatus, query.filters.verificationStatus));

      // In PG we compare dates directly if it's date-only, but issuedAt is date column so string works.
      if (query.filters.issuedFrom) conditions.push(sql`${jurisprudenceRecords.issuedAt} >= ${query.filters.issuedFrom}`);
      if (query.filters.issuedTo) conditions.push(sql`${jurisprudenceRecords.issuedAt} <= ${query.filters.issuedTo}`);

      if (query.q) {
        conditions.push(sql`${jurisprudenceRecords.normalizedSearchText} LIKE ${`%${escapeLike(query.q)}%`} ESCAPE '\\'`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const orderClauses = [];
      if (query.sort === "issued_at_asc") orderClauses.push(asc(jurisprudenceRecords.issuedAt), asc(jurisprudenceRecords.id));
      if (query.sort === "issued_at_desc") orderClauses.push(desc(jurisprudenceRecords.issuedAt), asc(jurisprudenceRecords.id));
      if (query.sort === "updated_at_asc") orderClauses.push(asc(jurisprudenceRecords.updatedAt), asc(jurisprudenceRecords.id));
      if (query.sort === "updated_at_desc") orderClauses.push(desc(jurisprudenceRecords.updatedAt), asc(jurisprudenceRecords.id));

      const offset = (query.page - 1) * query.pageSize;

      const [totalResult, rows] = await Promise.all([
        tx.execute(sql`SELECT count(*) FROM jurisprudence_internal.jurisprudence_records ${whereClause ? sql`WHERE ${whereClause}` : sql``}`),
        tx.select({ payloadJson: jurisprudenceRecords.payloadJson, id: jurisprudenceRecords.id }).from(jurisprudenceRecords).where(whereClause).orderBy(...orderClauses).limit(query.pageSize).offset(offset),
      ]);

      const total = parseInt(totalResult[0]?.count as string, 10) || 0;

      return {
        items: rows.map(r => this.mapToRecord(r.payloadJson, r.id)),
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
        sort: query.sort,
      };
    });
  }

  async count(filters: JurisprudenceRepositoryFilters = {}): Promise<number> {
    this.assertOpen();
    const result = await this.executeQuery({ filters, page: 1, pageSize: 1 });
    return result.total;
  }

  async existsByExternalIdentity(identity: JurisprudenceExternalIdentity): Promise<boolean> {
    this.assertOpen();
    const record = await this.findByExternalIdentity(identity);
    return record !== null;
  }

  async getVersionHistory(id: string): Promise<readonly JurisprudenceVersionEntry[]> {
    this.assertOpen();
    const db = getJurisprudenceInternalWriteDatabase();
    return await withJurisprudenceInternalWriteRole(db, async (tx) => {
      const recordExists = await tx.select({ id: jurisprudenceRecords.id }).from(jurisprudenceRecords).where(eq(jurisprudenceRecords.id, id)).limit(1);
      if (recordExists.length === 0) throw new JurisprudenceRepositoryError("NOT_FOUND", "No existe el registro jurisprudencial solicitado.", { recordId: id });

      const rows = await tx.select().from(jurisprudenceRecordVersions).where(eq(jurisprudenceRecordVersions.recordId, id)).orderBy(asc(jurisprudenceRecordVersions.version));

      return rows.map(row => {
        const snapshot = this.mapToRecord(row.snapshotJson, id);
        return {
          recordId: row.recordId,
          version: row.version,
          changeKind: row.changeKind as JurisprudenceVersionChangeKind,
          recordedAt: normalizeJurisprudenceTimestamp(row.recordedAt),
          snapshot,
        };
      });
    });
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    // We don't close the global Postgres connection pool here, as it's shared across the app lifecycle
    // unlike SQLite which is local file-based.
  }

  private mapToRecord(payload: unknown, recordId: string): JurisprudenceRecord {
    const parsed = jurisprudenceRecordSchema.safeParse(payload);
    if (!parsed.success) throw new JurisprudenceRepositoryError("PERSISTENCE_ERROR", "El registro persistido no cumple el contrato canónico.", { recordId });
    return cloneJurisprudenceRecord(parsed.data as JurisprudenceRecord);
  }

  /**
   * For testing ONLY: DANGER
   */
  async clearForTests(): Promise<void> {
    const db = getJurisprudenceInternalWriteDatabase();
    await withJurisprudenceInternalWriteRole(db, async (tx) => {
      await tx.execute(sql`DELETE FROM jurisprudence_internal.jurisprudence_idempotency`);
      await tx.execute(sql`DELETE FROM jurisprudence_internal.jurisprudence_record_versions`);
      await tx.execute(sql`DELETE FROM jurisprudence_internal.jurisprudence_records`);
    });
  }
}
