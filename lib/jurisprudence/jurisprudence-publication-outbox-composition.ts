import "server-only";
import { PostgresJurisprudencePublicationOutboxProcessorRepository } from "./postgres-jurisprudence-publication-outbox-processor-repository";
import { PostgresJurisprudencePublicProjectionWriter } from "./postgres-jurisprudence-public-projection-writer";
import { JurisprudencePublicationOutboxProcessor } from "./jurisprudence-publication-outbox-processor";

export function createJurisprudencePublicationOutboxProcessor(): JurisprudencePublicationOutboxProcessor {
  const repository = new PostgresJurisprudencePublicationOutboxProcessorRepository();
  const writer = new PostgresJurisprudencePublicProjectionWriter();

  return new JurisprudencePublicationOutboxProcessor(repository, writer);
}
