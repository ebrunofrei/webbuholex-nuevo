import { sql, eq, and, or, asc, lte, getTableColumns } from "drizzle-orm";
import { getJurisprudenceOutboxDatabase } from "@/database/client";
import { withJurisprudencePublicationOutboxRole } from "@/database/roles";
import { jurisprudencePublicationOutbox } from "@/database/schema/jurisprudence";
import type {
  JurisprudencePublicationOutboxClaim,
  JurisprudencePublicationOutboxProcessorRepository,
} from "@/types/jurisprudence-publication-outbox-processor";
import { JURISPRUDENCE_OUTBOX_PROCESSING_STALE_MS } from "./jurisprudence-publication-outbox-policy";

export class PostgresJurisprudencePublicationOutboxProcessorRepository
  implements JurisprudencePublicationOutboxProcessorRepository
{
  async findById(id: string): Promise<JurisprudencePublicationOutboxClaim | null> {
    const db = getJurisprudenceOutboxDatabase();

    return await withJurisprudencePublicationOutboxRole(db, async (tx) => {
      const [row] = await tx
        .select()
        .from(jurisprudencePublicationOutbox)
        .where(eq(jurisprudencePublicationOutbox.id, id));

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        recordId: row.recordId,
        recordVersion: row.recordVersion,
        executionId: row.executionId,
        executionVersion: row.executionVersion,
        eventType: row.eventType as "publish_projection" | "withdraw_projection",
        payload: row.payload,
        status: row.status as "pending" | "processing" | "sent" | "failed" | "dead_letter",
        attempts: row.attempts,
        availableAt: row.availableAt,
        processingStartedAt: row.processingStartedAt,
      };
    });
  }

  async claimNext(now: Date): Promise<JurisprudencePublicationOutboxClaim | null> {
    const db = getJurisprudenceOutboxDatabase();

    return await withJurisprudencePublicationOutboxRole(db, async (tx) => {
      const staleCutoff = new Date(now.getTime() - JURISPRUDENCE_OUTBOX_PROCESSING_STALE_MS);

      const claimableCondition = or(
        eq(jurisprudencePublicationOutbox.status, "pending"),
        and(
          eq(jurisprudencePublicationOutbox.status, "failed"),
          lte(jurisprudencePublicationOutbox.availableAt, now)
        ),
        and(
          eq(jurisprudencePublicationOutbox.status, "processing"),
          lte(jurisprudencePublicationOutbox.processingStartedAt, staleCutoff)
        )
      );

      const columns = getTableColumns(jurisprudencePublicationOutbox);

      const cte = tx
        .select({ id: jurisprudencePublicationOutbox.id })
        .from(jurisprudencePublicationOutbox)
        .where(claimableCondition)
        .orderBy(
          sql`CASE WHEN ${jurisprudencePublicationOutbox.eventType} = 'withdraw_projection' THEN 1 ELSE 2 END`,
          asc(jurisprudencePublicationOutbox.availableAt),
          asc(jurisprudencePublicationOutbox.createdAt)
        )
        .limit(1)
        .for("update", { skipLocked: true });

      const [claimed] = await tx
        .update(jurisprudencePublicationOutbox)
        .set({
          status: "processing",
          attempts: sql`${jurisprudencePublicationOutbox.attempts} + 1`,
          processingStartedAt: now,
          updatedAt: now,
        })
        .where(
          eq(
            jurisprudencePublicationOutbox.id,
            sql`(${cte})`
          )
        )
        .returning(columns);

      if (!claimed) {
        return null;
      }

      return {
        id: claimed.id,
        recordId: claimed.recordId,
        recordVersion: claimed.recordVersion,
        executionId: claimed.executionId,
        executionVersion: claimed.executionVersion,
        eventType: claimed.eventType,
        payload: claimed.payload,
        status: "processing",
        attempts: claimed.attempts,
        availableAt: claimed.availableAt,
        processingStartedAt: claimed.processingStartedAt,
      };
    });
  }

  async markSent(id: string, processedAt: Date): Promise<void> {
    const db = getJurisprudenceOutboxDatabase();

    await withJurisprudencePublicationOutboxRole(db, async (tx) => {
      await tx
        .update(jurisprudencePublicationOutbox)
        .set({
          status: "sent",
          processedAt,
          processingStartedAt: null,
          lastErrorCode: null,
          updatedAt: processedAt,
        })
        .where(
          and(
            eq(jurisprudencePublicationOutbox.id, id),
            eq(jurisprudencePublicationOutbox.status, "processing")
          )
        );
    });
  }

  async markFailed(
    id: string,
    availableAt: Date,
    errorCode: string,
    updatedAt: Date
  ): Promise<void> {
    const db = getJurisprudenceOutboxDatabase();

    await withJurisprudencePublicationOutboxRole(db, async (tx) => {
      await tx
        .update(jurisprudencePublicationOutbox)
        .set({
          status: "failed",
          availableAt,
          processingStartedAt: null,
          processedAt: null,
          lastErrorCode: errorCode,
          updatedAt,
        })
        .where(
          and(
            eq(jurisprudencePublicationOutbox.id, id),
            eq(jurisprudencePublicationOutbox.status, "processing")
          )
        );
    });
  }

  async markDeadLetter(id: string, errorCode: string, processedAt: Date): Promise<void> {
    const db = getJurisprudenceOutboxDatabase();

    await withJurisprudencePublicationOutboxRole(db, async (tx) => {
      await tx
        .update(jurisprudencePublicationOutbox)
        .set({
          status: "dead_letter",
          processedAt,
          processingStartedAt: null,
          lastErrorCode: errorCode,
          updatedAt: processedAt,
        })
        .where(
          and(
            eq(jurisprudencePublicationOutbox.id, id),
            eq(jurisprudencePublicationOutbox.status, "processing")
          )
        );
    });
  }
}
