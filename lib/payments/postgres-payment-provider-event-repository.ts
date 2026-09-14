import { eq, and } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PaymentProviderEventRepository } from "./payment-repositories";
import type { PaymentProviderEvent, PaymentProvider } from "../schemas/payments";
import { paymentProviderEvents } from "../../database/schema/payments";
import { paymentProviderEventSchema } from "../schemas/payments";

export class PostgresPaymentProviderEventRepository implements PaymentProviderEventRepository {
  constructor(
    private readonly db: PostgresJsDatabase<any> | PgTransaction<any, any, any>
  ) {}

  private mapRowToEvent(row: typeof paymentProviderEvents.$inferSelect): PaymentProviderEvent {
    return paymentProviderEventSchema.parse({
      id: row.id,
      provider: row.provider,
      providerEventId: row.providerEventId,
      deduplicationKey: row.deduplicationKey,
      providerObjectId: row.providerObjectId,
      paymentOrderId: row.paymentOrderId,
      paymentAttemptId: row.paymentAttemptId,
      eventType: row.eventType,
      payloadHash: row.payloadHash,
      status: row.status,
      receivedAt: row.receivedAt,
      processingStartedAt: row.processingStartedAt,
      processedAt: row.processedAt,
      failedAt: row.failedAt,
      failureCode: row.failureCode,
      createdAt: row.createdAt,
    });
  }

  async findById(id: string): Promise<PaymentProviderEvent | null> {
    const result = await this.db
      .select()
      .from(paymentProviderEvents)
      .where(eq(paymentProviderEvents.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapRowToEvent(result[0]!);
  }

  async findByProviderEventId(
    provider: PaymentProvider,
    providerEventId: string
  ): Promise<PaymentProviderEvent | null> {
    const result = await this.db
      .select()
      .from(paymentProviderEvents)
      .where(
        and(
          eq(paymentProviderEvents.provider, provider),
          eq(paymentProviderEvents.providerEventId, providerEventId)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapRowToEvent(result[0]!);
  }

  async findByDeduplicationKey(deduplicationKey: string): Promise<PaymentProviderEvent | null> {
    const result = await this.db
      .select()
      .from(paymentProviderEvents)
      .where(eq(paymentProviderEvents.deduplicationKey, deduplicationKey))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapRowToEvent(result[0]!);
  }

  async insertIdempotent(event: PaymentProviderEvent): Promise<"inserted" | "already_exists"> {
    try {
      await this.db.insert(paymentProviderEvents).values({
        id: event.id,
        provider: event.provider,
        providerEventId: event.providerEventId,
        deduplicationKey: event.deduplicationKey,
        providerObjectId: event.providerObjectId,
        paymentOrderId: event.paymentOrderId,
        paymentAttemptId: event.paymentAttemptId,
        eventType: event.eventType,
        payloadHash: event.payloadHash,
        status: event.status,
        receivedAt: event.receivedAt,
        processingStartedAt: event.processingStartedAt,
        processedAt: event.processedAt,
        failedAt: event.failedAt,
        failureCode: event.failureCode,
        createdAt: event.createdAt,
      });
      return "inserted";
    } catch (error: any) {
      if (error.code === "23505") {
        // Restrict idempotent success to the known deduplication constraints.
        // Drizzle creates 'payment_provider_events_deduplication_key_unique' for the .unique() column.
        // We named the partial unique index 'payment_provider_events_provider_event_id_idx'.
        const constraintName = error.constraint || "";
        if (
          constraintName === "payment_provider_events_deduplication_key_unique" ||
          constraintName === "payment_provider_events_provider_event_id_idx"
        ) {
          return "already_exists";
        }

        // If it's a 23505 on a different constraint (e.g. primary key), it's a real conflict,
        // or if constraint metadata is missing, we rethrow rather than masking as idempotent success.
        // This is a documented limitation: we rely on PostgreSQL providing the constraint name.
      }
      throw error;
    }
  }

  async markProcessing(id: string, now: Date): Promise<void> {
    await this.db
      .update(paymentProviderEvents)
      .set({ status: "processing", processingStartedAt: now })
      .where(eq(paymentProviderEvents.id, id));
  }

  async markProcessed(id: string, now: Date): Promise<void> {
    await this.db
      .update(paymentProviderEvents)
      .set({ status: "processed", processedAt: now })
      .where(eq(paymentProviderEvents.id, id));
  }

  async markFailed(id: string, failureCode: string | null, now: Date): Promise<void> {
    await this.db
      .update(paymentProviderEvents)
      .set({ status: "failed", failedAt: now, failureCode })
      .where(eq(paymentProviderEvents.id, id));
  }
}
