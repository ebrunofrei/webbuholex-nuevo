import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/database/schema";
import { withJurisprudencePublicationCommandRole } from "@/database/roles";
import type { JurisprudencePublicationTransaction, JurisprudencePublicationTransactionCoordinator } from "@/types/jurisprudence-publication-transaction";
import { PostgresJurisprudencePublicationExecutionRepository } from "./postgres-jurisprudence-publication-execution-repository";
import { PostgresJurisprudencePublicationOutboxWriter } from "./postgres-jurisprudence-publication-outbox-writer";

export class PostgresJurisprudencePublicationTransactionCoordinator implements JurisprudencePublicationTransactionCoordinator {
  readonly #db: PostgresJsDatabase<typeof schema>;

  constructor(db: PostgresJsDatabase<typeof schema>) {
    this.#db = db;
  }

  async withTransaction<T>(operation: (tx: JurisprudencePublicationTransaction) => Promise<T>): Promise<T> {
    return await withJurisprudencePublicationCommandRole(this.#db, async (tx) => {
      const executionRepository = new PostgresJurisprudencePublicationExecutionRepository(tx);
      const outboxWriter = new PostgresJurisprudencePublicationOutboxWriter(tx);
      return await operation({ executionRepository, outboxWriter });
    });
  }
}
