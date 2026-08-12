import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "@/app/api/admin/complaints/route";
import { listAdminComplaintsRepository } from "@/database/repositories/admin-complaints-read.repository";
import * as fs from "fs";
import * as path from "path";

import { resolveTrustedAdminPrincipal } from "@/lib/authorization/authorization-resolver";


vi.mock("@/lib/auth/session", () => ({
  getWorkspaceSession: vi.fn().mockResolvedValue({ status: "authenticated", provider: "auth0", providerSubjectId: "auth0|sub" }),
}));

vi.mock("@/database/client", () => ({
  getAuthorizationDatabase: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/authorization/authorization-resolver", () => ({
  resolveTrustedAdminPrincipal: vi.fn(),
}));

vi.mock("@/database/repositories/admin-complaints-read.repository", () => ({
  listAdminComplaintsRepository: vi.fn(),
}));

describe("Admin Complaints Protected Read API (GET /api/admin/complaints)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockValidPrincipal = {
    operatorId: "operator-123",
    identitySource: "authenticated_session" as const,
  };

  const createRequest = (url: string) => new Request(`https://admin.buholex.com${url}`, { method: "GET" });

  describe("Authorization Flow", () => {
    it("A. unauthenticated -> 401", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "unauthenticated" });
      const res = await GET(createRequest("/api/admin/complaints"));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ success: false, error: { code: "unauthorized" } });
    });

    it("B. unmapped identity -> 403", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "operator_not_mapped" });
      const res = await GET(createRequest("/api/admin/complaints"));
      expect(res.status).toBe(403);
    });

    it("C. suspended operator -> 403", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "operator_inactive" });
      const res = await GET(createRequest("/api/admin/complaints"));
      expect(res.status).toBe(403);
    });

    it("D. missing complaints:read -> 403", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "capability_missing" });
      const res = await GET(createRequest("/api/admin/complaints"));
      expect(res.status).toBe(403);
    });

    it("E. complaints:respond only -> 403 / AP", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "capability_missing" });
      const res = await GET(createRequest("/api/admin/complaints"));
      expect(res.status).toBe(403);
      // Verify it requested complaints:read and not complaints:respond
      expect(resolveTrustedAdminPrincipal).toHaveBeenCalledWith(expect.anything(), "complaints:read", expect.anything());
    });

    it("F. complaints:read -> 200", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "authorized", principal: mockValidPrincipal });
      vi.mocked(listAdminComplaintsRepository).mockResolvedValue([]);
      const res = await GET(createRequest("/api/admin/complaints"));
      expect(res.status).toBe(200);
      expect(resolveTrustedAdminPrincipal).toHaveBeenCalledWith(expect.anything(), "complaints:read", expect.anything());
    });

    it("G. authorization DB unavailable -> 503", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "authorization_unavailable" });
      const res = await GET(createRequest("/api/admin/complaints"));
      expect(res.status).toBe(503);
    });
  });

  describe("Query Validation", () => {
    beforeEach(() => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "authorized", principal: mockValidPrincipal });
      vi.mocked(listAdminComplaintsRepository).mockResolvedValue([]);
    });

    it("I. invalid status -> 400", async () => {
      const res = await GET(createRequest("/api/admin/complaints?status=invalid_status"));
      expect(res.status).toBe(400);
    });

    it("J. limit 0 -> 400", async () => {
      const res = await GET(createRequest("/api/admin/complaints?limit=0"));
      expect(res.status).toBe(400);
    });

    it("K/AK. limit > 50 -> 400 (51 rejected)", async () => {
      const res = await GET(createRequest("/api/admin/complaints?limit=51"));
      expect(res.status).toBe(400);
    });

    it("AJ. exactly 50 accepted", async () => {
      const res = await GET(createRequest("/api/admin/complaints?limit=50"));
      expect(res.status).toBe(200);
      expect(listAdminComplaintsRepository).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
    });

    it("AI. limit default = 20", async () => {
      const res = await GET(createRequest("/api/admin/complaints"));
      expect(res.status).toBe(200);
      expect(listAdminComplaintsRepository).toHaveBeenCalledWith(expect.objectContaining({ limit: 20 }));
    });
  });

  describe("Cursor Validation", () => {
    beforeEach(() => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "authorized", principal: mockValidPrincipal });
      vi.mocked(listAdminComplaintsRepository).mockResolvedValue([]);
    });

    const createCursorStr = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    
    const validId = "12345678-1234-1234-1234-123456789012";

    it("L. invalid cursor syntax -> 400", async () => {
      const res = await GET(createRequest("/api/admin/complaints?cursor=invalid-base64!"));
      expect(res.status).toBe(400);
    });

    it("M/AE. cursor wrong version -> 400", async () => {
      const cursor = createCursorStr({ v: 2, submittedAt: 123, id: validId });
      const res = await GET(createRequest(`/api/admin/complaints?cursor=${cursor}`));
      expect(res.status).toBe(400);
    });

    it("N/AC. cursor created without status + request with status -> 400", async () => {
      const cursor = createCursorStr({ v: 1, submittedAt: 123, id: validId });
      const res = await GET(createRequest(`/api/admin/complaints?status=received&cursor=${cursor}`));
      expect(res.status).toBe(400);
    });

    it("N/AD. cursor created with status + request without status -> 400", async () => {
      const cursor = createCursorStr({ v: 1, submittedAt: 123, id: validId, status: "received" });
      const res = await GET(createRequest(`/api/admin/complaints?cursor=${cursor}`));
      expect(res.status).toBe(400);
    });

    it("AF. cursor invalid UUID -> 400", async () => {
      const cursor = createCursorStr({ v: 1, submittedAt: 123, id: "invalid-uuid" });
      const res = await GET(createRequest(`/api/admin/complaints?cursor=${cursor}`));
      expect(res.status).toBe(400);
    });

    it("AG. cursor non-finite/invalid timestamp -> 400", async () => {
      const cursor = createCursorStr({ v: 1, submittedAt: "not-a-number", id: validId });
      const res = await GET(createRequest(`/api/admin/complaints?cursor=${cursor}`));
      expect(res.status).toBe(400);
    });

    it("AH. cursor exceeds max length -> 400", async () => {
      const veryLongCursor = "a".repeat(600);
      const res = await GET(createRequest(`/api/admin/complaints?cursor=${veryLongCursor}`));
      expect(res.status).toBe(400);
    });
  });

  describe("Pagination and Responses", () => {
    beforeEach(() => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "authorized", principal: mockValidPrincipal });
    });

    it("R. empty result -> 200 with items []", async () => {
      vi.mocked(listAdminComplaintsRepository).mockResolvedValue([]);
      const res = await GET(createRequest("/api/admin/complaints"));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ items: [] });
    });

    it("P. pagination nextCursor derived from limit + 1", async () => {
      const items = Array.from({ length: 3 }).map((_, i) => ({
        complaintId: `00000000-0000-0000-0000-00000000000${i}`,
        sheetNumber: `LR-2023-${i}`,
        status: "received" as const,
        submittedAt: new Date(1000 - i).toISOString(),
        deadlineAt: "2023-12-31",
        updatedAt: new Date().toISOString(),
      }));

      vi.mocked(listAdminComplaintsRepository).mockResolvedValue([...items]);

      const res = await GET(createRequest("/api/admin/complaints?limit=2"));
      expect(res.status).toBe(200);
      const data = await res.json();
      
      expect(data.items).toHaveLength(2);
      expect(data.items[0].complaintId).toBe("00000000-0000-0000-0000-000000000000");
      expect(data.nextCursor).toBeDefined();

      const decoded = JSON.parse(Buffer.from(data.nextCursor.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
      expect(decoded.id).toBe("00000000-0000-0000-0000-000000000001");
    });

    it("AN. response has exactly approved keys, forbidden fields absent", async () => {
      vi.mocked(listAdminComplaintsRepository).mockResolvedValue([
        {
          complaintId: "123",
          sheetNumber: "LR-1",
          status: "received",
          submittedAt: "2023-01-01T00:00:00Z",
          deadlineAt: "2023-01-15",
          updatedAt: "2023-01-01T00:00:00Z",
        }
      ]);

      const res = await GET(createRequest("/api/admin/complaints"));
      const data = await res.json();
      
      const item = data.items[0];
      const keys = Object.keys(item);
      
      expect(keys.sort()).toEqual([
        "complaintId", "deadlineAt", "sheetNumber", "status", "submittedAt", "updatedAt"
      ].sort());

      // explicitly check forbidden fields absent
      expect(item.payloadSnapshot).toBeUndefined();
      expect(item.operatorId).toBeUndefined();
      expect(item.providerSubjectId).toBeUndefined();
      expect(item.privateTokenHash).toBeUndefined();
    });

    it("AB. Cache-Control no-store", async () => {
      vi.mocked(listAdminComplaintsRepository).mockResolvedValue([]);
      const res = await GET(createRequest("/api/admin/complaints"));
      expect(res.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    });
  });

  describe("Static Assertions & Database Boundaries", () => {
    it("H/AL. read DB unavailable -> 503 / missing config", async () => {
      vi.mocked(resolveTrustedAdminPrincipal).mockResolvedValue({ kind: "authorized", principal: mockValidPrincipal });
      vi.mocked(listAdminComplaintsRepository).mockRejectedValue(new Error("complaints_admin_read_database_configuration_missing"));
      
      const res = await GET(createRequest("/api/admin/complaints"));
      expect(res.status).toBe(503);
    });

    it("AM. read DB config never falls back to write DB", () => {
      const configSource = fs.readFileSync(path.join(process.cwd(), "database/config.ts"), "utf-8");
      expect(configSource).toContain("DATABASE_ADMIN_READ_URL");
      
      // Ensure read config does NOT use DATABASE_ADMIN_URL
      const readConfigFn = configSource.match(/export function readComplaintsAdminReadDatabaseConfig[\s\S]*?}/);
      expect(readConfigFn![0]).not.toContain("DATABASE_ADMIN_URL");
      expect(readConfigFn![0]).toContain("DATABASE_ADMIN_READ_URL");
    });

    it("S/T/W/Z/AA. Repository explicitly selects safe columns, avoids SELECT *, avoids write runtime", () => {
      const repoSource = fs.readFileSync(path.join(process.cwd(), "database/repositories/admin-complaints-read.repository.ts"), "utf-8");
      
      expect(repoSource).toContain("withComplaintsAdminReadRole");
      expect(repoSource).not.toContain("withComplaintsAdminRole");
      expect(repoSource).not.toContain("withComplaintsApiRole");

      expect(repoSource).toContain("getComplaintsAdminReadDatabase");
      expect(repoSource).not.toContain("getComplaintsAdminDatabase");

      // Verify no select * and no forbidden columns
      expect(repoSource).not.toContain("select()");
      expect(repoSource).not.toContain("payloadSnapshot");
      expect(repoSource).not.toContain("privateTokenHash");

      // Check the selected columns explicitly
      expect(repoSource).toMatch(/id:\s*complaints\.id/);
      expect(repoSource).toMatch(/sheet_number:\s*complaints\.sheetNumber/);
      expect(repoSource).toMatch(/status:\s*complaints\.status/);
      expect(repoSource).toMatch(/submitted_at:\s*complaints\.submittedAt/);
      expect(repoSource).toMatch(/deadline_at:\s*complaints\.deadlineAt/);
      expect(repoSource).toMatch(/updated_at:\s*complaints\.updatedAt/);
    });

    it("O. Stable ordering", () => {
      const repoSource = fs.readFileSync(path.join(process.cwd(), "database/repositories/admin-complaints-read.repository.ts"), "utf-8");
      expect(repoSource).toContain("orderBy(desc(complaints.submittedAt), desc(complaints.id))");
    });
  });
});
