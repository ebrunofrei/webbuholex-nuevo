import "server-only";
import { getDatabase } from "../../database/client";
import { UnitOfWork, PaymentContext } from "./payment-repositories";
import { PostgresPaymentQuoteRepository } from "./postgres-payment-quote-repository";
import { PostgresPaymentOrderRepository } from "./postgres-payment-order-repository";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../database/schema";

export class PostgresPaymentUnitOfWork implements UnitOfWork {
  private db: PostgresJsDatabase<typeof schema>;

  constructor(db?: PostgresJsDatabase<typeof schema>) {
    this.db = db ?? getDatabase();
  }

  async execute<T>(work: (context: PaymentContext) => Promise<T>): Promise<T> {
    // db.transaction opens a real PostgreSQL transaction.
    // We pass the transactional executor (tx) to both repositories
    // so they share the exact same connection and transaction context.
    return this.db.transaction(async (tx) => {
      const context: PaymentContext = {
        quotes: new PostgresPaymentQuoteRepository(tx),
        orders: new PostgresPaymentOrderRepository(tx),
      };

      return work(context);
    });
  }
}
