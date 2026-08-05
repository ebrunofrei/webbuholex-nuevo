// @vitest-environment node

import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { InMemoryJurisprudenceRepository } from "@/lib/in-memory-jurisprudence-repository";
import { JurisprudenceApplicationError, toJurisprudenceApplicationError } from "@/lib/jurisprudence-application-error";
import { JurisprudenceRepositoryError } from "@/lib/jurisprudence-repository-error";
import {
  createJurisprudenceInternalApi,
  createSqliteJurisprudenceInternalApi,
} from "@/lib/jurisprudence-application-factory";
import { SqliteJurisprudenceRepository } from "@/lib/sqlite-jurisprudence-repository";
import { createFictitiousJurisprudenceRecord } from "@/tests/helpers/jurisprudence-record-fixture";
import type { JurisprudenceSearchInput } from "@/types/jurisprudence";
import type {
  JurisprudenceApplicationContext,
  JurisprudenceApplicationLogEvent,
  JurisprudenceInternalApi,
} from "@/types/jurisprudence-application";
import type {
  JurisprudenceNewRecord,
  JurisprudenceRepository,
  JurisprudenceRepositoryDependencies,
} from "@/types/jurisprudence-repository";

function deterministicDependencies(prefix: string): JurisprudenceRepositoryDependencies {
  let idSequence = 0;
  let timeSequence = 0;
  return {
    generateId: () => `${prefix}-application-id-${String(++idSequence).padStart(3, "0")}`,
    now: () => new Date(Date.UTC(2026, 6, 29, 12, 0, timeSequence++)).toISOString(),
  };
}

function context(seed: number): JurisprudenceApplicationContext {
  return {
    requestId: `phase-11-c-request-${String(seed).padStart(3, "0")}`,
    actor: { kind: "internal_test", id: `test-actor-${String(seed).padStart(3, "0")}` },
    operationSource: "test",
    requestedAt: "2026-07-29T12:00:00.000Z",
  };
}

function searchInput(overrides: Partial<JurisprudenceSearchInput> = {}): JurisprudenceSearchInput {
  return {
    q: undefined,
    expediente: undefined,
    resolucion: undefined,
    materia: undefined,
    submateria: undefined,
    organo: undefined,
    instancia: undefined,
    distritoJudicial: undefined,
    tipoResolucion: undefined,
    fechaDesde: undefined,
    fechaHasta: undefined,
    authority: undefined,
    page: 1,
    pageSize: 20,
    sort: "relevance",
    ...overrides,
  };
}

function createPublicFictitiousRecord(seed: number): JurisprudenceNewRecord {
  const base = createFictitiousJurisprudenceRecord(seed);
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

type ApiFactory = { name: string; create: () => JurisprudenceInternalApi };

const apiFactories: readonly ApiFactory[] = [
  {
    name: "memoria",
    create: () => createJurisprudenceInternalApi({
      repository: new InMemoryJurisprudenceRepository(deterministicDependencies("memory")),
      now: () => "2026-07-29T13:00:00.000Z",
    }),
  },
  {
    name: "sqlite",
    create: () => createJurisprudenceInternalApi({
      repository: new SqliteJurisprudenceRepository(":memory:", deterministicDependencies("sqlite")),
      now: () => "2026-07-29T13:00:00.000Z",
    }),
  },
];

const openApis: JurisprudenceInternalApi[] = [];
function open(factory: ApiFactory): JurisprudenceInternalApi {
  const api = factory.create();
  openApis.push(api);
  return api;
}

afterEach(async () => {
  let seed = 900;
  await Promise.all(openApis.splice(0).map((api) => api.close(context(seed++))));
});

describe.each(apiFactories)("contrato de aplicación con $name", (factory) => {
  it("crea un registro válido sin elevar estados y preserva requestId", async () => {
    const api = open(factory);
    const result = await api.createRecord({ context: context(1), idempotencyKey: "application-create-001", record: createFictitiousJurisprudenceRecord(1) });
    expect(result).toMatchObject({ requestId: "phase-11-c-request-001", recordVersion: 1, editorialStatus: "draft", publicationStatus: "private", verificationStatus: "unverified" });
  });

  it("rechaza comandos desconocidos y campos controlados por el sistema", async () => {
    const api = open(factory);
    const recordWithSystemField: JurisprudenceNewRecord & { id: string } = { ...createFictitiousJurisprudenceRecord(2), id: "consumer-controlled-id" };
    await expect(api.createRecord({ context: context(2), idempotencyKey: "application-create-002", record: recordWithSystemField })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const commandWithUnknown: Parameters<typeof api.createRecord>[0] & { sql: string } = { context: context(3), idempotencyKey: "application-create-003", record: createFictitiousJurisprudenceRecord(3), sql: "SELECT *" };
    await expect(api.createRecord(commandWithUnknown)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("reproduce idempotencia y distingue conflicto de idempotencia", async () => {
    const api = open(factory);
    const command = { context: context(4), idempotencyKey: "application-idempotency-004", record: createFictitiousJurisprudenceRecord(4) };
    const first = await api.createRecord(command);
    const retried = await api.createRecord({ ...command, context: context(5) });
    expect(retried.id).toBe(first.id);
    await expect(api.createRecord({ context: context(6), idempotencyKey: command.idempotencyKey, record: createFictitiousJurisprudenceRecord(5) })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("traduce duplicados sin exponer la clave física", async () => {
    const api = open(factory);
    const record = createFictitiousJurisprudenceRecord(6);
    await api.createRecord({ context: context(7), idempotencyKey: "application-duplicate-a", record });
    const rejection = api.createRecord({ context: context(8), idempotencyKey: "application-duplicate-b", record });
    await expect(rejection).rejects.toMatchObject({ code: "DUPLICATE_CONFLICT" });
    await expect(rejection).rejects.not.toHaveProperty("details.deduplicationKey");
  });

  it("recupera detalle interno clonado sin ubicación privada de archivo", async () => {
    const api = open(factory);
    const result = await api.createRecord({ context: context(9), idempotencyKey: "application-get-009", record: createFictitiousJurisprudenceRecord(9) });
    const recovered = await api.getInternalRecord({ context: context(10), id: result.id });
    expect(recovered.record.id).toBe(result.id);
    expect(JSON.stringify(recovered)).not.toMatch(/internalLocation|deduplicationKey|payloadJson/);
    recovered.record.editorialContent.editorialSummary = "Mutación externa que no debe persistirse.";
    const second = await api.getInternalRecord({ context: context(11), id: result.id });
    expect(second.record.editorialContent.editorialSummary).not.toBe("Mutación externa que no debe persistirse.");
  });

  it("distingue no encontrado interno", async () => {
    const api = open(factory);
    await expect(api.getInternalRecord({ context: context(12), id: "missing-application-id" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("actualiza editorialmente, incrementa versión y preserva createdAt", async () => {
    const api = open(factory);
    const original = createFictitiousJurisprudenceRecord(13);
    const created = await api.createRecord({ context: context(13), idempotencyKey: "application-update-013", record: original });
    const updatedRecord = { ...original, editorialContent: { ...original.editorialContent, editorialSummary: "Resumen editorial modificado en la prueba de aplicación." } };
    const updated = await api.updateRecord({ context: context(14), id: created.id, expectedVersion: 1, changeKind: "editorial_update", record: updatedRecord });
    expect(updated.recordVersion).toBe(2);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt > created.updatedAt).toBe(true);
  });

  it("rechaza conflicto de versión y contradicción del tipo de cambio", async () => {
    const api = open(factory);
    const original = createFictitiousJurisprudenceRecord(15);
    const created = await api.createRecord({ context: context(15), idempotencyKey: "application-version-015", record: original });
    await expect(api.updateRecord({ context: context(16), id: created.id, expectedVersion: 99, changeKind: "editorial_update", record: original })).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    const changedSource = { ...original, source: { ...original.source, retrievedAt: "2026-07-29T11:00:00.000Z" } };
    await expect(api.updateRecord({ context: context(17), id: created.id, expectedVersion: 1, changeKind: "editorial_update", record: changedSource })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(api.updateRecord({ context: context(18), id: created.id, expectedVersion: 1, changeKind: "source_update", record: original })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("evalúa publicación sin mutar el registro", async () => {
    const api = open(factory);
    const blocked = await api.createRecord({ context: context(19), idempotencyKey: "application-publication-019", record: createFictitiousJurisprudenceRecord(19) });
    const evaluation = await api.evaluatePublication({ context: context(20), id: blocked.id });
    expect(evaluation.publicable).toBe(false);
    expect(evaluation.blockers.map((item) => item.code)).toContain("PUBLICATION_STATUS_NOT_PUBLISHED");
    expect((await api.getInternalRecord({ context: context(21), id: blocked.id })).record.recordVersion).toBe(1);
  });

  it("evalúa positivamente un registro íntegramente publicable", async () => {
    const api = open(factory);
    const created = await api.createRecord({ context: context(22), idempotencyKey: "application-public-022", record: createPublicFictitiousRecord(22) });
    await expect(api.evaluatePublication({ context: context(23), id: created.id })).resolves.toMatchObject({ publicable: true, blockers: [], recordVersion: 1 });
  });

  it("lista, busca, filtra, cuenta y pagina con DTO resumido", async () => {
    const api = open(factory);
    for (const seed of [24, 25, 26]) await api.createRecord({ context: context(seed), idempotencyKey: `application-list-${seed}`, record: createFictitiousJurisprudenceRecord(seed) });
    const page = await api.listInternalRecords({ context: context(27), input: { page: 1, pageSize: 2, sort: "issued_at_asc" } });
    expect(page).toMatchObject({ total: 3, pageSize: 2, totalPages: 2 });
    expect(JSON.stringify(page.items)).not.toMatch(/generatedContent|editorialNotes|internalLocation/);
    const filtered = await api.searchInternalRecords({ context: context(28), q: "REGISTRO FICTICIO", filters: { matter: "Materia contractual ficticia" } });
    expect(filtered.items.every((item) => item.matter === "Materia contractual ficticia")).toBe(true);
    await expect(api.countInternalRecords({ context: context(29), filters: { editorialStatus: "draft" } })).resolves.toMatchObject({ total: 3 });
  });

  it("conserva historial tipado sin rutas físicas", async () => {
    const api = open(factory);
    const original = createFictitiousJurisprudenceRecord(30);
    const created = await api.createRecord({ context: context(30), idempotencyKey: "application-history-030", record: original });
    const updatedRecord = { ...original, editorialContent: { ...original.editorialContent, editorialSummary: "Segundo estado editorial ficticio." } };
    await api.updateRecord({ context: context(31), id: created.id, expectedVersion: 1, changeKind: "editorial_update", record: updatedRecord });
    const history = await api.getVersionHistory({ context: context(32), id: created.id });
    expect(history.entries.map((entry) => entry.version)).toEqual([1, 2]);
    expect(JSON.stringify(history)).not.toMatch(/internalLocation|payloadJson|deduplicationKey/);
  });

  it("excluye privados y no verificados de la búsqueda pública", async () => {
    const api = open(factory);
    await api.createRecord({ context: context(33), idempotencyKey: "application-private-033", record: createFictitiousJurisprudenceRecord(33) });
    const publicRecord = createPublicFictitiousRecord(34);
    await api.createRecord({ context: context(34), idempotencyKey: "application-public-034", record: publicRecord });
    const unverified = { ...publicRecord, slug: "fixture-no-publicable-035", caseNumber: "TEST-NO-REAL-EXP-035", resolutionNumber: "TEST-NO-REAL-RES-035", source: { ...publicRecord.source, documentId: "TEST-DOC-NO-REAL-035", verificationStatus: "source_located" as const, verifiedAt: null } };
    await api.createRecord({ context: context(35), idempotencyKey: "application-unverified-035", record: unverified });
    const result = await api.searchPublicRecords({ context: context(36), input: searchInput() });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBeDefined();
  });

  it("devuelve únicamente proyecciones públicas y aplica filtros públicos", async () => {
    const api = open(factory);
    const created = await api.createRecord({ context: context(37), idempotencyKey: "application-public-projection-037", record: createPublicFictitiousRecord(37) });
    const result = await api.searchPublicRecords({ context: context(38), input: searchInput({ expediente: "TEST-NO-REAL-EXP-037", pageSize: 1 }) });
    expect(result.items[0]?.id).toBe(created.id);
    expect(JSON.stringify(result)).not.toMatch(/verifiedBy|verificationNotes|generatedContent|editorialNotes|internalLocation|requestId|actor|deduplicationKey/);
  });

  it("oculta por igual detalle inexistente y detalle privado", async () => {
    const api = open(factory);
    await api.createRecord({ context: context(39), idempotencyKey: "application-private-detail-039", record: createFictitiousJurisprudenceRecord(39) });
    await expect(api.getPublicDetail({ context: context(40), slug: "fixture-no-publicable-039" })).resolves.toEqual({ status: "not_found" });
    await expect(api.getPublicDetail({ context: context(41), slug: "missing-public-detail" })).resolves.toEqual({ status: "not_found" });
  });

  it("proyecta un detalle público sin campos internos", async () => {
    const api = open(factory);
    await api.createRecord({ context: context(42), idempotencyKey: "application-detail-042", record: createPublicFictitiousRecord(42) });
    const lookup = await api.getPublicDetail({ context: context(43), slug: "fixture-no-publicable-042" });
    expect(lookup.status).toBe("found");
    expect(JSON.stringify(lookup)).not.toMatch(/verifiedBy|verificationNotes|generatedContent|editorialNotes|internalLocation|requestId|actor|history/);
  });

  it("cierra recursos de forma idempotente y rechaza operaciones posteriores", async () => {
    const api = factory.create();
    await api.close(context(44));
    await api.close(context(45));
    await expect(api.listInternalRecords({ context: context(46) })).rejects.toMatchObject({ code: "RESOURCE_CLOSED" });
  });
});

describe("errores, logging, factory y encapsulación", () => {
  it("traduce validación, infraestructura y fallos desconocidos sin filtrar mensajes", () => {
    expect(toJurisprudenceApplicationError(new JurisprudenceApplicationError("VALIDATION_ERROR", "safe"))).toMatchObject({ code: "VALIDATION_ERROR" });
    const raw = toJurisprudenceApplicationError(new Error("SQL failed at C:\\private\\database.sqlite with SELECT secret"), "request-safe-001");
    expect(raw).toMatchObject({ code: "INTERNAL_ERROR", details: { requestId: "request-safe-001" } });
    expect(raw.message).not.toMatch(/SQL|private|database|SELECT|secret/);
  });

  it("traduce repositorio no disponible a un código de aplicación seguro", async () => {
    const base = new InMemoryJurisprudenceRepository(deterministicDependencies("unavailable"));
    const unavailable: JurisprudenceRepository = {
      findById: (id) => base.findById(id),
      findBySlug: (slug) => base.findBySlug(slug),
      findByExternalIdentity: (identity) => base.findByExternalIdentity(identity),
      create: (input) => base.create(input),
      update: (input) => base.update(input),
      list: async () => { throw new JurisprudenceRepositoryError("PERSISTENCE_ERROR", "driver path C:\\secret\\repository.sqlite SQL SELECT"); },
      search: (input) => base.search(input),
      count: (filters) => base.count(filters),
      existsByExternalIdentity: (identity) => base.existsByExternalIdentity(identity),
      getVersionHistory: (id) => base.getVersionHistory(id),
      close: () => base.close(),
    };
    const api = createJurisprudenceInternalApi({ repository: unavailable });
    const rejection = api.listInternalRecords({ context: context(47) });
    await expect(rejection).rejects.toMatchObject({ code: "REPOSITORY_UNAVAILABLE" });
    await expect(rejection).rejects.not.toHaveProperty("message", expect.stringMatching(/driver|secret|SQL|SELECT/i));
    await api.close(context(48));
  });

  it("registra solo metadatos operativos seguros y conserva requestId", async () => {
    const events: JurisprudenceApplicationLogEvent[] = [];
    const api = createJurisprudenceInternalApi({
      repository: new InMemoryJurisprudenceRepository(deterministicDependencies("logger")),
      logger: { log: (event) => events.push(event) },
    });
    await api.createRecord({ context: context(49), idempotencyKey: "application-logger-049", record: createFictitiousJurisprudenceRecord(49) });
    expect(events.map((event) => [event.requestId, event.phase])).toEqual([
      ["phase-11-c-request-049", "started"],
      ["phase-11-c-request-049", "completed"],
    ]);
    expect(JSON.stringify(events)).not.toMatch(/Resumen ficticio|officialContent|generatedContent|source|SQL|sqlite/i);
    await api.close(context(50));
  });

  it("emite un solo evento terminal seguro al ocultar un detalle privado", async () => {
    const events: JurisprudenceApplicationLogEvent[] = [];
    const api = createJurisprudenceInternalApi({
      repository: new InMemoryJurisprudenceRepository(deterministicDependencies("private-detail-log")),
      logger: { log: (event) => events.push(event) },
    });
    openApis.push(api);
    await api.createRecord({
      context: context(58),
      idempotencyKey: "application-private-detail-log-058",
      record: createFictitiousJurisprudenceRecord(58),
    });
    events.length = 0;

    const result = await api.getPublicDetail({
      context: context(59),
      slug: "fixture-no-publicable-058",
    });
    const operationEvents = events.filter(
      (event) => event.requestId === "phase-11-c-request-059" && event.operation === "get_public_detail",
    );
    const terminalEvents = operationEvents.filter(
      (event) => event.phase === "completed" || event.phase === "rejected",
    );

    expect(result).toEqual({ status: "not_found" });
    expect(JSON.stringify(result)).not.toMatch(/NOT_PUBLIC/);
    expect(operationEvents.some((event) => event.resultCode === "NOT_PUBLIC")).toBe(false);
    expect(terminalEvents).toHaveLength(1);
    expect(terminalEvents[0]).toMatchObject({ phase: "completed", resultCode: "OK" });
    expect(JSON.stringify(operationEvents)).not.toMatch(
      /recordId|recordVersion|editorialNotes|verificationNotes|generatedContent|officialText|internalLocation|private[\\/]/i,
    );
  });

  it("no expone repositorio, adaptador ni métodos genéricos", () => {
    const api = createJurisprudenceInternalApi({ repository: new InMemoryJurisprudenceRepository(deterministicDependencies("shape")) });
    expect(Object.keys(api)).toEqual([]);
    expect(api).not.toHaveProperty("repository");
    expect(api).not.toHaveProperty("adapter");
    expect(api).not.toHaveProperty("execute");
    openApis.push(api);
  });

  it("exige que SQLite de archivo quede fuera del repositorio Git", () => {
    expect(() => createSqliteJurisprudenceInternalApi({ databasePath: path.join(process.cwd(), "tmp", "forbidden.sqlite") })).toThrowError(JurisprudenceApplicationError);
  });

  it("persiste mediante API, cierra, reabre, recupera e historial y limpia auxiliares", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "buholex-application-test-"));
    const databasePath = path.join(directory, "application.sqlite");
    try {
      const first = createSqliteJurisprudenceInternalApi({ databasePath, now: () => "2026-07-29T14:00:00.000Z" });
      const created = await first.createRecord({ context: context(51), idempotencyKey: "application-disk-051", record: createFictitiousJurisprudenceRecord(51) });
      await first.close(context(52));
      const reopened = createSqliteJurisprudenceInternalApi({ databasePath, now: () => "2026-07-29T15:00:00.000Z" });
      await expect(reopened.getInternalRecord({ context: context(53), id: created.id })).resolves.toMatchObject({ record: { id: created.id } });
      await expect(reopened.getVersionHistory({ context: context(54), id: created.id })).resolves.toMatchObject({ entries: [{ version: 1 }] });
      await reopened.close(context(55));
      expect(statSync(databasePath).isFile()).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
      expect(() => statSync(directory)).toThrow();
    }
  });

  it("mantiene equivalencia observable entre memoria y SQLite", async () => {
    const outputs: string[] = [];
    for (const factory of apiFactories) {
      const api = open(factory);
      await api.createRecord({ context: context(56), idempotencyKey: `application-equivalent-${factory.name}`, record: createFictitiousJurisprudenceRecord(56) });
      const page = await api.searchInternalRecords({ context: context(57), q: "REGISTRO FICTICIO", pageSize: 10 });
      outputs.push(JSON.stringify(page.items.map((item) => ({ recordVersion: item.recordVersion, matter: item.matter, publicable: item.publicable }))));
    }
    expect(outputs[1]).toBe(outputs[0]);
  });

  it("mantiene seguridad de importaciones y ausencia de transporte", () => {
    const productionRoots = ["app", "components", "data"];
    const source = productionRoots.flatMap((root) => readdirSync(path.join(process.cwd(), root), { recursive: true })
      .filter(
        (entry): entry is string =>
          typeof entry === "string" && /\.(ts|tsx)$/.test(entry),
      )
      .map((entry) => readFileSync(path.join(process.cwd(), root, entry), "utf8"))).join("\n");
    expect(source).not.toMatch(/jurisprudence-(?:internal-api|application-service|application-factory|repository)|sqlite-jurisprudence/);
    const appEntries = readdirSync(path.join(process.cwd(), "app"), { recursive: true }).filter(
      (entry): entry is string => typeof entry === "string",
    );
    // solo se permite app/api/owl/admission — jurisprudencia no crea rutas API propias
    expect(appEntries.filter((entry) => entry.replaceAll("\\", "/").startsWith("api/") && /jurisprudence/.test(entry))).toEqual([]);
    expect(source).not.toMatch(/TEST-NO-REAL|fixture-no-publicable/);
    expect(readFileSync(path.join(process.cwd(), "app", "jurisprudencia", "page.tsx"), "utf8")).not.toMatch(/JurisprudenceInternalApi|jurisprudence-application|jurisprudence-repository/);
  });

  it("no incorpora any explícito ni exporta infraestructura desde barrels públicos", () => {
    const files = [
      "types/jurisprudence-application.ts",
      "lib/schemas/jurisprudence-application.ts",
      "lib/jurisprudence-application-error.ts",
      "lib/jurisprudence-application-service.ts",
      "lib/jurisprudence-internal-api.ts",
      "lib/jurisprudence-application-factory.ts",
    ];
    const source = files.map((file) => readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
    expect(source).not.toMatch(/\bany\b/);
    expect(readFileSync(path.join(process.cwd(), "types/domain.ts"), "utf8")).not.toMatch(/jurisprudence-(?:repository|application)/);
    expect(readFileSync(path.join(process.cwd(), "lib/schemas.ts"), "utf8")).not.toMatch(/jurisprudence-(?:repository|application)/);
  });

  it("preserva productos y excluye pagos, descarga y publicación", () => {
    const catalogSource = readFileSync(path.join(process.cwd(), "data/template-catalog.ts"), "utf8");
    const services = readFileSync(path.join(process.cwd(), "data/services.ts"), "utf8");
    expect(catalogSource).toMatch(/availabilityStatus\s*:\s*["']editorial_preview["']/);
    expect(catalogSource).toMatch(/publicationAuthorization\s*:\s*\{\s*authorized\s*:\s*false/);
    expect(catalogSource).toMatch(/price\s*:\s*null/);
    expect(catalogSource).toMatch(/currency\s*:\s*null/);
    expect(catalogSource).toMatch(/licenseStatus\s*:\s*["']pending["']/);
    expect(catalogSource).toMatch(/publiclyVisible\s*:\s*false/);
    expect(catalogSource).toMatch(/downloadable\s*:\s*false/);
    expect(catalogSource).toMatch(/publicDownloadAuthorized\s*:\s*false/);
    expect(services).toMatch(/id:\s*"SRV-WEB-001"[\s\S]*?price:\s*null[\s\S]*?currency:\s*null[\s\S]*?published:\s*false/);
    const applicationSource = readFileSync(path.join(process.cwd(), "lib/jurisprudence-application-service.ts"), "utf8");
    expect(applicationSource).not.toMatch(/payment|download|deploy|scrap|DNI|partyName/i);
  });
});
