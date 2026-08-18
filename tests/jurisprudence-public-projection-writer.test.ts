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

  beforeEach(() => {
    writer = new PostgresJurisprudencePublicProjectionWriter();
    mockTx = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
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
    recordVersion: 1,
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
  };

  it("should generate normalized search text using only public fields", async () => {
    await writer.upsert(baseRecord);

    expect(mockTx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        normalizedSearchText: "Title 1 Case 1 123-2023 RES-1 Auto Inst Body Civil A summary Source",
      })
    );
  });

  it("should handle null summary when generating search text", async () => {
    const record = { ...baseRecord, summary: null };
    await writer.upsert(record);

    expect(mockTx.values).toHaveBeenCalledWith(
      expect.objectContaining({
        normalizedSearchText: "Title 1 Case 1 123-2023 RES-1 Auto Inst Body Civil Source",
      })
    );
  });

  it("should call upsert with the correct values and onConflictDoUpdate", async () => {
    await writer.upsert(baseRecord);

    expect(getJurisprudencePublicWriteDatabase).toHaveBeenCalled();
    expect(withJurisprudencePublicWriteRole).toHaveBeenCalledWith(mockDb, expect.any(Function));
    
    expect(mockTx.insert).toHaveBeenCalled();
    expect(mockTx.values).toHaveBeenCalledWith(expect.objectContaining({
      id: "proj-1",
      recordVersion: 1,
    }));
    expect(mockTx.onConflictDoUpdate).toHaveBeenCalled();
  });

  it("should call removeById correctly", async () => {
    await writer.removeById("proj-1");

    expect(getJurisprudencePublicWriteDatabase).toHaveBeenCalled();
    expect(withJurisprudencePublicWriteRole).toHaveBeenCalledWith(mockDb, expect.any(Function));
    
    expect(mockTx.delete).toHaveBeenCalled();
    expect(mockTx.where).toHaveBeenCalled();
  });
});
