import { UnitOfWork } from "./payment-repositories";
import { PaymentOrderNotFoundError } from "./payment-service";
import { PaymentCheckoutSession } from "../schemas/payments";
import { v4 as uuidv4 } from "uuid";
import {
  CHECKOUT_SESSION_TTL_MINUTES,
  generateCheckoutToken,
  hashCheckoutToken,
  isValidCheckoutTokenFormat,
} from "./payment-checkout-session";

export class PaymentOrderNotEligibleForCheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentOrderNotEligibleForCheckoutError";
  }
}

export class InvalidCheckoutTokenFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCheckoutTokenFormatError";
  }
}

export class CheckoutSessionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutSessionNotFoundError";
  }
}

export class CheckoutSessionExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutSessionExpiredError";
  }
}

export class CheckoutSessionRevokedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutSessionRevokedError";
  }
}

export interface CreateCheckoutSessionResult {
  sessionId: string;
  token: string; // Plaintext token returned exactly once
  expiresAt: Date;
}

export interface ResolvedCheckoutSessionDTO {
  serviceId: string;
  subOfferId: string | null;
  amountMinor: number;
  currency: "PEN";
  checkoutSessionExpiresAt: Date;
  paymentOrderExpiresAt: Date | null;
}

export class PaymentCheckoutSessionService {
  constructor(private uow: UnitOfWork) {}

  async createCheckoutSessionForPaymentOrder(
    orderId: string
  ): Promise<CreateCheckoutSessionResult> {
    return this.uow.execute(async (ctx) => {
      const now = new Date();

      // 1. load PaymentOrder FOR UPDATE
      const order = await ctx.orders.findByIdForUpdate(orderId);

      // 2. validate existence
      if (!order) {
        throw new PaymentOrderNotFoundError(orderId);
      }

      // 3. validate status awaiting_payment
      if (order.status !== "awaiting_payment") {
        throw new PaymentOrderNotEligibleForCheckoutError(`PaymentOrder is ${order.status}`);
      }

      // 4. validate order expiration
      if (order.expiresAt && order.expiresAt <= now) {
        throw new PaymentOrderNotEligibleForCheckoutError("PaymentOrder is expired");
      }

      // 5. locate current active checkout session
      const existingSession = await ctx.checkoutSessions.findActiveByPaymentOrderIdForUpdate(order.id);

      // 6. revoke it if present
      if (existingSession) {
        if (existingSession.expiresAt <= now) {
          // If it's already expired, mark it expired, not revoked, for clearer audit trail
          await ctx.checkoutSessions.markExpired(existingSession.id, now);
        } else {
          await ctx.checkoutSessions.revoke(existingSession.id, now);
        }
      }

      // 7. generate new token/hash
      const token = generateCheckoutToken();
      const tokenHash = hashCheckoutToken(token);

      // Determine TTL
      let expiresAt = new Date(now.getTime() + CHECKOUT_SESSION_TTL_MINUTES * 60000);

      if (order.expiresAt && order.expiresAt < expiresAt) {
        expiresAt = order.expiresAt;
      }

      const sessionId = uuidv4();

      const newSession: PaymentCheckoutSession = {
        id: sessionId,
        paymentOrderId: order.id,
        tokenHash,
        status: "active",
        expiresAt,
        createdAt: now,
        revokedAt: null,
        expiredAt: null,
      };

      // 8. insert new active session
      await ctx.checkoutSessions.insert(newSession);

      // 9. commit (happens automatically at end of uow)

      return {
        sessionId: newSession.id,
        token,
        expiresAt,
      };
    });
  }

  async resolveCheckoutSession(token: string): Promise<ResolvedCheckoutSessionDTO> {
    if (!isValidCheckoutTokenFormat(token)) {
      throw new InvalidCheckoutTokenFormatError("Invalid token format");
    }

    const tokenHash = hashCheckoutToken(token);

    return this.uow.execute(async (ctx) => {
      const now = new Date();
      const session = await ctx.checkoutSessions.findByTokenHash(tokenHash);

      if (!session) {
        throw new CheckoutSessionNotFoundError("Unknown session");
      }

      if (session.status === "revoked") {
        throw new CheckoutSessionRevokedError("Session revoked");
      }

      if (session.status === "expired") {
        throw new CheckoutSessionExpiredError("Session expired");
      }

      if (session.expiresAt <= now) {
        if (session.status === "active") {
           await ctx.checkoutSessions.markExpired(session.id, now);
        }
        throw new CheckoutSessionExpiredError("Session expired");
      }

      const order = await ctx.orders.findById(session.paymentOrderId);

      if (!order) {
        throw new PaymentOrderNotFoundError(session.paymentOrderId);
      }

      if (order.status !== "awaiting_payment") {
        throw new PaymentOrderNotEligibleForCheckoutError(`PaymentOrder is ${order.status}`);
      }

      if (order.expiresAt && order.expiresAt <= now) {
        throw new PaymentOrderNotEligibleForCheckoutError("PaymentOrder is expired");
      }

      return {
        serviceId: order.serviceId,
        subOfferId: order.subOfferId,
        amountMinor: order.amountMinor,
        currency: order.currency,
        checkoutSessionExpiresAt: session.expiresAt,
        paymentOrderExpiresAt: order.expiresAt,
      };
    });
  }
}
