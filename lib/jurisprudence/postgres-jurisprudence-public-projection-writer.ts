import { sql, eq } from "drizzle-orm";
import { getJurisprudencePublicWriteDatabase } from "@/database/client";
import { withJurisprudencePublicWriteRole } from "@/database/roles";
import { jurisprudencePublishedRecords } from "@/database/schema/jurisprudence";
import type {
  JurisprudencePublicProjectionRecord,
  JurisprudencePublicProjectionWriter,
} from "@/types/jurisprudence-public-projection-writer";

export class PostgresJurisprudencePublicProjectionWriter implements JurisprudencePublicProjectionWriter {
  private generateNormalizedSearchText(record: JurisprudencePublicProjectionRecord): string {
    const parts = [
      record.title,
      record.caseTitle,
      record.caseNumber,
      record.resolutionNumber,
      record.resolutionType,
      record.institutionName,
      record.issuingBody,
      record.matter,
      record.summary,
      record.sourceName,
    ];

    return parts
      .filter((p): p is string => p !== null && p !== undefined && p.trim() !== "")
      .join(" ")
      .trim()
      .replace(/\s+/g, " ");
  }

  async upsert(record: JurisprudencePublicProjectionRecord): Promise<void> {
    const db = getJurisprudencePublicWriteDatabase();

    await withJurisprudencePublicWriteRole(db, async (tx) => {
      const normalizedSearchText = this.generateNormalizedSearchText(record);

      await tx
        .insert(jurisprudencePublishedRecords)
        .values({
          id: record.id,
          recordVersion: record.recordVersion,
          slug: record.slug,
          title: record.title,
          caseTitle: record.caseTitle,
          caseNumber: record.caseNumber,
          resolutionNumber: record.resolutionNumber,
          resolutionType: record.resolutionType,
          institutionName: record.institutionName,
          issuingBody: record.issuingBody,
          matter: record.matter,
          issuedAt: record.issuedAt,
          summary: record.summary,
          sourceName: record.sourceName,
          normalizedSearchText,
        })
        .onConflictDoUpdate({
          target: jurisprudencePublishedRecords.id,
          set: {
            recordVersion: record.recordVersion,
            slug: record.slug,
            title: record.title,
            caseTitle: record.caseTitle,
            caseNumber: record.caseNumber,
            resolutionNumber: record.resolutionNumber,
            resolutionType: record.resolutionType,
            institutionName: record.institutionName,
            issuingBody: record.issuingBody,
            matter: record.matter,
            issuedAt: record.issuedAt,
            summary: record.summary,
            sourceName: record.sourceName,
            normalizedSearchText,
          },
          where: sql`${jurisprudencePublishedRecords.recordVersion} <= ${record.recordVersion}`,
        });
    });
  }

  async removeById(recordId: string): Promise<void> {
    const db = getJurisprudencePublicWriteDatabase();

    await withJurisprudencePublicWriteRole(db, async (tx) => {
      await tx
        .delete(jurisprudencePublishedRecords)
        .where(eq(jurisprudencePublishedRecords.id, recordId));
    });
  }
}
