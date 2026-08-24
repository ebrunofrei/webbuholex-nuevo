import { describe, it, expect, beforeEach, vi } from "vitest";
import { PostgresJurisprudencePublicProjectionWriter } from "@/lib/jurisprudence/postgres-jurisprudence-public-projection-writer";
import type { JurisprudencePublicProjectionRecord } from "@/types/jurisprudence-public-projection-writer";
import { getJurisprudencePublicWriteDatabase } from "@/database/client";
import { withJurisprudencePublicWriteRole } from "@/database/roles";

vi.mock("@/database/client", () => ({
  getJurisprudencePublicWriteDatabase: vi.fn(),
}));

vi.mock("@/database/roles", () => ({
  withJurisprudencePublicWriteRole: vi.fn(),
}));

describe("PostgresJurisprudencePublicProjectionWriter", () => {
  let writer: PostgresJurisprudencePublicProjectionWriter;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockTx: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSelect: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockInsert: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockUpdate: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDelete: any;

  beforeEach(() => {
    writer = new PostgresJurisprudencePublicProjectionWriter();

    mockSelect = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      for: vi.fn().mockResolvedValue([]),
    };

    mockInsert = {
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ recordId: "proj-1" }]),
    };

    mockUpdate = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };

    mockDelete = {
      where: vi.fn().mockResolvedValue(undefined),
    };

    mockTx = {
      select: vi.fn().mockReturnValue(mockSelect),
      insert: vi.fn().mockReturnValue(mockInsert),
      update: vi.fn().mockReturnValue(mockUpdate),
      delete: vi.fn().mockReturnValue(mockDelete),
    };
    mockDb = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getJurisprudencePublicWriteDatabase as any).mockReturnValue(mockDb);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (withJurisprudencePublicWriteRole as any).mockImplementation(async (db: any, cb: any) => {
      return cb(mockTx);
    });
  });

  const baseRecord: JurisprudencePublicProjectionRecord = {
    id: "proj-1",
    recordVersion: 5,
    slug: "slug-1",
    title: "Title 1",
    caseTitle: "Case 1",
    caseNumber: "123-2023",
    resolutionNumber: "RES-1",
    resolutionType: "Auto",
    institutionName: "Inst",
    issuingBody: "Body",
    matter: "Civil",
    issuedAt: "2023-01-01",
    summary: "A summary",
    sourceName: "Source",
    officialHtmlUrl: null,
    officialPdfUrl: null,
  };

  describe("when NO barrier exists", () => {
    it("first publish returns APPLIED and materializes public row", async () => {
      mockSelect.for.mockResolvedValueOnce([]); // barrier not found
      mockInsert.returning.mockResolvedValueOnce([{ recordId: "proj-1" }]); // insert won

      const result = await writer.upsert(baseRecord, 1);

      expect(result).toBe("APPLIED");
      // Should have inserted public record
      expect(mockInsert.values).toHaveBeenCalledWith(expect.objectContaining({ id: "proj-1" }));
    });

    it("first withdraw returns APPLIED and creates durable tombstone", async () => {
      mockSelect.for.mockResolvedValueOnce([]); // barrier not found
      mockInsert.returning.mockResolvedValueOnce([{ recordId: "proj-1" }]); // insert won

      const result = await writer.removeById("proj-1", 5, 2);

      expect(result).toBe("APPLIED");
      // Should have deleted public record
      expect(mockDelete.where).toHaveBeenCalled();
    });

    it("losing concurrent insert rereads locked barrier and processes normally", async () => {
      mockSelect.for
        .mockResolvedValueOnce([]) // First read: not found
        .mockResolvedValueOnce([{ recordVersion: 6, executionVersion: 1, projectionState: "published" }]); // Reread: found concurrent insert!

      mockInsert.returning.mockResolvedValueOnce([]); // Insert returned 0 rows (lost race)

      const result = await writer.upsert(baseRecord, 1); // We try to insert (5,1)

      // Since concurrent inserted (6,1), ours is STALE
      expect(result).toBe("STALE");
      expect(mockSelect.for).toHaveBeenCalledTimes(2); // Verify reread occurred
      expect(mockUpdate.set).not.toHaveBeenCalled(); // No mutation
    });
  });

  describe("when barrier EXISTS", () => {
    it("newer publish returns APPLIED", async () => {
      mockSelect.for.mockResolvedValueOnce([{ recordVersion: 4, executionVersion: 1, projectionState: "published" }]);

      const result = await writer.upsert(baseRecord, 1);

      expect(result).toBe("APPLIED");
      expect(mockUpdate.set).toHaveBeenCalledWith(expect.objectContaining({ projectionState: "published" }));
    });

    it("newer withdraw returns APPLIED", async () => {
      mockSelect.for.mockResolvedValueOnce([{ recordVersion: 5, executionVersion: 1, projectionState: "published" }]);

      const result = await writer.removeById("proj-1", 5, 2);

      expect(result).toBe("APPLIED");
      expect(mockUpdate.set).toHaveBeenCalledWith(expect.objectContaining({ projectionState: "withdrawn" }));
    });

    it("older publish returns STALE", async () => {
      mockSelect.for.mockResolvedValueOnce([{ recordVersion: 6, executionVersion: 1, projectionState: "published" }]);

      const result = await writer.upsert(baseRecord, 1);

      expect(result).toBe("STALE");
      expect(mockUpdate.set).not.toHaveBeenCalled();
    });

    it("older withdraw returns STALE", async () => {
      mockSelect.for.mockResolvedValueOnce([{ recordVersion: 5, executionVersion: 3, projectionState: "published" }]);

      const result = await writer.removeById("proj-1", 5, 2);

      expect(result).toBe("STALE");
      expect(mockDelete.where).not.toHaveBeenCalled();
    });

    it("same tuple publish + published returns IDEMPOTENT", async () => {
      mockSelect.for.mockResolvedValueOnce([{ recordVersion: 5, executionVersion: 1, projectionState: "published" }]);

      const result = await writer.upsert(baseRecord, 1);

      expect(result).toBe("IDEMPOTENT");
      expect(mockUpdate.set).not.toHaveBeenCalled();
    });

    it("same tuple withdraw + withdrawn returns IDEMPOTENT", async () => {
      mockSelect.for.mockResolvedValueOnce([{ recordVersion: 5, executionVersion: 1, projectionState: "withdrawn" }]);

      const result = await writer.removeById("proj-1", 5, 1);

      expect(result).toBe("IDEMPOTENT");
      expect(mockDelete.where).not.toHaveBeenCalled();
    });

    it("same tuple withdraw + published returns APPLIED (defensive advance)", async () => {
      mockSelect.for.mockResolvedValueOnce([{ recordVersion: 5, executionVersion: 1, projectionState: "published" }]);

      const result = await writer.removeById("proj-1", 5, 1);

      expect(result).toBe("APPLIED");
      expect(mockUpdate.set).toHaveBeenCalledWith(expect.objectContaining({ projectionState: "withdrawn" }));
    });

    it("same tuple publish + withdrawn returns STALE (withdrawn dominates)", async () => {
      mockSelect.for.mockResolvedValueOnce([{ recordVersion: 5, executionVersion: 1, projectionState: "withdrawn" }]);

      const result = await writer.upsert(baseRecord, 1);

      expect(result).toBe("STALE");
      expect(mockUpdate.set).not.toHaveBeenCalled();
    });
  });

  describe("Provenance mapping (D1-R2)", () => {
    it("maps official URLs exactly to INSERT and UPSERT values", async () => {
      const recordWithUrls = {
        ...baseRecord,
        officialHtmlUrl: "https://tc.gob.pe/html",
        officialPdfUrl: "https://tc.gob.pe/pdf",
        resolutionNumber: null,
      };

      mockSelect.for.mockResolvedValueOnce([]); // New record

      await writer.upsert(recordWithUrls, 1);

      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          officialHtmlUrl: "https://tc.gob.pe/html",
          officialPdfUrl: "https://tc.gob.pe/pdf",
          resolutionNumber: null,
        }),
      );

      const onConflictDoUpdateCall = mockInsert.onConflictDoUpdate.mock.calls[0][0];
      expect(onConflictDoUpdateCall.set).toEqual(
        expect.objectContaining({
          officialHtmlUrl: "https://tc.gob.pe/html",
          officialPdfUrl: "https://tc.gob.pe/pdf",
          resolutionNumber: null,
        }),
      );
    });

    it("maps null official URLs exactly to INSERT and UPSERT values", async () => {
      const recordWithNulls = {
        ...baseRecord,
        officialHtmlUrl: null,
        officialPdfUrl: null,
        resolutionNumber: "RES-NULL",
      };

      mockSelect.for.mockResolvedValueOnce([]); // New record

      await writer.upsert(recordWithNulls, 1);

      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          officialHtmlUrl: null,
          officialPdfUrl: null,
          resolutionNumber: "RES-NULL",
        }),
      );

      const onConflictDoUpdateCall = mockInsert.onConflictDoUpdate.mock.calls[0][0];
      expect(onConflictDoUpdateCall.set).toEqual(
        expect.objectContaining({
          officialHtmlUrl: null,
          officialPdfUrl: null,
          resolutionNumber: "RES-NULL",
        }),
      );
    });
  });
});
