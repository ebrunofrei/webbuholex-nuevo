import { sql, eq } from "drizzle-orm";
import { getJurisprudencePublicWriteDatabase } from "@/database/client";
import { withJurisprudencePublicWriteRole } from "@/database/roles";
import {
  jurisprudencePublishedRecords,
  jurisprudencePublicProjectionBarriers,
} from "@/database/schema/jurisprudence";
import type {
  JurisprudencePublicProjectionRecord,
  JurisprudencePublicProjectionWriter,
  PublicProjectionMutationResult,
} from "@/types/jurisprudence-public-projection-writer";

type Tx = Parameters<Parameters<typeof withJurisprudencePublicWriteRole>[1]>[0];

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

  private evaluateIncomingStatus(
    incomingRecordVersion: number,
    incomingExecutionVersion: number,
    incomingState: "published" | "withdrawn",
    storedRecordVersion: number,
    storedExecutionVersion: number,
    storedState: "published" | "withdrawn"
  ): PublicProjectionMutationResult {
    if (incomingRecordVersion < storedRecordVersion) {
      return "STALE";
    }

    if (incomingRecordVersion === storedRecordVersion) {
      if (incomingExecutionVersion < storedExecutionVersion) {
        return "STALE";
      }

      if (incomingExecutionVersion === storedExecutionVersion) {
        if (incomingState === storedState) {
          return "IDEMPOTENT";
        }

        if (incomingState === "published" && storedState === "withdrawn") {
          return "STALE";
        }

        if (incomingState === "withdrawn" && storedState === "published") {
          return "APPLIED";
        }
      }
    }

    return "APPLIED";
  }

  private async acquireAndEvaluateBarrier(
    tx: Tx,
    recordId: string,
    incomingRecordVersion: number,
    incomingExecutionVersion: number,
    incomingState: "published" | "withdrawn"
  ): Promise<{ status: PublicProjectionMutationResult; isNew: boolean }> {
    let [barrier] = await tx
      .select()
      .from(jurisprudencePublicProjectionBarriers)
      .where(eq(jurisprudencePublicProjectionBarriers.recordId, recordId))
      .for("update");

    if (!barrier) {
      const inserted = await tx
        .insert(jurisprudencePublicProjectionBarriers)
        .values({
          recordId,
          recordVersion: incomingRecordVersion,
          executionVersion: incomingExecutionVersion,
          projectionState: incomingState,
        })
        .onConflictDoNothing()
        .returning();

      if (inserted.length === 0) {
        const [rereadBarrier] = await tx
          .select()
          .from(jurisprudencePublicProjectionBarriers)
          .where(eq(jurisprudencePublicProjectionBarriers.recordId, recordId))
          .for("update");

        if (!rereadBarrier) {
           throw new Error("Concurrency failure: Barrier row expected but not found after conflicting insert.");
        }
        barrier = rereadBarrier;
      } else {
        return { status: "APPLIED", isNew: true };
      }
    }

    const status = this.evaluateIncomingStatus(
      incomingRecordVersion,
      incomingExecutionVersion,
      incomingState,
      barrier.recordVersion,
      barrier.executionVersion,
      barrier.projectionState as "published" | "withdrawn"
    );

    return { status, isNew: false };
  }

  private async updateBarrier(
    tx: Tx,
    recordId: string,
    recordVersion: number,
    executionVersion: number,
    projectionState: "published" | "withdrawn"
  ): Promise<void> {
    await tx
      .update(jurisprudencePublicProjectionBarriers)
      .set({
        recordVersion,
        executionVersion,
        projectionState,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(jurisprudencePublicProjectionBarriers.recordId, recordId));
  }

  async upsert(record: JurisprudencePublicProjectionRecord, executionVersion: number): Promise<PublicProjectionMutationResult> {
    const db = getJurisprudencePublicWriteDatabase();

    return await withJurisprudencePublicWriteRole(db, async (tx) => {
      const { status, isNew } = await this.acquireAndEvaluateBarrier(
        tx as Tx,
        record.id,
        record.recordVersion,
        executionVersion,
        "published"
      );

      if (status === "STALE" || status === "IDEMPOTENT") {
        return status;
      }

      if (!isNew) {
        await this.updateBarrier(tx as Tx, record.id, record.recordVersion, executionVersion, "published");
      }

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
        });

      return "APPLIED";
    });
  }

  async removeById(recordId: string, recordVersion: number, executionVersion: number): Promise<PublicProjectionMutationResult> {
    const db = getJurisprudencePublicWriteDatabase();

    return await withJurisprudencePublicWriteRole(db, async (tx) => {
      const { status, isNew } = await this.acquireAndEvaluateBarrier(
        tx as Tx,
        recordId,
        recordVersion,
        executionVersion,
        "withdrawn"
      );

      if (status === "STALE" || status === "IDEMPOTENT") {
        return status;
      }

      if (!isNew) {
        await this.updateBarrier(tx as Tx, recordId, recordVersion, executionVersion, "withdrawn");
      }

      await tx
        .delete(jurisprudencePublishedRecords)
        .where(eq(jurisprudencePublishedRecords.id, recordId));

      return "APPLIED";
    });
  }
}
