import { eq, and } from "drizzle-orm";
import { jurisprudenceRecordVersions } from "@/database/schema/jurisprudence";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { JurisprudencePublicationSourceReader, JurisprudencePublicationSourceReaderQuery } from "@/types/jurisprudence-publication-source-reader";
import type { JurisprudenceProjectionSourceRecord } from "@/types/jurisprudence-publication-execution";
import { withJurisprudenceInternalReadRole } from "@/database/roles/with-jurisprudence-internal-read-role";
import { jurisprudenceRecordSchema } from "@/lib/schemas/jurisprudence";
import { JurisprudenceRepositoryError } from "@/lib/jurisprudence-repository-error";

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

      const parseResult = jurisprudenceRecordSchema.safeParse(rows[0]!.snapshotJson);
      if (!parseResult.success) {
        throw new JurisprudenceRepositoryError(
          "VALIDATION_ERROR",
          "El snapshot recuperado no cumple el contrato canónico.",
          { cause: parseResult.error.message }
        );
      }

      const snapshot = parseResult.data;

      return {
        id: snapshot.id,
        recordVersion: snapshot.recordVersion,
        slug: snapshot.slug,
        caseNumber: snapshot.caseNumber,
        resolutionNumber: snapshot.resolutionNumber,
        resolutionType: snapshot.resolutionType,
        institutionName: snapshot.institution.name,
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
