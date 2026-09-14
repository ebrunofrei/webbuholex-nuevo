import { eq, and, sql } from "drizzle-orm";
import { PaymentCheckoutSession } from "../schemas/payments";
import { paymentCheckoutSessions } from "../../database/schema/payments";
import { PaymentCheckoutSessionRepository } from "./payment-repositories";

export class PostgresPaymentCheckoutSessionRepository implements PaymentCheckoutSessionRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private tx: any) {}

  async findActiveByPaymentOrderIdForUpdate(paymentOrderId: string): Promise<PaymentCheckoutSession | null> {
    const result = await this.tx
      .select()
      .from(paymentCheckoutSessions)
      .where(and(
        eq(paymentCheckoutSessions.paymentOrderId, paymentOrderId),
        eq(paymentCheckoutSessions.status, "active")
      ))
      .for("update")
      .limit(1);

    if (result.length === 0) return null;

    return this.mapToDomain(result[0]);
  }

  async findByTokenHash(tokenHash: string): Promise<PaymentCheckoutSession | null> {
    const result = await this.tx
      .select()
      .from(paymentCheckoutSessions)
      .where(eq(paymentCheckoutSessions.tokenHash, tokenHash))
      .limit(1);

    if (result.length === 0) return null;

    return this.mapToDomain(result[0]);
  }

  async insert(session: PaymentCheckoutSession): Promise<void> {
    await this.tx
      .insert(paymentCheckoutSessions)
      .values({
        id: session.id,
        paymentOrderId: session.paymentOrderId,
        tokenHash: session.tokenHash,
        status: session.status,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        revokedAt: session.revokedAt,
        expiredAt: session.expiredAt,
      });
  }

  async revoke(id: string, now: Date): Promise<void> {
    await this.tx
      .update(paymentCheckoutSessions)
      .set({
        status: "revoked",
        revokedAt: now,
      })
      .where(and(
        eq(paymentCheckoutSessions.id, id),
        eq(paymentCheckoutSessions.status, "active")
      ));
  }

  async markExpired(id: string, now: Date): Promise<void> {
    await this.tx
      .update(paymentCheckoutSessions)
      .set({
        status: "expired",
        expiredAt: now,
      })
      .where(and(
        eq(paymentCheckoutSessions.id, id),
        eq(paymentCheckoutSessions.status, "active")
      ));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToDomain(row: any): PaymentCheckoutSession {
    return {
      id: row.id,
      paymentOrderId: row.paymentOrderId,
      tokenHash: row.tokenHash,
      status: row.status as PaymentCheckoutSession["status"],
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
      expiredAt: row.expiredAt,
    };
  }
}
