import type {
  JurisprudencePublicationOutboxProcessorRepository,
  JurisprudencePublicationStatusSynchronizer,
  ProcessNextResult,
} from "@/types/jurisprudence-publication-outbox-processor";
import type { JurisprudencePublicProjectionWriter } from "@/types/jurisprudence-public-projection-writer";
import { getJurisprudenceOutboxRetryDelayMs } from "./jurisprudence-publication-outbox-policy";
import {
  jurisprudencePublishOutboxPayloadSchema,
  jurisprudenceWithdrawOutboxPayloadSchema,
} from "./jurisprudence-publication-outbox-schemas";

export class JurisprudencePublicationOutboxProcessor {
  constructor(
    private readonly repository: JurisprudencePublicationOutboxProcessorRepository,
    private readonly writer: JurisprudencePublicProjectionWriter,
    private readonly recordRepository: JurisprudencePublicationStatusSynchronizer,
    private readonly clock: () => Date = () => new Date()
  ) {}

  async processNext(): Promise<ProcessNextResult> {
    const now = this.clock();
    const claim = await this.repository.claimNext(now);

    if (!claim) {
      return "NO_WORK";
    }

    let executePublicWrite: () => Promise<unknown>;

    if (claim.eventType === "publish_projection") {
      const parsed =
        jurisprudencePublishOutboxPayloadSchema.safeParse(
          claim.payload,
        );

      if (!parsed.success) {
        await this.repository.markDeadLetter(
          claim.id,
          "INVALID_OUTBOX_PAYLOAD",
          now,
        );

        return "DEAD_LETTER";
      }

      const payload = parsed.data;

      if (
        payload.id !== claim.recordId ||
        payload.recordVersion !== claim.recordVersion
      ) {
        await this.repository.markDeadLetter(
          claim.id,
          "OUTBOX_ENVELOPE_MISMATCH",
          now,
        );

        return "DEAD_LETTER";
      }

      executePublicWrite = async () => {
        await this.writer.upsert(
          payload,
          claim.executionVersion,
        );
        await this.recordRepository.synchronizePublicationStatus(
          claim.recordId,
          "published",
        );
      };
    } else if (
      claim.eventType === "withdraw_projection"
    ) {
      const parsed =
        jurisprudenceWithdrawOutboxPayloadSchema.safeParse(
          claim.payload,
        );

      if (!parsed.success) {
        await this.repository.markDeadLetter(
          claim.id,
          "INVALID_OUTBOX_PAYLOAD",
          now,
        );

        return "DEAD_LETTER";
      }

      executePublicWrite = async () => {
        await this.writer.removeById(
          claim.recordId,
          claim.recordVersion,
          claim.executionVersion,
        );
        await this.recordRepository.synchronizePublicationStatus(
          claim.recordId,
          "withdrawn",
        );
      };
    } else {
      await this.repository.markDeadLetter(
        claim.id,
        "UNSUPPORTED_OUTBOX_EVENT",
        now,
      );

      return "DEAD_LETTER";
    }

    try {
      await executePublicWrite();
    } catch {
      const retryDelay =
        getJurisprudenceOutboxRetryDelayMs(
          claim.attempts,
        );

      if (retryDelay === null) {
        await this.repository.markDeadLetter(
          claim.id,
          "PUBLIC_PROJECTION_WRITE_FAILED",
          now,
        );

        return "DEAD_LETTER";
      }

      const availableAt = new Date(
        now.getTime() + retryDelay,
      );

      await this.repository.markFailed(
        claim.id,
        availableAt,
        "PUBLIC_PROJECTION_WRITE_FAILED",
        now,
      );

      return "FAILED";
    }

    await this.repository.markSent(
      claim.id,
      now,
    );

    return "SENT";
  }
}
