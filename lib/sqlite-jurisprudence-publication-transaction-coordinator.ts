/* eslint-disable @typescript-eslint/no-unused-vars */
import type { JurisprudencePublicationTransaction, JurisprudencePublicationTransactionCoordinator, JurisprudencePublicationOutboxWriter } from "@/types/jurisprudence-publication-transaction";
import type { JurisprudencePublicationExecutionRepository, JurisprudencePublicationExecution } from "@/types/jurisprudence-publication-execution";
import type { JurisprudencePublicProjectionRecord } from "@/types/jurisprudence-public-projection-writer";

export class NoopJurisprudencePublicationOutboxWriter implements JurisprudencePublicationOutboxWriter {
  async enqueuePublish(_execution: JurisprudencePublicationExecution, _projection: JurisprudencePublicProjectionRecord): Promise<void> {
    // SQLite remains LOCAL_PROTOTYPE / TEST_ONLY and does not implement a Production outbox
    return Promise.resolve();
  }

  async enqueuePublishRecovery(
    _executionId: string,
    _executionVersion: number,
    _recordId: string,
    _recordVersion: number,
    _projection: JurisprudencePublicProjectionRecord,
    _recoveryOfOutboxId: string,
    _idempotencyKey: string,
    _commandFingerprint: string
  ): Promise<string> {
    // SQLite remains LOCAL_PROTOTYPE / TEST_ONLY and does not implement a Production outbox
    return "dummy-sqlite-outbox-id";
  }

  async enqueueWithdraw(_execution: JurisprudencePublicationExecution): Promise<void> {
    // SQLite remains LOCAL_PROTOTYPE / TEST_ONLY and does not implement a Production outbox
    return Promise.resolve();
  }
}

export class SqliteJurisprudencePublicationTransactionCoordinator implements JurisprudencePublicationTransactionCoordinator {
  readonly #executionRepository: JurisprudencePublicationExecutionRepository;
  readonly #outboxWriter: JurisprudencePublicationOutboxWriter;

  constructor(executionRepository: JurisprudencePublicationExecutionRepository) {
    this.#executionRepository = executionRepository;
    this.#outboxWriter = new NoopJurisprudencePublicationOutboxWriter();
  }

  async withTransaction<T>(operation: (tx: JurisprudencePublicationTransaction) => Promise<T>): Promise<T> {
    // For SQLite, the repository manages its own minimal internal transaction for domain mutations,
    // and there is no real outbox side-effect to coordinate.
    return await operation({
      executionRepository: this.#executionRepository,
      outboxWriter: this.#outboxWriter,
    });
  }
}
