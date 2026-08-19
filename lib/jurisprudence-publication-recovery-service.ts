import type {
  JurisprudencePublicationRecoveryCommand,
} from "./schemas/jurisprudence-publication-recovery";
import type { JurisprudencePublicationOutboxProcessorRepository } from "@/types/jurisprudence-publication-outbox-processor";
import type { JurisprudencePublicationSourceReader } from "@/types/jurisprudence-publication-source-reader";
import type { JurisprudencePublicationTransactionCoordinator } from "@/types/jurisprudence-publication-transaction";
import { toPublicProjectionRecord } from "@/lib/jurisprudence/jurisprudence-public-projection-mapper";
import { buildJurisprudencePublicProjection } from "@/lib/jurisprudence-public-projection-builder";
import { getJurisprudenceInternalDatabase } from "@/database/client";
import { withJurisprudencePublicationCommandRole } from "@/database/roles";
import { jurisprudencePublicationIdempotency } from "@/database/schema/jurisprudence";
import { eq } from "drizzle-orm";

export class JurisprudencePublicationRecoveryService {
  #outboxRepository: JurisprudencePublicationOutboxProcessorRepository;
  #sourceReader: JurisprudencePublicationSourceReader;
  #transactionCoordinator: JurisprudencePublicationTransactionCoordinator;

  constructor(
    outboxRepository: JurisprudencePublicationOutboxProcessorRepository,
    sourceReader: JurisprudencePublicationSourceReader,
    transactionCoordinator: JurisprudencePublicationTransactionCoordinator
  ) {
    this.#outboxRepository = outboxRepository;
    this.#sourceReader = sourceReader;
    this.#transactionCoordinator = transactionCoordinator;
  }

  async recover(input: JurisprudencePublicationRecoveryCommand): Promise<string> {
    // 0. Check idempotency first (read-only)
    const existingRecoveryId = await this.checkIdempotency(input.idempotencyKey);
    if (existingRecoveryId) {
      return existingRecoveryId;
    }

    // 1. Read original dead-letter outbox
    const oldOutbox = await this.#outboxRepository.findById(input.originalOutboxId);
    if (!oldOutbox) {
      throw new Error("RECOVERY_NOT_ALLOWED: Original outbox not found");
    }
    if (oldOutbox.status !== "dead_letter") {
      throw new Error("RECOVERY_NOT_ALLOWED: Original outbox status is failed, must be dead_letter");
    }
    if (oldOutbox.recordId !== input.recordId) {
      throw new Error("RECOVERY_NOT_ALLOWED: Identity mismatch");
    }

    // 2. Read canonical source at exact version
    const source = await this.#sourceReader.getPublicationSource({
      recordId: input.recordId,
      recordVersion: input.recordVersion,
    });
    if (!source) {
      throw new Error("RECOVERY_NOT_ALLOWED: Canonical source not found");
    }

    // 3. Map canonical projection
    const fullProjection = buildJurisprudencePublicProjection({
      record: source,
      projectionId: "00000000-0000-0000-0000-000000000000",
      executionId: oldOutbox.executionId,
      authorizationCaseId: "00000000-0000-0000-0000-000000000000",
      generatedAt: new Date().toISOString(),
    });
    const projection = toPublicProjectionRecord(source, fullProjection);

    // 4. Compute fingerprint
    const fingerprint = `${oldOutbox.id}:${oldOutbox.recordId}:${oldOutbox.recordVersion}`;

    // 5. Enqueue with transactional idempotency
    try {
      return await this.#transactionCoordinator.withTransaction(async (tx) => {
        const newOutboxId = await tx.outboxWriter.enqueuePublishRecovery(
          oldOutbox.executionId,
          oldOutbox.executionVersion, // PRESERVE ORIGINAL DELIVERY EXECUTION VERSION
          oldOutbox.recordId,
          oldOutbox.recordVersion,
          projection,
          input.originalOutboxId,
          input.idempotencyKey,
          fingerprint
        );
        return newOutboxId;
      });
    } catch (e: unknown) {
      const err = e as { code?: string; constraint?: string };
      if (err.code === "23505" && err.constraint === "jurisprudence_publication_outbox_recovery_unique") {
        throw new Error("RECOVERY_ALREADY_EXISTS: A recovery for this outbox already exists");
      }
      if (err.code === '23505' && err.constraint === 'jurisprudence_publication_idempotency_pkey') {
         // Race condition on same key insertion
         const existingId = await this.checkIdempotency(input.idempotencyKey);
         if (existingId) return existingId;
      }
      throw e;
    }
  }

  private async checkIdempotency(idempotencyKey: string): Promise<string | null> {
    const db = getJurisprudenceInternalDatabase();
    return await withJurisprudencePublicationCommandRole(db, async (tx) => {
      const [row] = await tx
        .select({ resultJson: jurisprudencePublicationIdempotency.resultJson })
        .from(jurisprudencePublicationIdempotency)
        .where(eq(jurisprudencePublicationIdempotency.idempotencyKey, idempotencyKey))
        .limit(1);

      if (!row) return null;
      return String((row.resultJson as { recoveredOutboxId?: string }).recoveredOutboxId);
    });
  }
}
