import type {
  JurisprudencePublicationExecution,
  JurisprudencePublicationExecutionRepository,
} from "./jurisprudence-publication-execution";
import type { JurisprudencePublicProjectionRecord } from "./jurisprudence-public-projection-writer";

export interface JurisprudencePublicationOutboxWriter {
  enqueuePublish(execution: JurisprudencePublicationExecution, projection: JurisprudencePublicProjectionRecord): Promise<void>;
  enqueueWithdraw(execution: JurisprudencePublicationExecution): Promise<void>;
}

export interface JurisprudencePublicationTransaction {
  readonly executionRepository: JurisprudencePublicationExecutionRepository;
  readonly outboxWriter: JurisprudencePublicationOutboxWriter;
}

export interface JurisprudencePublicationTransactionCoordinator {
  withTransaction<T>(operation: (tx: JurisprudencePublicationTransaction) => Promise<T>): Promise<T>;
}
