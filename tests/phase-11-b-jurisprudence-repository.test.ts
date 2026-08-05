// @vitest-environment node

import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { InMemoryJurisprudenceRepository } from "@/lib/in-memory-jurisprudence-repository";
import {
  buildJurisprudenceDeduplicationKey,
  compareJurisprudenceIdentity,
  getJurisprudenceExternalIdentity,
  normalizeJurisprudenceExternalIdentity,
} from "@/lib/jurisprudence-identity";
import { toPublicJurisprudenceSearchItem } from "@/lib/jurisprudence-domain";
import { fromJurisprudencePersistedRow, toJurisprudencePersistedRow } from "@/lib/jurisprudence-persistence-model";
import { JurisprudenceRepositoryError, toJurisprudencePersistenceError } from "@/lib/jurisprudence-repository-error";
import { SqliteJurisprudenceRepository } from "@/lib/sqlite-jurisprudence-repository";
import { createFictitiousJurisprudenceRecord } from "@/tests/helpers/jurisprudence-record-fixture";
import type { JurisprudenceRecord } from "@/types/jurisprudence";
import type { JurisprudenceNewRecord, JurisprudenceRepository, JurisprudenceRepositoryDependencies } from "@/types/jurisprudence-repository";

function deterministicDependencies(prefix: string): JurisprudenceRepositoryDependencies {
  let idSequence = 0;
  let timeSequence = 0;
  return {
    generateId: () => `${prefix}-id-${String(++idSequence).padStart(3, "0")}`,
    now: () => new Date(Date.UTC(2026, 6, 29, 10, 0, timeSequence++)).toISOString(),
  };
}

function toNewRecord(record: JurisprudenceRecord): JurisprudenceNewRecord {
  const { id, recordVersion, createdAt, updatedAt, ...newRecord } = record;
  void [id, recordVersion, createdAt, updatedAt];
  return newRecord;
}

function readTypeScriptTree(directory: string): string {
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry);
    if (statSync(entryPath).isDirectory()) return readTypeScriptTree(entryPath);
    return /\.tsx?$/.test(entry) ? [readFileSync(entryPath, "utf8")] : [];
  }).join("\n");
}

type RepositoryFactory = { name: string; create: () => JurisprudenceRepository };
const repositoryFactories: readonly RepositoryFactory[] = [
  { name: "memoria", create: () => new InMemoryJurisprudenceRepository(deterministicDependencies("memory")) },
  { name: "sqlite", create: () => new SqliteJurisprudenceRepository(":memory:", deterministicDependencies("sqlite")) },
];

const openRepositories: JurisprudenceRepository[] = [];
function open(factory: RepositoryFactory): JurisprudenceRepository {
  const repository = factory.create();
  openRepositories.push(repository);
  return repository;
}

afterEach(async () => {
  await Promise.all(openRepositories.splice(0).map((repository) => repository.close()));
});

describe.each(repositoryFactories)("contrato del repositorio: $name", (factory) => {
  it("crea un registro válido con identidad interna, versión y timestamps del sistema", async () => {
    const repository = open(factory);
    const created = await repository.create({ record: createFictitiousJurisprudenceRecord(1), idempotencyKey: "create-test-001" });
    expect(created.id).toMatch(/-id-001$/);
    expect(created.recordVersion).toBe(1);
    expect(created.createdAt).toBe(created.updatedAt);
    expect(created.publicationStatus).toBe("private");
  });

  it("rechaza un registro inválido mediante error estructurado", async () => {
    const repository = open(factory);
    const invalid = { ...createFictitiousJurisprudenceRecord(2), matter: "" } as JurisprudenceNewRecord;
    await expect(repository.create({ record: invalid, idempotencyKey: "invalid-test-002" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rechaza propiedades desconocidas en una escritura", async () => {
    const repository = open(factory);
    const unknownField = { ...createFictitiousJurisprudenceRecord(201), unexpectedRepositoryField: true } as JurisprudenceNewRecord;
    await expect(repository.create({ record: unknownField, idempotencyKey: "unknown-field-test-201" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("recupera clones por id y por slug", async () => {
    const repository = open(factory);
    const created = await repository.create({ record: createFictitiousJurisprudenceRecord(3), idempotencyKey: "lookup-test-003" });
    expect((await repository.findById(created.id))?.id).toBe(created.id);
    expect((await repository.findBySlug(created.slug!))?.id).toBe(created.id);
  });

  it("recupera y comprueba existencia por identidad externa", async () => {
    const repository = open(factory);
    const created = await repository.create({ record: createFictitiousJurisprudenceRecord(4), idempotencyKey: "external-test-004" });
    const identity = getJurisprudenceExternalIdentity(created);
    expect((await repository.findByExternalIdentity(identity))?.id).toBe(created.id);
    expect(await repository.existsByExternalIdentity(identity)).toBe(true);
  });

  it("previene duplicados por identidad aunque cambie el título", async () => {
    const repository = open(factory);
    const record = createFictitiousJurisprudenceRecord(5);
    await repository.create({ record, idempotencyKey: "duplicate-first-005" });
    await expect(repository.create({ record: { ...record, slug: "otro-slug-test-005", editorialContent: { ...record.editorialContent, editorialTitle: "Otro título ficticio no publicable" } }, idempotencyKey: "duplicate-second-005" })).rejects.toMatchObject({ code: "DUPLICATE_CONFLICT" });
  });

  it("hace idempotente el reintento idéntico y rechaza reutilización divergente", async () => {
    const repository = open(factory);
    const record = createFictitiousJurisprudenceRecord(6);
    const first = await repository.create({ record, idempotencyKey: "idempotency-test-006" });
    const repeated = await repository.create({ record, idempotencyKey: "idempotency-test-006" });
    expect(repeated).toEqual(first);
    await expect(repository.create({ record: createFictitiousJurisprudenceRecord(7), idempotencyKey: "idempotency-test-006" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("actualiza con incremento de versión e historial explícito", async () => {
    const repository = open(factory);
    const created = await repository.create({ record: createFictitiousJurisprudenceRecord(8), idempotencyKey: "update-test-008" });
    const updated = await repository.update({ id: created.id, expectedVersion: 1, changeKind: "editorial_update", record: { ...toNewRecord(created), editorialContent: { ...created.editorialContent, editorialSummary: "Resumen editorial actualizado solo en prueba." } } });
    expect(updated.recordVersion).toBe(2);
    expect((await repository.getVersionHistory(created.id)).map((entry) => [entry.version, entry.changeKind])).toEqual([[1, "created"], [2, "editorial_update"]]);
  });

  it("rechaza conflictos optimistas sin sobrescribir", async () => {
    const repository = open(factory);
    const created = await repository.create({ record: createFictitiousJurisprudenceRecord(9), idempotencyKey: "version-test-009" });
    await repository.update({ id: created.id, expectedVersion: 1, changeKind: "editorial_update", record: toNewRecord(created) });
    await expect(repository.update({ id: created.id, expectedVersion: 1, changeKind: "source_update", record: toNewRecord(created) })).rejects.toMatchObject({ code: "VERSION_CONFLICT", details: { expectedVersion: 1, actualVersion: 2 } });
  });

  it("preserva createdAt y avanza updatedAt", async () => {
    const repository = open(factory);
    const created = await repository.create({ record: createFictitiousJurisprudenceRecord(10), idempotencyKey: "timestamps-test-010" });
    const updated = await repository.update({ id: created.id, expectedVersion: 1, changeKind: "source_update", record: toNewRecord(created) });
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt > created.updatedAt).toBe(true);
  });

  it("aísla almacenamiento y lecturas frente a mutaciones externas", async () => {
    const repository = open(factory);
    const input = createFictitiousJurisprudenceRecord(11);
    const created = await repository.create({ record: input, idempotencyKey: "clone-test-011" });
    input.editorialContent = { ...input.editorialContent, keywords: [...input.editorialContent.keywords, "mutación externa"] };
    created.editorialContent = { ...created.editorialContent, keywords: [...created.editorialContent.keywords, "mutación de salida"] };
    expect((await repository.findById(created.id))?.editorialContent.keywords).toEqual(["fixture", "marker-011"]);
  });

  it("pagina con máximo controlado y total correcto", async () => {
    const repository = open(factory);
    for (let seed = 12; seed <= 16; seed += 1) await repository.create({ record: createFictitiousJurisprudenceRecord(seed), idempotencyKey: `page-test-${seed}` });
    const page = await repository.list({ page: 2, pageSize: 2, sort: "issued_at_asc" });
    expect(page).toMatchObject({ total: 5, page: 2, pageSize: 2, totalPages: 3 });
    expect(page.items).toHaveLength(2);
    await expect(repository.list({ pageSize: 51 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("ordena de forma determinista con desempate por id", async () => {
    const repository = open(factory);
    const left = createFictitiousJurisprudenceRecord(17);
    const right = { ...createFictitiousJurisprudenceRecord(18), issuedAt: left.issuedAt };
    await repository.create({ record: right, idempotencyKey: "sort-test-018" });
    await repository.create({ record: left, idempotencyKey: "sort-test-017" });
    const page = await repository.list({ sort: "issued_at_asc" });
    expect(page.items.map((record) => record.id)).toEqual([...page.items.map((record) => record.id)].sort());
  });

  it("filtra por expediente, resolución, institución y materia", async () => {
    const repository = open(factory);
    const first = await repository.create({ record: createFictitiousJurisprudenceRecord(19), idempotencyKey: "filters-test-019" });
    await repository.create({ record: createFictitiousJurisprudenceRecord(20), idempotencyKey: "filters-test-020" });
    for (const filters of [{ caseNumber: first.caseNumber }, { resolutionNumber: first.resolutionNumber }, { institutionId: first.institution.id }, { matter: first.matter }]) {
      expect((await repository.list({ filters })).items.some((record) => record.id === first.id)).toBe(true);
    }
  });

  it("filtra estados editoriales, de publicación y verificación", async () => {
    const repository = open(factory);
    const created = await repository.create({ record: createFictitiousJurisprudenceRecord(21), idempotencyKey: "states-test-021" });
    expect((await repository.list({ filters: { editorialStatus: "draft", publicationStatus: "private", verificationStatus: "unverified" } })).items.map((record) => record.id)).toContain(created.id);
    expect((await repository.list({ filters: { editorialStatus: "verified" } })).items).toHaveLength(0);
  });

  it("filtra por rango de emisión y rechaza rangos invertidos", async () => {
    const repository = open(factory);
    const created = await repository.create({ record: createFictitiousJurisprudenceRecord(22), idempotencyKey: "date-test-022" });
    expect((await repository.list({ filters: { issuedFrom: created.issuedAt, issuedTo: created.issuedAt } })).items).toHaveLength(1);
    await expect(repository.list({ filters: { issuedFrom: "2026-02-01", issuedTo: "2026-01-01" } })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("limita q a una coincidencia determinista documentada", async () => {
    const repository = open(factory);
    const created = await repository.create({ record: createFictitiousJurisprudenceRecord(23), idempotencyKey: "query-test-023" });
    expect((await repository.search({ q: "  registro   ficticio 023 " })).items.map((record) => record.id)).toEqual([created.id]);
    expect((await repository.search({ q: "inexistente" })).items).toHaveLength(0);
  });

  it("preserva fuente y separación de contenidos sin publicar automáticamente", async () => {
    const repository = open(factory);
    const created = await repository.create({ record: createFictitiousJurisprudenceRecord(24), idempotencyKey: "separation-test-024" });
    const recovered = await repository.findById(created.id);
    expect(recovered?.source).toEqual(created.source);
    expect(recovered?.officialContent).toEqual(created.officialContent);
    expect(recovered?.editorialContent).toEqual(created.editorialContent);
    expect(recovered?.generatedContent).toEqual(created.generatedContent);
    expect(recovered?.publicationStatus).toBe("private");
    expect(recovered && toPublicJurisprudenceSearchItem(recovered)).toBeNull();
  });

  it("cuenta filtros y reporta inexistencia de historial", async () => {
    const repository = open(factory);
    await repository.create({ record: createFictitiousJurisprudenceRecord(25), idempotencyKey: "count-test-025" });
    expect(await repository.count({ matter: "Materia procesal ficticia" })).toBe(1);
    await expect(repository.getVersionHistory("missing-test-id")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("identidad y modelo físico", () => {
  it("normaliza sin eliminar puntuación jurídicamente relevante y crea clave explicable", () => {
    const record = createFictitiousJurisprudenceRecord(30);
    const identity = { sourceType: record.source.type, sourceDocumentId: record.source.documentId, caseNumber: "  test / exp. 030 ", resolutionNumber: " res. 030-a ", institutionId: record.institution.id, issuedAt: record.issuedAt };
    const normalized = normalizeJurisprudenceExternalIdentity(identity);
    expect(normalized.caseNumber).toBe("TEST / EXP. 030");
    expect(normalized.resolutionNumber).toBe("RES. 030-A");
    expect(buildJurisprudenceDeduplicationKey(identity)).toContain("case=TEST%20%2F%20EXP.%20030");
  });

  it("distingue coincidencia exacta, colisión dudosa y registro diferente", () => {
    const base = createFictitiousJurisprudenceRecord(31);
    const identity = { sourceType: base.source.type, sourceDocumentId: base.source.documentId, caseNumber: base.caseNumber, resolutionNumber: base.resolutionNumber, institutionId: base.institution.id, issuedAt: base.issuedAt };
    expect(compareJurisprudenceIdentity(identity, { ...identity, caseNumber: `  ${identity.caseNumber.toLowerCase()}  ` }).relation).toBe("exact");
    expect(compareJurisprudenceIdentity(identity, { ...identity, issuedAt: "2026-02-01" }).relation).toBe("possible_collision");
    expect(compareJurisprudenceIdentity(identity, { ...identity, sourceDocumentId: "OTHER-TEST", caseNumber: "OTHER-CASE", resolutionNumber: "OTHER-RES" }).relation).toBe("different");
  });

  it("mapea y reconstruye todos los campos del registro sin omisiones", () => {
    const repositoryRecord: JurisprudenceRecord = {
      ...createFictitiousJurisprudenceRecord(32),
      id: "mapping-test-id",
      recordVersion: 1,
      createdAt: "2026-07-29T10:00:00.000Z",
      updatedAt: "2026-07-29T10:00:00.000Z",
    };
    expect(fromJurisprudencePersistedRow(toJurisprudencePersistedRow(repositoryRecord))).toEqual(repositoryRecord);
  });

  it("traduce errores de infraestructura sin filtrar el mensaje al consumidor", () => {
    const translated = toJurisprudencePersistenceError(new Error("driver-secret-detail"));
    expect(translated).toBeInstanceOf(JurisprudenceRepositoryError);
    expect(translated.code).toBe("PERSISTENCE_ERROR");
    expect(translated.message).not.toContain("driver-secret-detail");
    expect(translated.details.cause).toBe("driver-secret-detail");
  });
});

describe("persistencia SQLite local", () => {
  it("rechaza una base de datos ubicada dentro de public", () => {
    let thrown: unknown;
    try { new SqliteJurisprudenceRepository(path.join(process.cwd(), "public", "forbidden-test.sqlite")); } catch (error) { thrown = error; }
    expect(thrown).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("persiste entre dos instancias y conserva historial", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "buholex-jurisprudence-test-"));
    const databasePath = path.join(directory, "repository.sqlite");
    try {
      const first = new SqliteJurisprudenceRepository(databasePath, deterministicDependencies("disk"));
      const created = await first.create({ record: createFictitiousJurisprudenceRecord(40), idempotencyKey: "disk-test-040" });
      await first.close();
      const reopened = new SqliteJurisprudenceRepository(databasePath, deterministicDependencies("reopened"));
      expect((await reopened.findById(created.id))?.source.documentId).toBe("TEST-DOC-NO-REAL-040");
      expect(await reopened.getVersionHistory(created.id)).toHaveLength(1);
      await reopened.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("mantiene comportamiento observable equivalente entre memoria y SQLite", async () => {
    const memory = open(repositoryFactories[0]!);
    const sqlite = open(repositoryFactories[1]!);
    for (const repository of [memory, sqlite]) {
      await repository.create({ record: createFictitiousJurisprudenceRecord(41), idempotencyKey: "equivalence-test-041" });
      await repository.create({ record: createFictitiousJurisprudenceRecord(42), idempotencyKey: "equivalence-test-042" });
    }
    const memoryPage = await memory.list({ filters: { matter: "Materia contractual ficticia" }, sort: "issued_at_desc" });
    const sqlitePage = await sqlite.list({ filters: { matter: "Materia contractual ficticia" }, sort: "issued_at_desc" });
    expect(sqlitePage.items.map((record) => [record.caseNumber, record.recordVersion, record.publicationStatus])).toEqual(memoryPage.items.map((record) => [record.caseNumber, record.recordVersion, record.publicationStatus]));
  });

  it("libera recursos y rechaza operaciones posteriores al cierre", async () => {
    const repository = new SqliteJurisprudenceRepository(":memory:", deterministicDependencies("close"));
    await repository.close();
    await expect(repository.list()).rejects.toMatchObject({ code: "RESOURCE_CLOSED" });
  });
});

describe("límites de Fase 11.B", () => {
  it("no introduce any explícito, API, UI ni importaciones públicas de adaptadores", () => {
    const repositoryFiles = [
      "types/jurisprudence-repository.ts",
      "lib/jurisprudence-identity.ts",
      "lib/jurisprudence-persistence-model.ts",
      "lib/jurisprudence-repository-error.ts",
      "lib/jurisprudence-repository-utils.ts",
      "lib/in-memory-jurisprudence-repository.ts",
      "lib/sqlite-jurisprudence-repository.ts",
      "lib/schemas/jurisprudence-repository.ts",
    ];
    const source = repositoryFiles.map((file) => readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
    const publicSource = ["app", "components", "data"].map((directory) => readTypeScriptTree(path.join(process.cwd(), directory))).join("\n");
    expect(source).not.toMatch(/\bany\b/);
    expect(source).not.toMatch(/app\/api|route\.ts|product-assets|CONTRATO-CESION/);
    expect(publicSource).not.toMatch(/in-memory-jurisprudence|sqlite-jurisprudence/);
  });

  it("mantiene fixtures fuera de datos, componentes, rutas y public", () => {
    const publicFiles = ["data/jurisprudence-cognitive.ts", "components/jurisprudence/jurisprudence-public-page.tsx", "app/jurisprudencia/page.tsx"];
    const publicSource = publicFiles.map((file) => readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
    expect(publicSource).not.toMatch(/TEST-NO-REAL|fixture-no-publicable|JurisprudenceRepository/);
    expect(readFileSync(path.join(process.cwd(), ".gitignore"), "utf8")).toMatch(/\*\.sqlite-wal/);
  });

  it("preserva los estados comerciales y no incorpora descarga o publicación", () => {
    const catalog = readFileSync(path.join(process.cwd(), "data/template-catalog.ts"), "utf8");
    const services = readFileSync(path.join(process.cwd(), "data/services.ts"), "utf8");
    expect(catalog).toContain('availabilityStatus: "editorial_preview"');
    expect(catalog).toContain('publicationAuthorization: { authorized: false');
    expect(services).toContain('id: "SRV-WEB-001"');
    expect(services).toContain("allowsImmediatePayment: false");
  });
});
