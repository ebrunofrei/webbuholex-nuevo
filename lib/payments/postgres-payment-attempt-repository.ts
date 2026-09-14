import { eq, desc, and, or, isNull } from "drizzle-orm";
import { PaymentDbExecutor } from "./postgres-db-executor";
import type { PaymentAttemptRepository } from "./payment-repositories";
import type { PaymentAttempt, PaymentAttemptStatus, PaymentAttemptFailureCategory } from "../schemas/payments";
import { paymentAttempts } from "../../database/schema/payments";
import { paymentAttemptSchema } from "../schemas/payments";
import { PaymentAttemptProviderPaymentIdConflictError } from "./payment-errors";

export class PostgresPaymentAttemptRepository implements PaymentAttemptRepository {
  constructor(
    private readonly db: PaymentDbExecutor
  ) {}

  private mapRowToAttempt(row: typeof paymentAttempts.$inferSelect): PaymentAttempt {
    return paymentAttemptSchema.parse({
      id: row.id,
      paymentOrderId: row.paymentOrderId,
      attemptNumber: row.attemptNumber,
      operationKey: row.operationKey,
      provider: row.provider,
      paymentMethod: row.paymentMethod,
      providerPaymentId: row.providerPaymentId,
      status: row.status,
      failureCategory: row.failureCategory,
      failureCode: row.failureCode,
      createdAt: row.createdAt,
      startedAt: row.startedAt,
      succeededAt: row.succeededAt,
      failedAt: row.failedAt,
      cancelledAt: row.cancelledAt,
      indeterminateAt: row.indeterminateAt,
      updatedAt: row.updatedAt,
    });
  }

  async findById(id: string): Promise<PaymentAttempt | null> {
    const result = await this.db
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapRowToAttempt(result[0]!);
  }

  async findByOperationKey(operationKey: string): Promise<PaymentAttempt | null> {
    const result = await this.db
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.operationKey, operationKey))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapRowToAttempt(result[0]!);
  }

  async listByPaymentOrderId(orderId: string): Promise<PaymentAttempt[]> {
    const results = await this.db
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.paymentOrderId, orderId))
      .orderBy(desc(paymentAttempts.attemptNumber));

    return results.map((row) => this.mapRowToAttempt(row));
  }

  async findLatestByPaymentOrderId(orderId: string): Promise<PaymentAttempt | null> {
    const result = await this.db
      .select()
      .from(paymentAttempts)
      .where(eq(paymentAttempts.paymentOrderId, orderId))
      .orderBy(desc(paymentAttempts.attemptNumber))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapRowToAttempt(result[0]!);
  }

  async insert(attempt: PaymentAttempt): Promise<void> {
    await this.db.insert(paymentAttempts).values({
      id: attempt.id,
      paymentOrderId: attempt.paymentOrderId,
      attemptNumber: attempt.attemptNumber,
      operationKey: attempt.operationKey,
      provider: attempt.provider,
      paymentMethod: attempt.paymentMethod,
      providerPaymentId: attempt.providerPaymentId,
      status: attempt.status,
      failureCategory: attempt.failureCategory,
      failureCode: attempt.failureCode,
      createdAt: attempt.createdAt,
      startedAt: attempt.startedAt,
      succeededAt: attempt.succeededAt,
      failedAt: attempt.failedAt,
      cancelledAt: attempt.cancelledAt,
      indeterminateAt: attempt.indeterminateAt,
      updatedAt: attempt.updatedAt,
    });
  }

  async assignProviderPaymentId(
    id: string,
    providerPaymentId: string,
    timestamp: Date
  ): Promise<void> {
    const result = await this.db
      .update(paymentAttempts)
      .set({
        providerPaymentId,
        updatedAt: timestamp,
      })
      .where(
        and(
          eq(paymentAttempts.id, id),
          or(
            isNull(paymentAttempts.providerPaymentId),
            eq(paymentAttempts.providerPaymentId, providerPaymentId)
          )
        )
      )
      .returning({ id: paymentAttempts.id });

    if (result.length > 0) {
      return; // success or idempotent
    }

    const attempt = await this.findById(id);
    if (!attempt) {
      // following standard repository pattern, though wait, we just return if not found normally?
      // actually, the repo contract doesn't specify throws for not found. but we can just return or throw.
      // usually, if not found, we just return silently as it's a void function for update.
      return;
    }

    if (attempt.providerPaymentId && attempt.providerPaymentId !== providerPaymentId) {
      throw new PaymentAttemptProviderPaymentIdConflictError(
        `Cannot overwrite providerPaymentId for attempt ${id}`
      );
    }
  }

  async transitionStatus(
    id: string,
    newStatus: PaymentAttemptStatus,
    timestamp: Date,
    details?: {
      failureCategory?: PaymentAttemptFailureCategory | null;
      failureCode?: string | null;
    }
  ): Promise<void> {
    const values: Partial<typeof paymentAttempts.$inferInsert> = {
      status: newStatus,
      updatedAt: timestamp,
    };

    if (details) {
      if (details.failureCategory !== undefined) values.failureCategory = details.failureCategory;
      if (details.failureCode !== undefined) values.failureCode = details.failureCode;
    }

    switch (newStatus) {
      case "processing":
        values.startedAt = timestamp;
        break;
      case "succeeded":
        values.succeededAt = timestamp;
        break;
      case "failed":
        values.failedAt = timestamp;
        break;
      case "cancelled":
        values.cancelledAt = timestamp;
        break;
      case "indeterminate":
        values.indeterminateAt = timestamp;
        break;
    }

    await this.db
      .update(paymentAttempts)
      .set(values)
      .where(eq(paymentAttempts.id, id));
  }

  async transitionStatusFromProcessing(
    id: string,
    newStatus: PaymentAttemptStatus,
    timestamp: Date,
    details?: {
      failureCategory?: PaymentAttemptFailureCategory | null;
      failureCode?: string | null;
    }
  ): Promise<boolean> {
    const values: Partial<typeof paymentAttempts.$inferInsert> = {
      status: newStatus,
      updatedAt: timestamp,
    };

    if (details) {
      if (details.failureCategory !== undefined) values.failureCategory = details.failureCategory;
      if (details.failureCode !== undefined) values.failureCode = details.failureCode;
    }

    switch (newStatus) {
      case "succeeded":
        values.succeededAt = timestamp;
        break;
      case "failed":
        values.failedAt = timestamp;
        break;
      case "indeterminate":
        values.indeterminateAt = timestamp;
        break;
    }

    const result = await this.db
      .update(paymentAttempts)
      .set(values)
      .where(
        and(
          eq(paymentAttempts.id, id),
          eq(paymentAttempts.status, "processing")
        )
      )
      .returning({ id: paymentAttempts.id });

    return result.length > 0;
  }

  async claimAttempt(id: string, now: Date): Promise<boolean> {
    const result = await this.db
      .update(paymentAttempts)
      .set({
        status: "processing",
        startedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(paymentAttempts.id, id),
          eq(paymentAttempts.status, "created")
        )
      )
      .returning({ id: paymentAttempts.id });

    return result.length > 0;
  }
}
