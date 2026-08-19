import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mocked,
} from "vitest";

import { JurisprudencePublicationOutboxProcessor } from "../lib/jurisprudence/jurisprudence-publication-outbox-processor";

import type {
  JurisprudencePublicationOutboxClaim,
  JurisprudencePublicationOutboxProcessorRepository,
} from "../types/jurisprudence-publication-outbox-processor";

import type {
  JurisprudencePublicProjectionRecord,
  JurisprudencePublicProjectionWriter,
  PublicProjectionMutationResult,
} from "../types/jurisprudence-public-projection-writer";

describe("JurisprudencePublicationOutboxProcessor", () => {
  let repository: Mocked<JurisprudencePublicationOutboxProcessorRepository>;
  let writer: Mocked<JurisprudencePublicProjectionWriter>;
  let processor: JurisprudencePublicationOutboxProcessor;
  let fixedDate: Date;

  const createValidPublishPayload =
    (): JurisprudencePublicProjectionRecord => ({
      id: "rec-1",
      recordVersion: 1,
      slug: "slug",
      title: "title",
      caseTitle: "case title",
      caseNumber: "case-1",
      resolutionNumber: "res-1",
      resolutionType: "type",
      institutionName: "inst",
      issuingBody: "body",
      matter: "matter",
      issuedAt: "2026-01-01",
      summary: null,
      sourceName: "source",
    });

  const createClaim = (
    overrides: Partial<JurisprudencePublicationOutboxClaim> = {},
  ): JurisprudencePublicationOutboxClaim => ({
    id: "out-1",
    recordId: "rec-1",
    recordVersion: 1,
    executionId: "exec-1",
    executionVersion: 1,
    eventType: "publish_projection",
    payload: createValidPublishPayload(),
    status: "processing",
    attempts: 1,
    availableAt: fixedDate,
    processingStartedAt: fixedDate,
    ...overrides,
  });

  const createUnsupportedEventClaim =
    (): JurisprudencePublicationOutboxClaim =>
      ({
        ...createClaim(),
        eventType: "unknown_event",
      }) as unknown as JurisprudencePublicationOutboxClaim;

  beforeEach(() => {
    repository = {
      claimNext: vi.fn(),
      findById: vi.fn(),
      markSent: vi.fn(),
      markFailed: vi.fn(),
      markDeadLetter: vi.fn(),
    } as unknown as Mocked<JurisprudencePublicationOutboxProcessorRepository>;

    writer = {
      upsert: vi.fn(),
      removeById: vi.fn(),
    };

    fixedDate = new Date("2026-01-01T00:00:00.000Z");

    processor = new JurisprudencePublicationOutboxProcessor(
      repository,
      writer,
      () => fixedDate,
    );
  });

  it("returns NO_WORK when nothing can be claimed", async () => {
    repository.claimNext.mockResolvedValueOnce(null);

    const result = await processor.processNext();

    expect(result).toBe("NO_WORK");
    expect(writer.upsert).not.toHaveBeenCalled();
    expect(writer.removeById).not.toHaveBeenCalled();
    expect(repository.markSent).not.toHaveBeenCalled();
    expect(repository.markFailed).not.toHaveBeenCalled();
    expect(repository.markDeadLetter).not.toHaveBeenCalled();
  });

  describe("payload validation", () => {
    it("sends DEAD_LETTER for INVALID_OUTBOX_PAYLOAD on publish", async () => {
      repository.claimNext.mockResolvedValueOnce(
        createClaim({
          payload: {
            missingFields: true,
          },
        }),
      );

      const result = await processor.processNext();

      expect(result).toBe("DEAD_LETTER");
      expect(repository.markDeadLetter).toHaveBeenCalledWith(
        "out-1",
        "INVALID_OUTBOX_PAYLOAD",
        fixedDate,
      );

      expect(writer.upsert).not.toHaveBeenCalled();
      expect(writer.removeById).not.toHaveBeenCalled();
      expect(repository.markFailed).not.toHaveBeenCalled();
      expect(repository.markSent).not.toHaveBeenCalled();
    });

    it("sends DEAD_LETTER for INVALID_OUTBOX_PAYLOAD on withdraw", async () => {
      repository.claimNext.mockResolvedValueOnce(
        createClaim({
          eventType: "withdraw_projection",
          payload: {
            extraPropertyNotAllowed: true,
          },
        }),
      );

      const result = await processor.processNext();

      expect(result).toBe("DEAD_LETTER");
      expect(repository.markDeadLetter).toHaveBeenCalledWith(
        "out-1",
        "INVALID_OUTBOX_PAYLOAD",
        fixedDate,
      );

      expect(writer.removeById).not.toHaveBeenCalled();
      expect(writer.upsert).not.toHaveBeenCalled();
      expect(repository.markFailed).not.toHaveBeenCalled();
      expect(repository.markSent).not.toHaveBeenCalled();
    });
  });

  describe("envelope consistency", () => {
    it("sends DEAD_LETTER when publish payload id mismatches recordId", async () => {
      const mismatchedPayload: JurisprudencePublicProjectionRecord = {
        ...createValidPublishPayload(),
        id: "different-record-id",
      };

      repository.claimNext.mockResolvedValueOnce(
        createClaim({
          payload: mismatchedPayload,
        }),
      );

      const result = await processor.processNext();

      expect(result).toBe("DEAD_LETTER");
      expect(repository.markDeadLetter).toHaveBeenCalledWith(
        "out-1",
        "OUTBOX_ENVELOPE_MISMATCH",
        fixedDate,
      );

      expect(writer.upsert).not.toHaveBeenCalled();
      expect(repository.markFailed).not.toHaveBeenCalled();
      expect(repository.markSent).not.toHaveBeenCalled();
    });

    it("sends DEAD_LETTER when publish payload recordVersion mismatches envelope", async () => {
      const mismatchedPayload: JurisprudencePublicProjectionRecord = {
        ...createValidPublishPayload(),
        recordVersion: 2,
      };

      repository.claimNext.mockResolvedValueOnce(
        createClaim({
          recordVersion: 1,
          payload: mismatchedPayload,
        }),
      );

      const result = await processor.processNext();

      expect(result).toBe("DEAD_LETTER");
      expect(repository.markDeadLetter).toHaveBeenCalledWith(
        "out-1",
        "OUTBOX_ENVELOPE_MISMATCH",
        fixedDate,
      );

      expect(writer.upsert).not.toHaveBeenCalled();
      expect(repository.markFailed).not.toHaveBeenCalled();
      expect(repository.markSent).not.toHaveBeenCalled();
    });
  });

  it("sends DEAD_LETTER for unsupported outbox event", async () => {
    repository.claimNext.mockResolvedValueOnce(
      createUnsupportedEventClaim(),
    );

    const result = await processor.processNext();

    expect(result).toBe("DEAD_LETTER");
    expect(repository.markDeadLetter).toHaveBeenCalledWith(
      "out-1",
      "UNSUPPORTED_OUTBOX_EVENT",
      fixedDate,
    );

    expect(writer.upsert).not.toHaveBeenCalled();
    expect(writer.removeById).not.toHaveBeenCalled();
    expect(repository.markFailed).not.toHaveBeenCalled();
    expect(repository.markSent).not.toHaveBeenCalled();
  });

  describe("publish_projection", () => {
    it.each<PublicProjectionMutationResult>([
      "APPLIED",
      "IDEMPOTENT",
      "STALE",
    ])(
      "marks publish as SENT when writer returns %s",
      async (writerResult) => {
        const claim = createClaim();
        const expectedPayload = createValidPublishPayload();

        repository.claimNext.mockResolvedValueOnce(claim);
        writer.upsert.mockResolvedValueOnce(writerResult);

        const result = await processor.processNext();

        expect(result).toBe("SENT");

        expect(writer.upsert).toHaveBeenCalledWith(
          expectedPayload,
          claim.executionVersion,
        );

        expect(repository.markSent).toHaveBeenCalledWith(
          claim.id,
          fixedDate,
        );

        expect(repository.markFailed).not.toHaveBeenCalled();
        expect(repository.markDeadLetter).not.toHaveBeenCalled();
        expect(writer.removeById).not.toHaveBeenCalled();
      },
    );
  });

  describe("withdraw_projection", () => {
    it.each<PublicProjectionMutationResult>([
      "APPLIED",
      "IDEMPOTENT",
      "STALE",
    ])(
      "marks withdraw as SENT when writer returns %s",
      async (writerResult) => {
        const claim = createClaim({
          eventType: "withdraw_projection",
          payload: {},
        });

        repository.claimNext.mockResolvedValueOnce(claim);
        writer.removeById.mockResolvedValueOnce(writerResult);

        const result = await processor.processNext();

        expect(result).toBe("SENT");

        expect(writer.removeById).toHaveBeenCalledWith(
          claim.recordId,
          claim.recordVersion,
          claim.executionVersion,
        );

        expect(repository.markSent).toHaveBeenCalledWith(
          claim.id,
          fixedDate,
        );

        expect(repository.markFailed).not.toHaveBeenCalled();
        expect(repository.markDeadLetter).not.toHaveBeenCalled();
        expect(writer.upsert).not.toHaveBeenCalled();
      },
    );
  });

  describe("retry policy", () => {
    it.each([
      {
        attempts: 1,
        retryDelayMs: 30_000,
      },
      {
        attempts: 2,
        retryDelayMs: 120_000,
      },
      {
        attempts: 3,
        retryDelayMs: 600_000,
      },
      {
        attempts: 4,
        retryDelayMs: 1_800_000,
      },
    ])(
      "marks technical public write failure as FAILED on attempt $attempts",
      async ({ attempts, retryDelayMs }) => {
        repository.claimNext.mockResolvedValueOnce(
          createClaim({
            attempts,
          }),
        );

        writer.upsert.mockRejectedValueOnce(
          new Error("Simulated public write failure"),
        );

        const result = await processor.processNext();

        expect(result).toBe("FAILED");

        expect(repository.markFailed).toHaveBeenCalledWith(
          "out-1",
          new Date(fixedDate.getTime() + retryDelayMs),
          "PUBLIC_PROJECTION_WRITE_FAILED",
          fixedDate,
        );

        expect(repository.markDeadLetter).not.toHaveBeenCalled();
        expect(repository.markSent).not.toHaveBeenCalled();
      },
    );

    it("marks technical public write failure as DEAD_LETTER on attempt 5", async () => {
      repository.claimNext.mockResolvedValueOnce(
        createClaim({
          attempts: 5,
        }),
      );

      writer.upsert.mockRejectedValueOnce(
        new Error("Simulated public write failure"),
      );

      const result = await processor.processNext();

      expect(result).toBe("DEAD_LETTER");

      expect(repository.markDeadLetter).toHaveBeenCalledWith(
        "out-1",
        "PUBLIC_PROJECTION_WRITE_FAILED",
        fixedDate,
      );

      expect(repository.markFailed).not.toHaveBeenCalled();
      expect(repository.markSent).not.toHaveBeenCalled();
    });
  });

  describe("crash safety and markSent failure", () => {
    it("does not misclassify markSent failure as public write failure", async () => {
      const claim = createClaim();
      const markSentError = new Error(
        "Simulated bookkeeping failure during markSent",
      );

      repository.claimNext.mockResolvedValueOnce(claim);
      writer.upsert.mockResolvedValueOnce("APPLIED");
      repository.markSent.mockRejectedValueOnce(markSentError);

      await expect(processor.processNext()).rejects.toThrow(
        markSentError,
      );

      expect(writer.upsert).toHaveBeenCalledTimes(1);

      expect(repository.markSent).toHaveBeenCalledWith(
        claim.id,
        fixedDate,
      );

      expect(repository.markFailed).not.toHaveBeenCalled();
      expect(repository.markDeadLetter).not.toHaveBeenCalled();
    });

    it("replays safely after writer success followed by markSent failure", async () => {
      const claimRun1 = createClaim({
        attempts: 1,
      });

      repository.claimNext.mockResolvedValueOnce(
        claimRun1,
      );

      writer.upsert.mockResolvedValueOnce("APPLIED");

      repository.markSent.mockRejectedValueOnce(
        new Error("Crash after public write"),
      );

      await expect(processor.processNext()).rejects.toThrow(
        "Crash after public write",
      );

      expect(repository.markFailed).not.toHaveBeenCalled();
      expect(repository.markDeadLetter).not.toHaveBeenCalled();

      const claimRun2 = createClaim({
        attempts: 2,
      });

      repository.claimNext.mockResolvedValueOnce(
        claimRun2,
      );

      writer.upsert.mockResolvedValueOnce(
        "IDEMPOTENT",
      );

      repository.markSent.mockResolvedValueOnce(
        undefined,
      );

      const result = await processor.processNext();

      expect(result).toBe("SENT");

      expect(writer.upsert).toHaveBeenCalledTimes(
        2,
      );

      expect(repository.markSent).toHaveBeenCalledTimes(
        2,
      );

      expect(repository.markSent).toHaveBeenLastCalledWith(
        claimRun2.id,
        fixedDate,
      );

      expect(repository.markFailed).not.toHaveBeenCalled();
      expect(repository.markDeadLetter).not.toHaveBeenCalled();
    });

    it("replays withdraw safely after writer success followed by markSent failure", async () => {
      const claimRun1 = createClaim({
        eventType: "withdraw_projection",
        payload: {},
        attempts: 1,
      });

      repository.claimNext.mockResolvedValueOnce(
        claimRun1,
      );

      writer.removeById.mockResolvedValueOnce(
        "APPLIED",
      );

      repository.markSent.mockRejectedValueOnce(
        new Error("Crash after withdraw"),
      );

      await expect(processor.processNext()).rejects.toThrow(
        "Crash after withdraw",
      );

      expect(repository.markFailed).not.toHaveBeenCalled();
      expect(repository.markDeadLetter).not.toHaveBeenCalled();

      const claimRun2 = createClaim({
        eventType: "withdraw_projection",
        payload: {},
        attempts: 2,
      });

      repository.claimNext.mockResolvedValueOnce(
        claimRun2,
      );

      writer.removeById.mockResolvedValueOnce(
        "IDEMPOTENT",
      );

      repository.markSent.mockResolvedValueOnce(
        undefined,
      );

      const result = await processor.processNext();

      expect(result).toBe("SENT");

      expect(
        writer.removeById,
      ).toHaveBeenCalledTimes(2);

      expect(
        repository.markSent,
      ).toHaveBeenCalledTimes(2);

      expect(repository.markFailed).not.toHaveBeenCalled();
      expect(repository.markDeadLetter).not.toHaveBeenCalled();
    });
  });

  describe("bookkeeping failure boundaries", () => {
    it(
      "does not misclassify INVALID_OUTBOX_PAYLOAD bookkeeping failure as public write failure",
      async () => {
        repository.claimNext.mockResolvedValueOnce(
          createClaim({
            payload: {
              invalid: true,
            },
          }),
        );

        repository.markDeadLetter.mockRejectedValueOnce(
          new Error("Bookkeeping failure"),
        );

        await expect(
          processor.processNext(),
        ).rejects.toThrow("Bookkeeping failure");

        expect(repository.markFailed).not.toHaveBeenCalled();
        expect(writer.upsert).not.toHaveBeenCalled();
        expect(writer.removeById).not.toHaveBeenCalled();
      },
    );

    it(
      "does not misclassify unsupported-event bookkeeping failure as public write failure",
      async () => {
        repository.claimNext.mockResolvedValueOnce(
          createUnsupportedEventClaim(),
        );

        repository.markDeadLetter.mockRejectedValueOnce(
          new Error("Bookkeeping failure"),
        );

        await expect(
          processor.processNext(),
        ).rejects.toThrow("Bookkeeping failure");

        expect(repository.markFailed).not.toHaveBeenCalled();
        expect(writer.upsert).not.toHaveBeenCalled();
        expect(writer.removeById).not.toHaveBeenCalled();
      },
    );
  });
});