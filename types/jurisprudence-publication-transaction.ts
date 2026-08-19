import type {
  JurisprudencePublicationExecution,
  JurisprudencePublicationExecutionRepository,
} from "./jurisprudence-publication-execution";
import type { JurisprudencePublicProjectionRecord } from "./jurisprudence-public-projection-writer";

export interface JurisprudencePublicationOutboxWriter {
  enqueuePublish(execution: JurisprudencePublicationExecution, projection: JurisprudencePublicProjectionRecord): Promise<void>;
  enqueuePublishRecovery(
    executionId: string,
    executionVersion: number,
    recordId: string,
    recordVersion: number,
    projection: JurisprudencePublicProjectionRecord,
    recoveryOfOutboxId: string,
    idempotencyKey: string,
    commandFingerprint: string
  ): Promise<string>; // Returns the NEW_OUTBOX_ID
  enqueueWithdraw(execution: JurisprudencePublicationExecution): Promise<void>;
}

export interface JurisprudencePublicationTransaction {
  readonly executionRepository: JurisprudencePublicationExecutionRepository;
  readonly outboxWriter: JurisprudencePublicationOutboxWriter;
}

export interface JurisprudencePublicationTransactionCoordinator {
  withTransaction<T>(operation: (tx: JurisprudencePublicationTransaction) => Promise<T>): Promise<T>;
}
