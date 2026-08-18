import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  type JurisprudenceTransaction,
  withJurisprudencePublicationOutboxRole,
} from "@/database/roles";

import { PostgresJurisprudencePublicationOutboxProcessorRepository } from "../lib/jurisprudence/postgres-jurisprudence-publication-outbox-processor-repository";

vi.mock("@/database/client", () => ({
  getJurisprudenceOutboxDatabase: vi.fn(() => ({})),
}));

vi.mock("@/database/roles", () => ({
  withJurisprudencePublicationOutboxRole: vi.fn(),
}));

type MockFunction = ReturnType<typeof vi.fn>;

interface MockTransaction {
  select: MockFunction;
  from: MockFunction;
  where: MockFunction;
  orderBy: MockFunction;
  limit: MockFunction;
  for: MockFunction;
  update: MockFunction;
  set: MockFunction;
  returning: MockFunction;
}

function createMockTransaction(): MockTransaction {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    for: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  };
}

function getFirstSetPayload(
  mockTx: MockTransaction,
): Record<string, unknown> {
  const firstCall = mockTx.set.mock.calls[0];

  if (!firstCall) {
    throw new Error("Expected transaction.set() to have been called.");
  }

  const [payload] = firstCall;

  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new Error(
      "Expected the first transaction.set() argument to be an object.",
    );
  }

  return payload as Record<string, unknown>;
}

describe(
  "PostgresJurisprudencePublicationOutboxProcessorRepository",
  () => {
    let repository: PostgresJurisprudencePublicationOutboxProcessorRepository;
    let mockTx: MockTransaction;

    beforeEach(() => {
      vi.clearAllMocks();

      repository =
        new PostgresJurisprudencePublicationOutboxProcessorRepository();

      mockTx = createMockTransaction();

      vi.mocked(
        withJurisprudencePublicationOutboxRole,
      ).mockImplementation(async (_db, callback) =>
        callback(
          mockTx as unknown as JurisprudenceTransaction,
        ),
      );
    });

    describe("claimNext", () => {
      it("uses FOR UPDATE SKIP LOCKED LIMIT 1", async () => {
        await repository.claimNext(new Date());

        expect(mockTx.limit).toHaveBeenCalledWith(1);
        expect(mockTx.for).toHaveBeenCalledWith(
          "update",
          { skipLocked: true },
        );
      });

      it(
        "applies ordering for withdraw priority and availability",
        async () => {
          await repository.claimNext(new Date());

          expect(mockTx.orderBy).toHaveBeenCalled();
        },
      );

      it("returns null when no row is claimed", async () => {
        mockTx.returning.mockResolvedValueOnce([]);

        const result = await repository.claimNext(
          new Date(),
        );

        expect(result).toBeNull();
      });

      it(
        "increments attempts on claim and sets status processing",
        async () => {
          const now = new Date(
            "2026-08-18T12:00:00.000Z",
          );

          mockTx.returning.mockResolvedValueOnce([
            {
              id: "123",
              recordId: "rec-1",
              recordVersion: 1,
              executionId: "exec-1",
              executionVersion: 1,
              eventType: "publish_projection",
              payload: {
                title: "Test",
              },
              status: "processing",
              attempts: 1,
              availableAt: now,
              processingStartedAt: now,
            },
          ]);

          const result =
            await repository.claimNext(now);

          expect(result).not.toBeNull();
          expect(result?.attempts).toBe(1);
          expect(result?.status).toBe(
            "processing",
          );

          const setPayload =
            getFirstSetPayload(mockTx);

          expect(setPayload.status).toBe(
            "processing",
          );
          expect(
            setPayload.processingStartedAt,
          ).toBe(now);
          expect(setPayload.updatedAt).toBe(
            now,
          );
        },
      );
    });

    describe("markSent", () => {
      it(
        "updates status to sent and clears processing/error metadata",
        async () => {
          const now = new Date(
            "2026-08-18T12:00:00.000Z",
          );

          await repository.markSent(
            "123",
            now,
          );

          expect(
            mockTx.update,
          ).toHaveBeenCalled();

          const setPayload =
            getFirstSetPayload(mockTx);

          expect(setPayload.status).toBe(
            "sent",
          );
          expect(setPayload.processedAt).toBe(
            now,
          );
          expect(
            setPayload.processingStartedAt,
          ).toBeNull();
          expect(
            setPayload.lastErrorCode,
          ).toBeNull();
        },
      );
    });

    describe("markFailed", () => {
      it(
        "updates status to failed and schedules the next attempt",
        async () => {
          const now = new Date(
            "2026-08-18T12:00:00.000Z",
          );
          const future = new Date(
            now.getTime() + 30_000,
          );

          await repository.markFailed(
            "123",
            future,
            "PUBLIC_PROJECTION_WRITE_FAILED",
            now,
          );

          expect(
            mockTx.update,
          ).toHaveBeenCalled();

          const setPayload =
            getFirstSetPayload(mockTx);

          expect(setPayload.status).toBe(
            "failed",
          );
          expect(setPayload.availableAt).toBe(
            future,
          );
          expect(
            setPayload.lastErrorCode,
          ).toBe(
            "PUBLIC_PROJECTION_WRITE_FAILED",
          );
          expect(
            setPayload.processingStartedAt,
          ).toBeNull();
          expect(setPayload.processedAt).toBeNull();
          expect(setPayload.updatedAt).toBe(
            now,
          );
        },
      );
    });

    describe("markDeadLetter", () => {
      it(
        "updates status to dead_letter with a stable error code",
        async () => {
          const now = new Date(
            "2026-08-18T12:00:00.000Z",
          );

          await repository.markDeadLetter(
            "123",
            "INVALID_OUTBOX_PAYLOAD",
            now,
          );

          expect(
            mockTx.update,
          ).toHaveBeenCalled();

          const setPayload =
            getFirstSetPayload(mockTx);

          expect(setPayload.status).toBe(
            "dead_letter",
          );
          expect(
            setPayload.lastErrorCode,
          ).toBe(
            "INVALID_OUTBOX_PAYLOAD",
          );
          expect(setPayload.processedAt).toBe(
            now,
          );
          expect(
            setPayload.processingStartedAt,
          ).toBeNull();
          expect(setPayload.updatedAt).toBe(
            now,
          );
        },
      );
    });
  },
);