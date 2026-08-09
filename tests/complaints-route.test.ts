import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
import { POST } from "@/app/api/complaints/route";
import * as runtimeModule from "@/lib/complaints/complaints-runtime";
import { ComplaintsValidationError, ComplaintsServiceUnavailableError } from "@/lib/complaints/complaints-errors";
import { readFileSync } from "fs";
import path from "path";

vi.mock("@/lib/complaints/complaints-runtime", () => ({
  submitComplaintRuntime: vi.fn(),
}));

describe("POST /api/complaints", () => {
  const validUrl = "https://www.buholex.com/api/complaints";
  const validOrigin = "https://www.buholex.com";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createRequest(options: {
    body?: string;
    contentType?: string;
    origin?: string | null;
    host?: string;
    contentLength?: string;
  }) {
    const headers = new Headers();
    if (options.contentType !== undefined) headers.set("content-type", options.contentType);
    if (options.origin !== undefined && options.origin !== null) headers.set("origin", options.origin);
    if (options.host !== undefined) headers.set("host", options.host);
    if (options.contentLength !== undefined) headers.set("content-length", options.contentLength);

    return new Request(validUrl, {
      method: "POST",
      headers,
      body: options.body ? new TextEncoder().encode(options.body) : null,
      duplex: "half",
    } as unknown as Request);
  }

  it("rechaza origin inválido con 403 (mismatched origin/host)", async () => {
    const req = createRequest({
      body: "{}",
      contentType: "application/json",
      origin: "https://evil.com",
      host: "www.buholex.com"
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json).toEqual({ success: false, error: { code: "forbidden" } });
    expect(runtimeModule.submitComplaintRuntime).not.toHaveBeenCalled();
  });

  it("rechaza content type que no sea application/json con 415", async () => {
    const req = createRequest({
      body: "{}",
      contentType: "text/plain",
      origin: validOrigin,
      host: "www.buholex.com"
    });
    const res = await POST(req);
    expect(res.status).toBe(415);
    const json = await res.json();
    expect(json).toEqual({ success: false, error: { code: "unsupported_media_type" } });
  });

  it("rechaza body mayor al límite (header content-length) con 413", async () => {
    const req = createRequest({
      body: "{}",
      contentType: "application/json",
      origin: validOrigin,
      host: "www.buholex.com",
      contentLength: "999999"
    });
    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it("rechaza malformed JSON con 400", async () => {
    const req = createRequest({
      body: "{ bad json }",
      contentType: "application/json",
      origin: validOrigin,
      host: "www.buholex.com"
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toEqual({ success: false, error: { code: "bad_request" } });
  });

  it("rechaza JSON sin object properties / primitivo con 422", async () => {
    const req = createRequest({
      body: "\"string\"",
      contentType: "application/json",
      origin: validOrigin,
      host: "www.buholex.com"
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("rechaza sin idempotencyKey con 422 (falla pre-validación ruta)", async () => {
    const req = createRequest({
      body: "{\"some\":\"field\"}",
      contentType: "application/json",
      origin: validOrigin,
      host: "www.buholex.com"
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("creación exitosa retorna 201 y oculta internals", async () => {
    vi.mocked(runtimeModule.submitComplaintRuntime).mockResolvedValue({
      kind: "created",
      complaintId: "c-123",
      sheetNumber: "LR-2026-000001",
      status: "received",
      submittedAt: new Date(),
      deadlineAt: "2026-08-27",
      privateToken: "synth-token-123"
    });

    const req = createRequest({
      body: JSON.stringify({ idempotencyKey: "12345678" }),
      contentType: "application/json",
      origin: validOrigin,
      host: "www.buholex.com"
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({
      success: true,
      status: "created",
      sheetNumber: "LR-2026-000001",
      privateToken: "synth-token-123"
    });
    expect(json).not.toHaveProperty("complaintId");
    expect(json).not.toHaveProperty("payloadHash");
  });

  it("replay idempotente retorna 200 sin privateToken", async () => {
    vi.mocked(runtimeModule.submitComplaintRuntime).mockResolvedValue({
      kind: "already_exists",
      complaintId: "c-123",
      sheetNumber: "LR-2026-000001",
      status: "received",
      submittedAt: new Date(),
      deadlineAt: "2026-08-27",
    });

    const req = createRequest({
      body: JSON.stringify({ idempotencyKey: "12345678" }),
      contentType: "application/json",
      origin: validOrigin,
      host: "www.buholex.com"
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      success: true,
      status: "already_exists",
      sheetNumber: "LR-2026-000001",
    });
    expect(json).not.toHaveProperty("privateToken");
  });

  it("error de validación de dominio devuelve 422", async () => {
    vi.mocked(runtimeModule.submitComplaintRuntime).mockRejectedValue(new ComplaintsValidationError("complaint_validation_failed"));

    const req = createRequest({
      body: JSON.stringify({ idempotencyKey: "12345678" }),
      contentType: "application/json",
      origin: validOrigin,
      host: "www.buholex.com"
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json).toEqual({ success: false, error: { code: "validation_failed" } });
  });

  it("service controlled failure (PersistenceError) devuelve 503", async () => {
    vi.mocked(runtimeModule.submitComplaintRuntime).mockRejectedValue(new ComplaintsServiceUnavailableError("complaint_transaction_failed"));

    const req = createRequest({
      body: JSON.stringify({ idempotencyKey: "12345678" }),
      contentType: "application/json",
      origin: validOrigin,
      host: "www.buholex.com"
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json).toEqual({ success: false, error: { code: "service_unavailable" } });
  });

  it("unexpected internal failure devuelve 500 sanitized", async () => {
    vi.mocked(runtimeModule.submitComplaintRuntime).mockRejectedValue(new Error("Sensitive DB Password Leaked!"));

    const req = createRequest({
      body: JSON.stringify({ idempotencyKey: "12345678" }),
      contentType: "application/json",
      origin: validOrigin,
      host: "www.buholex.com"
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ success: false, error: { code: "internal_server_error" } });
  });



  it("estáticamente comprueba que route.ts NO contiene imports a base de datos", () => {
    const routeCode = readFileSync(path.join(process.cwd(), "app/api/complaints/route.ts"), "utf-8");
    expect(routeCode).not.toContain("@/database/");
    expect(routeCode).not.toMatch(/from\s+["'](\.\.\/)*database\//);
    expect(routeCode).not.toContain("getComplaintsApiDatabase");
    expect(routeCode).not.toContain("createComplaintsApiPersistenceAdapter");
    expect(routeCode).not.toContain("createComplaintsRepository");
    expect(routeCode).not.toContain("ComplaintPersistenceError");
    expect(routeCode).not.toContain("SanitizedDatabaseConstraintError");
    expect(routeCode).not.toContain("drizzle-orm");
    expect(routeCode).not.toContain("postgres");
  });
});
