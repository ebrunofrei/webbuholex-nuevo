/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { JurisprudencePublicationRecoveryService } from "@/lib/jurisprudence-publication-recovery-service";

describe("JurisprudencePublicationRecoveryService", () => {
  let mockOutboxRepository: any;
  let mockSourceReader: { getPublicationSource: ReturnType<typeof vi.fn> };
  let mockTxCoordinator: { withTransaction: ReturnType<typeof vi.fn> };
  let service: JurisprudencePublicationRecoveryService;

  beforeEach(() => {
    mockOutboxRepository = {
      findById: vi.fn(),
    } as unknown as any; // Using any for brevity since it's a test file mock
    mockSourceReader = {
      getPublicationSource: vi.fn(),
    };
    mockTxCoordinator = {
      withTransaction: vi.fn(async (cb) => {
        return await cb({ outboxWriter: { enqueuePublishRecovery: vi.fn().mockResolvedValue("new-outbox-id") } });
      }),
    };
    service = new JurisprudencePublicationRecoveryService(
      mockOutboxRepository,
      mockSourceReader as any,
      mockTxCoordinator as any
    );
      // Mock the idempotency check to always return null initially to avoid DB connection in unit tests
      (service as unknown as { checkIdempotency: ReturnType<typeof vi.fn> }).checkIdempotency = vi.fn().mockResolvedValue(null);
  });

  const validRequest = {
    originalOutboxId: "e9d4e0b6-790f-4c08-8bff-3a0550d47c99",
    recordId: "19bdd9bd-6a3b-4a16-b021-0699c790deab",
    recordVersion: 1,
    idempotencyKey: "recovery-test-key",
  };

  const validOldOutbox = {
    id: "e9d4e0b6-790f-4c08-8bff-3a0550d47c99",
    recordId: "19bdd9bd-6a3b-4a16-b021-0699c790deab",
    recordVersion: 1,
    executionId: "c094b196-0f94-4339-99c3-31e1cd91f043",
    executionVersion: 1, // Notice this is 1, not current superseded version 2
    status: "dead_letter",
    attempts: 2,
    eventType: "publish_projection",
  };

  const validSource = {
    id: "19bdd9bd-6a3b-4a16-b021-0699c790deab",
    recordVersion: 1,
    title: "Test Record",
    institutionName: "Test Institution",
    source: { name: "Test" },
    issuedAt: new Date().toISOString(),
    editorialContent: { publicExcerpt: "Test Excerpt", editorialTitle: "Test Title" },
    officialContent: { officialSummary: "Test Summary" },
    slug: "test-slug",
    caseNumber: "123",
    resolutionNumber: "456",
    resolutionType: "Type",
    issuingBody: "Body",
    matter: "Matter",
  };

  it("1. rejects missing original outbox", async () => {
    mockOutboxRepository.findById.mockResolvedValue(null);
    await expect(service.recover(validRequest)).rejects.toThrow("RECOVERY_NOT_ALLOWED: Original outbox not found");
  });

  it("2. rejects non-dead-letter original", async () => {
    mockOutboxRepository.findById.mockResolvedValue({ ...validOldOutbox, status: "failed" });
    await expect(service.recover(validRequest)).rejects.toThrow("RECOVERY_NOT_ALLOWED: Original outbox status is failed, must be dead_letter");
  });

  it("3. validates record identity", async () => {
    mockOutboxRepository.findById.mockResolvedValue({ ...validOldOutbox, recordId: "other-id" });
    await expect(service.recover(validRequest)).rejects.toThrow("RECOVERY_NOT_ALLOWED: Identity mismatch");
  });

  it("4. reads exact record version", async () => {
    mockOutboxRepository.findById.mockResolvedValue(validOldOutbox);
    mockSourceReader.getPublicationSource.mockResolvedValue(null);
    await expect(service.recover(validRequest)).rejects.toThrow("RECOVERY_NOT_ALLOWED: Canonical source not found");
    expect(mockSourceReader.getPublicationSource).toHaveBeenCalledWith({
      recordId: validRequest.recordId,
      recordVersion: validRequest.recordVersion,
    });
  });

  it("22. recovery preserves original delivery executionVersion", async () => {
    mockOutboxRepository.findById.mockResolvedValue(validOldOutbox);
    mockSourceReader.getPublicationSource.mockResolvedValue(validSource);

    let capturedExecutionVersion: number | undefined;
    mockTxCoordinator.withTransaction = vi.fn(async (cb) => {
      return await cb({
        outboxWriter: {
          enqueuePublishRecovery: vi.fn().mockImplementation((execId, execVersion) => {
            capturedExecutionVersion = execVersion;
            return Promise.resolve("new-outbox-id");
          }),
        },
      });
    });

    await service.recover(validRequest);
    expect(capturedExecutionVersion).toBe(1); // Inherits from dead-letter, NOT current execution status
  });

  it("18. same-key replay returns same recovery result", async () => {
    (service as unknown as { checkIdempotency: ReturnType<typeof vi.fn> }).checkIdempotency = vi.fn().mockResolvedValue("existing-outbox-id");
    const result = await service.recover(validRequest);
    expect(result).toBe("existing-outbox-id");
    expect(mockOutboxRepository.findById).not.toHaveBeenCalled();
  });

  it("resolves RECOVERY_ALREADY_EXISTS on unique constraint violation", async () => {
    mockOutboxRepository.findById.mockResolvedValue(validOldOutbox);
    mockSourceReader.getPublicationSource.mockResolvedValue(validSource);

    mockTxCoordinator.withTransaction = vi.fn().mockRejectedValue({
      code: '23505',
      constraint: 'jurisprudence_publication_outbox_recovery_unique'
    });

    await expect(service.recover(validRequest)).rejects.toThrow("RECOVERY_ALREADY_EXISTS: A recovery for this outbox already exists");
  });
});
