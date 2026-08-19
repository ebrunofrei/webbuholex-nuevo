import { eq, and } from "drizzle-orm";
import { jurisprudenceRecordVersions } from "@/database/schema/jurisprudence";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { JurisprudencePublicationSourceReader, JurisprudencePublicationSourceReaderQuery } from "@/types/jurisprudence-publication-source-reader";
import type { JurisprudenceProjectionSourceRecord } from "@/types/jurisprudence-publication-execution";
import type { JurisprudenceInternalRecordDto } from "@/types/jurisprudence-application";
import { withJurisprudenceInternalReadRole } from "@/database/roles/with-jurisprudence-internal-read-role";

export class PostgresJurisprudencePublicationSourceReader implements JurisprudencePublicationSourceReader {
  readonly #db: PostgresJsDatabase<Record<string, never>>;

  constructor(db: PostgresJsDatabase<Record<string, never>>) {
    this.#db = db;
  }

  async getPublicationSource(query: JurisprudencePublicationSourceReaderQuery): Promise<JurisprudenceProjectionSourceRecord | null> {
    return await withJurisprudenceInternalReadRole(this.#db, async (tx) => {
      const rows = await tx.select()
        .from(jurisprudenceRecordVersions)
        .where(and(
          eq(jurisprudenceRecordVersions.recordId, query.recordId),
          eq(jurisprudenceRecordVersions.version, query.recordVersion)
        ))
        .limit(1);

      if (rows.length === 0) return null;

      const snapshot = rows[0]!.snapshotJson as unknown as JurisprudenceInternalRecordDto;

      return {
      id: snapshot.id,
      recordVersion: snapshot.recordVersion,
      slug: snapshot.slug,
      caseNumber: snapshot.caseNumber,
      resolutionNumber: snapshot.resolutionNumber,
      resolutionType: snapshot.resolutionType,
      institutionName: snapshot.institutionName,
      issuingBody: snapshot.issuingBody,
      matter: snapshot.matter,
      issuedAt: snapshot.issuedAt,
      editorialContent: snapshot.editorialContent,
      officialContent: snapshot.officialContent,
      source: snapshot.source,
    };
    });
  }
}
