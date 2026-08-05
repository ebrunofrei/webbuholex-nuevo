// @vitest-environment node

import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createJurisprudenceInternalApi } from "@/lib/jurisprudence-application-factory";
import { JurisprudenceApplicationError } from "@/lib/jurisprudence-application-error";
import { InMemoryJurisprudenceRepository } from "@/lib/in-memory-jurisprudence-repository";
import { mapJurisprudenceApplicationErrorToHttp } from "@/lib/jurisprudence-http-error";
import {
  createJurisprudenceRouteHandlers,
  createSqliteJurisprudenceRouteHandlers,
} from "@/lib/jurisprudence-route-handler-factory";
import { SqliteJurisprudenceRepository } from "@/lib/sqlite-jurisprudence-repository";
import { createFictitiousJurisprudenceRecord } from "@/tests/helpers/jurisprudence-record-fixture";
import type { JurisprudenceNewRecord, JurisprudenceRepositoryDependencies } from "@/types/jurisprudence-repository";
import type { JurisprudenceHttpLogEvent, JurisprudenceRouteHandlers } from "@/types/jurisprudence-http";

function dependencies(prefix: string): JurisprudenceRepositoryDependencies {
  let id = 0;
  let second = 0;
  return {
    generateId: () => `${prefix}-http-id-${++id}`,
    now: () => new Date(Date.UTC(2026, 6, 29, 16, 0, second++)).toISOString(),
  };
}

function httpRecord(seed: number): JurisprudenceNewRecord {
  const base = createFictitiousJurisprudenceRecord(seed);
  return { ...base, search: { ...base.search, editorialRelevance: seed % 101 } };
}

function publicRecord(seed: number): JurisprudenceNewRecord {
  const base = httpRecord(seed);
  return {
    ...base,
    editorialStatus: "verified",
    publicationStatus: "published",
    source: {
      ...base.source,
      type: "official_judiciary",
      name: "Fuente oficial ficticia exclusiva para pruebas",
      url: `https://official-source.invalid/test-${seed}`,
      publishedAt: "2026-01-15T00:00:00.000Z",
      retrievedAt: "2026-07-29T10:00:00.000Z",
      verificationStatus: "verified",
      verifiedAt: "2026-07-29T10:30:00.000Z",
      verifiedBy: "test-operator-opaque",
      verificationNotes: "Verificación ficticia exclusiva de la suite.",
      evidenceReference: `TEST-EVIDENCE-NO-REAL-${seed}`,
    },
  };
}

function request(url: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  if (!headers.has("accept")) headers.set("accept", "application/json");
  return new Request(url, { ...init, headers });
}

async function json(response: Response): Promise<Record<string, unknown>> {
  return response.json() as Promise<Record<string, unknown>>;
}

async function expectSuccessfulData<T>(response: Response, expectedStatus: number): Promise<T> {
  const payload = await json(response);
  expect(response.status, JSON.stringify(payload, null, 2)).toBe(expectedStatus);
  expect(payload).toMatchObject({ ok: true });
  return payload.data as T;
}

function bodyRequest(url: string, method: "POST" | "PUT", body: unknown, headers: Record<string, string> = {}): Request {
  return request(url, {
    method,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
    body: JSON.stringify(body),
  });
}

type HandlerFactory = { name: string; create: () => JurisprudenceRouteHandlers };
const memoryFactory: HandlerFactory = {
  name: "memoria",
  create: () => createJurisprudenceRouteHandlers({
    api: createJurisprudenceInternalApi({ repository: new InMemoryJurisprudenceRepository(dependencies("memory-http")) }),
    now: () => "2026-07-29T16:30:00.000Z",
    requestIdGenerator: () => "generated_request_11d",
  }),
};
const factories: readonly HandlerFactory[] = [
  memoryFactory,
  {
    name: "sqlite-memory",
    create: () => createJurisprudenceRouteHandlers({
      api: createJurisprudenceInternalApi({ repository: new SqliteJurisprudenceRepository(":memory:", dependencies("sqlite-http")) }),
      now: () => "2026-07-29T16:30:00.000Z",
      requestIdGenerator: () => "generated_request_11d",
    }),
  },
];

const opened: JurisprudenceRouteHandlers[] = [];
function open(factory: HandlerFactory): JurisprudenceRouteHandlers {
  const handlers = factory.create();
  opened.push(handlers);
  return handlers;
}

afterEach(async () => {
  await Promise.all(opened.splice(0).map((handlers) => handlers.close()));
});

describe.each(factories)("transporte HTTP no montado con $name", (factory) => {
  it("crea, reintenta idempotentemente y devuelve envelopes JSON", async () => {
    const handlers = open(factory);
    const input = { record: httpRecord(101) };
    const first = await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", input, { "idempotency-key": "http-create-101" }));
    const retry = await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", input, { "idempotency-key": "http-create-101" }));
    await expectSuccessfulData<{ id: string }>(first, 201);
    expect(first.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(first.headers.get("cache-control")).toBe("no-store");
    expect(await expectSuccessfulData<{ recordVersion: number }>(retry, 201)).toMatchObject({ recordVersion: 1 });
  });

  it("distingue conflicto de idempotencia y duplicado", async () => {
    const handlers = open(factory);
    await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", { record: httpRecord(102) }, { "idempotency-key": "http-idem-102" }));
    const idempotency = await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", { record: httpRecord(103) }, { "idempotency-key": "http-idem-102" }));
    const duplicate = await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", { record: httpRecord(102) }, { "idempotency-key": "http-idem-other-102" }));
    expect(idempotency.status).toBe(409);
    expect(await json(idempotency)).toMatchObject({ ok: false, error: { code: "IDEMPOTENCY_CONFLICT" } });
    expect(await json(duplicate)).toMatchObject({ ok: false, error: { code: "DUPLICATE_CONFLICT" } });
  });

  it("actualiza con versión, rechaza conflicto y conserva historial", async () => {
    const handlers = open(factory);
    const original = httpRecord(104);
    const createdResponse = await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", { record: original }, { "idempotency-key": "http-update-104" }));
    const { id } = await expectSuccessfulData<{ id: string }>(createdResponse, 201);
    const updatedRecord = { ...original, editorialContent: { ...original.editorialContent, editorialSummary: "Edición ficticia controlada por la prueba HTTP." } };
    const update = await handlers.internal.update(bodyRequest("https://internal.invalid/records/1", "PUT", { expectedVersion: 1, changeKind: "editorial_update", record: updatedRecord }), { id });
    const conflict = await handlers.internal.update(bodyRequest("https://internal.invalid/records/1", "PUT", { expectedVersion: 1, changeKind: "editorial_update", record: updatedRecord }), { id });
    const history = await handlers.internal.history(request("https://internal.invalid/history"), { id });
    expect(await json(update)).toMatchObject({ ok: true, data: { recordVersion: 2 } });
    expect(await json(conflict)).toMatchObject({ ok: false, error: { code: "VERSION_CONFLICT" } });
    expect(await json(history)).toMatchObject({ ok: true, data: { entries: [{ version: 1 }, { version: 2 }] } });
  });

  it("lista internamente con paginación y filtros estrictos", async () => {
    const handlers = open(factory);
    await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", { record: httpRecord(105) }, { "idempotency-key": "http-list-105" }));
    const response = await handlers.internal.listInternal(request("https://internal.invalid/records?materia=Materia%20procesal%20ficticia&page=1&pageSize=1"));
    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({ ok: true, data: { page: 1, pageSize: 1 }, meta: { pagination: { page: 1, pageSize: 1 } } });
  });

  it("busca únicamente proyecciones públicas verificadas", async () => {
    const handlers = open(factory);
    await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", { record: publicRecord(106) }, { "idempotency-key": "http-public-106" }));
    await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", { record: httpRecord(107) }, { "idempotency-key": "http-private-107" }));
    const response = await handlers.public.search(request("https://public.invalid/search?q=registro%20ficticio&page=1&pageSize=10"));
    const source = JSON.stringify(await json(response));
    expect(response.status).toBe(200);
    expect(source).not.toMatch(/verifiedBy|verificationNotes|generatedContent|editorialNotes|internalLocation|opaque-test-operator/);
    expect(source).toContain("fixture-no-publicable-106");
    expect(source).not.toContain("fixture-no-publicable-107");
  });

  it("hace indistinguibles el detalle privado y el inexistente", async () => {
    const handlers = open(factory);
    await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", { record: httpRecord(108) }, { "idempotency-key": "http-private-108" }));
    const privateResponse = await handlers.public.detail(request("https://public.invalid/detail"), { slug: "fixture-no-publicable-108" });
    const missingResponse = await handlers.public.detail(request("https://public.invalid/detail"), { slug: "missing-record" });
    const privatePayload = await json(privateResponse);
    const missingPayload = await json(missingResponse);
    expect(privateResponse.status).toBe(404);
    expect(missingResponse.status).toBe(404);
    expect(privatePayload).toMatchObject({ ok: false, error: { code: "NOT_FOUND", message: "No se encontró el recurso solicitado." } });
    expect(missingPayload).toMatchObject({ ok: false, error: { code: "NOT_FOUND", message: "No se encontró el recurso solicitado." } });
    expect(privatePayload.error).toEqual(missingPayload.error);
    expect(Object.keys(privatePayload).sort()).toEqual(Object.keys(missingPayload).sort());
  });

  it("devuelve detalle público sin campos internos", async () => {
    const handlers = open(factory);
    await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", { record: publicRecord(109) }, { "idempotency-key": "http-detail-109" }));
    const response = await handlers.public.detail(request("https://public.invalid/detail"), { slug: "fixture-no-publicable-109" });
    const source = JSON.stringify(await json(response));
    expect(response.status).toBe(200);
    expect(source).not.toMatch(/verifiedBy|verificationNotes|generatedContent|editorialNotes|internalLocation|deduplicationKey/);
  });

  it("evalúa publicación sin mutar", async () => {
    const handlers = open(factory);
    const createdResponse = await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", { record: httpRecord(110) }, { "idempotency-key": "http-evaluate-110" }));
    const { id } = await expectSuccessfulData<{ id: string }>(createdResponse, 201);
    const evaluation = await handlers.internal.evaluatePublication(request("https://internal.invalid/evaluate"), { id });
    expect(await json(evaluation)).toMatchObject({ ok: true, data: { publicable: false, recordVersion: 1 } });
  });

  it("cierra una vez y rechaza operaciones posteriores", async () => {
    const handlers = factory.create();
    await handlers.close();
    await handlers.close();
    const response = await handlers.public.search(request("https://public.invalid/search"));
    expect(response.status).toBe(503);
    expect(await json(response)).toMatchObject({ ok: false, error: { code: "SERVICE_UNAVAILABLE" } });
  });
});

describe("validación de Request y Response", () => {
  it("rechaza método y comunica Allow sin invocar la operación", async () => {
    const handlers = open(memoryFactory);
    const response = await handlers.public.search(request("https://public.invalid/search", { method: "POST" }));
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
  });

  it("rechaza Accept incompatible y no añade CORS", async () => {
    const handlers = open(memoryFactory);
    const response = await handlers.public.search(new Request("https://public.invalid/search", { headers: { accept: "text/html" } }));
    expect(response.status).toBe(406);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("rechaza query desconocida, repetida y demasiado larga", async () => {
    const handlers = open(memoryFactory);
    expect((await handlers.public.search(request("https://public.invalid/search?sql=select"))).status).toBe(400);
    expect((await handlers.public.search(request("https://public.invalid/search?q=uno&q=dos"))).status).toBe(400);
    const limited = createJurisprudenceRouteHandlers({
      api: createJurisprudenceInternalApi({ repository: new InMemoryJurisprudenceRepository() }),
      requestIdGenerator: () => "query_limit_request",
      now: () => "2026-07-29T16:30:00.000Z",
      maxQueryLength: 256,
    });
    opened.push(limited);
    expect((await limited.public.search(request(`https://public.invalid/search?q=${"x".repeat(300)}`))).status).toBe(400);
  });

  it("rechaza paginación, fechas y rangos inválidos", async () => {
    const handlers = open(memoryFactory);
    expect((await handlers.public.search(request("https://public.invalid/search?page=0"))).status).toBe(400);
    expect((await handlers.public.search(request("https://public.invalid/search?pageSize=51"))).status).toBe(400);
    expect((await handlers.public.search(request("https://public.invalid/search?fechaDesde=2026-99-99"))).status).toBe(400);
    expect((await handlers.public.search(request("https://public.invalid/search?fechaDesde=2026-02-01&fechaHasta=2026-01-01"))).status).toBe(400);
  });

  it("exige application/json e idempotency-key", async () => {
    const handlers = open(memoryFactory);
    const plain = request("https://internal.invalid/records", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" });
    expect((await handlers.internal.create(plain)).status).toBe(415);
    expect((await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", { record: httpRecord(111) }))).status).toBe(400);
    expect((await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", { record: httpRecord(111) }, { "idempotency-key": "bad key" }))).status).toBe(400);
  });

  it("exige versión y changeKind válidos para actualizar", async () => {
    const handlers = open(memoryFactory);
    const record = httpRecord(113);
    const created = await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", { record }, { "idempotency-key": "http-update-contract-113" }));
    const { id } = await expectSuccessfulData<{ id: string }>(created, 201);
    expect((await handlers.internal.update(bodyRequest("https://internal.invalid/records/1", "PUT", { changeKind: "editorial_update", record }), { id })).status).toBe(400);
    expect((await handlers.internal.update(bodyRequest("https://internal.invalid/records/1", "PUT", { expectedVersion: 1, changeKind: "unknown", record }), { id })).status).toBe(400);
  });

  it("rechaza cuerpo vacío, JSON inválido, arrays y propiedades desconocidas", async () => {
    const handlers = open(memoryFactory);
    const empty = request("https://internal.invalid/records", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "http-empty-112" } });
    const malformed = request("https://internal.invalid/records", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "http-bad-json-112" }, body: "{" });
    expect((await handlers.internal.create(empty)).status).toBe(400);
    expect((await handlers.internal.create(malformed)).status).toBe(400);
    expect((await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", [], { "idempotency-key": "http-array-112" }))).status).toBe(400);
    expect((await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", { record: httpRecord(112), sql: "SELECT" }, { "idempotency-key": "http-unknown-112" }))).status).toBe(400);
  });

  it("rechaza body excedido por Content-Length y por bytes reales", async () => {
    const handlers = open(memoryFactory);
    const declared = bodyRequest("https://internal.invalid/records", "POST", {}, { "idempotency-key": "http-size-declared", "content-length": "999999" });
    expect((await handlers.internal.create(declared)).status).toBe(413);
    const limited = createJurisprudenceRouteHandlers({
      api: createJurisprudenceInternalApi({ repository: new InMemoryJurisprudenceRepository() }),
      requestIdGenerator: () => "body_limit_request",
      now: () => "2026-07-29T16:30:00.000Z",
      maxBodyBytes: 1_024,
    });
    opened.push(limited);
    const actual = bodyRequest("https://internal.invalid/records", "POST", { record: "x".repeat(2_000) }, { "idempotency-key": "http-size-actual" });
    expect((await limited.internal.create(actual)).status).toBe(413);
  });

  it("preserva requestId válido, reemplaza inválido y genera uno ausente", async () => {
    const handlers = open(memoryFactory);
    const valid = await handlers.public.search(request("https://public.invalid/search", { headers: { "x-request-id": "valid_request_123" } }));
    const invalid = await handlers.public.search(request("https://public.invalid/search", { headers: { "x-request-id": "bad value" } }));
    const generated = await handlers.public.search(request("https://public.invalid/search"));
    expect(valid.headers.get("x-request-id")).toBe("valid_request_123");
    expect(invalid.headers.get("x-request-id")).toBe("generated_request_11d");
    expect(generated.headers.get("x-request-id")).toBe("generated_request_11d");
  });

  it("registra solo metadatos HTTP permitidos", async () => {
    const events: JurisprudenceHttpLogEvent[] = [];
    const handlers = createJurisprudenceRouteHandlers({
      api: createJurisprudenceInternalApi({ repository: new InMemoryJurisprudenceRepository() }),
      requestIdGenerator: () => "safe_logger_request",
      now: () => "2026-07-29T16:30:00.000Z",
      logger: { log: (event) => events.push(event) },
    });
    opened.push(handlers);
    await handlers.public.search(request("https://public.invalid/search?q=contenido%20juridico%20privado"));
    expect(events.map((event) => event.phase)).toEqual(["request_received", "request_completed"]);
    expect(JSON.stringify(events)).not.toMatch(/contenido|juridico|query|body|headers|cookie|authorization|SQL|sqlite|idempotency/i);
  });

  it("mapea errores de aplicación sin filtrar mensajes", () => {
    const cases = [
      ["VALIDATION_ERROR", 400, "BAD_REQUEST"], ["NOT_FOUND", 404, "NOT_FOUND"],
      ["NOT_PUBLIC", 404, "NOT_FOUND"], ["DUPLICATE_CONFLICT", 409, "DUPLICATE_CONFLICT"],
      ["IDEMPOTENCY_CONFLICT", 409, "IDEMPOTENCY_CONFLICT"], ["VERSION_CONFLICT", 409, "VERSION_CONFLICT"],
      ["PUBLICATION_BLOCKED", 422, "PUBLICATION_BLOCKED"], ["REPOSITORY_UNAVAILABLE", 503, "SERVICE_UNAVAILABLE"],
      ["RESOURCE_CLOSED", 503, "SERVICE_UNAVAILABLE"], ["INTERNAL_ERROR", 500, "INTERNAL_ERROR"],
    ] as const;
    for (const [code, status, publicCode] of cases) {
      const mapped = mapJurisprudenceApplicationErrorToHttp(new JurisprudenceApplicationError(code, "SQL C:\\private\\database.sqlite secret"));
      expect(mapped).toMatchObject({ status, code: publicCode });
      expect(mapped.message).not.toMatch(/SQL|private|database|secret/);
    }
  });
});

describe("persistencia SQLite y seguridad estática", () => {
  it("persiste en archivo temporal, cierra, reabre, lee y limpia", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "buholex-http-test-"));
    const databasePath = path.join(directory, "transport.sqlite");
    let first: JurisprudenceRouteHandlers | undefined;
    let reopened: JurisprudenceRouteHandlers | undefined;
    try {
      first = createSqliteJurisprudenceRouteHandlers({ databasePath, requestIdGenerator: () => "sqlite_file_request", now: () => "2026-07-29T17:00:00.000Z" });
      const createdResponse = await first.internal.create(bodyRequest("https://internal.invalid/records", "POST", { record: httpRecord(120) }, { "idempotency-key": "http-file-120" }));
      const { id } = await expectSuccessfulData<{ id: string }>(createdResponse, 201);
      await first.close();
      reopened = createSqliteJurisprudenceRouteHandlers({ databasePath, requestIdGenerator: () => "sqlite_reopen_request", now: () => "2026-07-29T17:10:00.000Z" });
      expect((await reopened.internal.getInternal(request("https://internal.invalid/record"), { id })).status).toBe(200);
      expect((await reopened.internal.history(request("https://internal.invalid/history"), { id })).status).toBe(200);
      await reopened.close();
      expect(statSync(databasePath).isFile()).toBe(true);
    } finally {
      try {
        if (reopened !== undefined) await reopened.close();
      } finally {
        try {
          if (first !== undefined) await first.close();
        } finally {
          rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        }
      }
    }
    expect(() => statSync(directory)).toThrow();
  });

  it("no expone API o adaptador desde los handlers", () => {
    const handlers = open(memoryFactory);
    expect(Object.keys(handlers).sort()).toEqual(["close", "internal", "public"]);
    expect(handlers).not.toHaveProperty("api");
    expect(handlers).not.toHaveProperty("repository");
    expect(handlers).not.toHaveProperty("adapter");
  });

  it("entrega DTO interno sin ubicación privada, SQL o stack", async () => {
    const handlers = open(memoryFactory);
    const created = await handlers.internal.create(bodyRequest("https://internal.invalid/records", "POST", { record: httpRecord(121) }, { "idempotency-key": "http-internal-safe-121" }));
    const { id } = await expectSuccessfulData<{ id: string }>(created, 201);
    const response = await handlers.internal.getInternal(request("https://internal.invalid/record"), { id });
    expect(JSON.stringify(await json(response))).not.toMatch(/internalLocation|SELECT|sqlite|stack/i);
  });

  it("mantiene el transporte sin montar y desconectado de UI", () => {
    const authorizedRouteFiles = [
      "app/api/owl/admission/route.ts",
    ];
    const appFiles = readdirSync(path.join(process.cwd(), "app"), { recursive: true }).filter(
      (entry): entry is string => typeof entry === "string",
    );
    const routeFiles = appFiles
      .filter((entry) => /(^|[\\/])route\.ts$/.test(entry))
      .map((entry) => path.relative(process.cwd(), path.join(process.cwd(), "app", entry)).split(path.sep).join("/"));
    expect(routeFiles.sort()).toEqual(authorizedRouteFiles.sort());
    // jurisprudencia no crea ni consume rutas API propias
    expect(appFiles.some((entry) => /(^|[\\/])api([\\/]|$)/.test(entry) && /jurisprudence/.test(entry))).toBe(false);
    const uiSource = ["app", "components", "data"].flatMap((root) => readdirSync(path.join(process.cwd(), root), { recursive: true })
      .filter(
        (entry): entry is string =>
          typeof entry === "string" && /\.(ts|tsx)$/.test(entry),
      )
      .map((entry) => readFileSync(path.join(process.cwd(), root, entry), "utf8"))).join("\n");
    expect(uiSource).not.toMatch(/jurisprudence-(?:http|route-handler)/);
    expect(readFileSync(path.join(process.cwd(), "app/jurisprudencia/page.tsx"), "utf8")).not.toMatch(/fetch\(|jurisprudence-(?:http|route-handler)/);
  });

  it("no reexporta transporte ni incorpora any explícito", () => {
    const files = [
      "types/jurisprudence-http.ts", "lib/schemas/jurisprudence-http.ts", "lib/jurisprudence-http-error.ts",
      "lib/jurisprudence-http-response.ts", "lib/jurisprudence-http-request.ts", "lib/jurisprudence-http-controller.ts",
      "lib/jurisprudence-route-handler-factory.ts",
    ];
    const source = files.map((file) => readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
    expect(source).not.toMatch(/\bany\b/);
    expect(readFileSync(path.join(process.cwd(), "types/domain.ts"), "utf8")).not.toMatch(/jurisprudence-http/);
    expect(readFileSync(path.join(process.cwd(), "lib/schemas.ts"), "utf8")).not.toMatch(/jurisprudence-http/);
  });

  it("preserva productos, descargas y ausencia de publicación", () => {
    const catalog = readFileSync(path.join(process.cwd(), "data/template-catalog.ts"), "utf8");
    const services = readFileSync(path.join(process.cwd(), "data/services.ts"), "utf8");
    expect(catalog).toMatch(/availabilityStatus\s*:\s*"editorial_preview"/);
    expect(catalog).toMatch(/publicationAuthorization\s*:\s*\{\s*authorized:\s*false/);
    expect(catalog).toMatch(/price:\s*null[\s\S]*currency:\s*null[\s\S]*licenseStatus:\s*"pending"/);
    expect(catalog).toMatch(/publiclyVisible:\s*false[\s\S]*downloadable:\s*false/);
    expect(catalog).toMatch(/publicDownloadAuthorized:\s*false/);
    expect(services).toMatch(/id:\s*"SRV-WEB-001"[\s\S]*price:\s*null[\s\S]*published:\s*false/);
  });

  it("no añade CORS, autorización ficticia, URL local ni datos reales", () => {
    const source = readFileSync(path.join(process.cwd(), "lib/jurisprudence-http-controller.ts"), "utf8")
      + readFileSync(path.join(process.cwd(), "lib/jurisprudence-route-handler-factory.ts"), "utf8");
    expect(source).not.toMatch(/Access-Control-Allow-Origin|Authorization|x-user-id|x-role|x-admin|x-actor|localhost|127\.0\.0\.1/);
    expect(source).not.toMatch(/DNI|correo|teléfono|domicilio|partyName/i);
  });
});
