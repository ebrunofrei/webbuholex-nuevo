import { PgTransaction } from "drizzle-orm/pg-core";
import { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import { ExtractTablesWithRelations } from "drizzle-orm";
import * as schema from "@/database/schema";
import type { JurisprudencePublicationOutboxWriter } from "@/types/jurisprudence-publication-transaction";
import type { JurisprudencePublicationExecution } from "@/types/jurisprudence-publication-execution";
import type { JurisprudencePublicProjectionRecord } from "@/types/jurisprudence-public-projection-writer";

type DbExecutor = PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

export class PostgresJurisprudencePublicationOutboxWriter implements JurisprudencePublicationOutboxWriter {
  readonly #tx: DbExecutor;

  constructor(tx: DbExecutor) {
    this.#tx = tx;
  }

  async enqueuePublish(execution: JurisprudencePublicationExecution, projection: JurisprudencePublicProjectionRecord): Promise<void> {
    await this.#tx.insert(schema.jurisprudencePublicationOutbox).values({
      recordId: execution.recordId,
      recordVersion: execution.recordVersion,
      executionId: execution.executionId,
      executionVersion: execution.version,
      eventType: "publish_projection",
      payload: projection,
      status: "pending",
    });
  }

  async enqueuePublishRecovery(
    executionId: string,
    executionVersion: number,
    recordId: string,
    recordVersion: number,
    projection: JurisprudencePublicProjectionRecord,
    recoveryOfOutboxId: string,
    idempotencyKey: string,
    commandFingerprint: string
  ): Promise<string> {
    const [row] = await this.#tx.insert(schema.jurisprudencePublicationOutbox).values({
      recordId: recordId,
      recordVersion: recordVersion,
      executionId: executionId,
      executionVersion: executionVersion,
      eventType: "publish_projection",
      payload: projection,
      status: "pending",
      recoveryOfOutboxId: recoveryOfOutboxId,
    }).returning({ id: schema.jurisprudencePublicationOutbox.id });

    const newOutboxId = row!.id;

    await this.#tx.insert(schema.jurisprudencePublicationIdempotency).values({
      idempotencyKey,
      commandFingerprint,
      resultJson: { recoveredOutboxId: newOutboxId },
    });

    return newOutboxId;
  }

  async enqueueWithdraw(execution: JurisprudencePublicationExecution): Promise<void> {
    await this.#tx.insert(schema.jurisprudencePublicationOutbox).values({
      recordId: execution.recordId,
      recordVersion: execution.recordVersion,
      executionId: execution.executionId,
      executionVersion: execution.version,
      eventType: "withdraw_projection",
      payload: {}, // Minimal payload for withdrawal as specified
      status: "pending",
    });
  }
}
