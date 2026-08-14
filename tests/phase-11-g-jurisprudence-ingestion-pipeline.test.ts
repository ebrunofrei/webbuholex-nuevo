// @vitest-environment node

import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { publicServices } from "@/data/services";
import { rentalHousingContract } from "@/data/template-catalog";
import { InMemoryJurisprudenceRepository } from "@/lib/in-memory-jurisprudence-repository";
import { createJurisprudenceInternalApi, createSqliteJurisprudenceInternalApi } from "@/lib/jurisprudence-application-factory";
import { createJurisprudenceIngestionPipeline } from "@/lib/jurisprudence-ingestion-pipeline";
import {
  normalizeJurisprudenceIngestionRecord,
  sha256Hex,
} from "@/lib/jurisprudence-ingestion-normalization";
import { evaluateJurisprudenceIngestionReadiness } from "@/lib/jurisprudence-ingestion-readiness";
import { SqliteJurisprudenceRepository } from "@/lib/sqlite-jurisprudence-repository";
import { createFictitiousJurisprudenceRecord } from "@/tests/helpers/jurisprudence-record-fixture";
import type { JurisprudenceApplicationContext, JurisprudenceInternalApi } from "@/types/jurisprudence-application";
import type {
  JurisprudenceIngestionBatch,
  JurisprudenceIngestionBatchPreviewResult,
  JurisprudenceIngestionLogEvent,
  JurisprudenceIngestionPipeline,
  JurisprudenceIngestionRequestedAction,
} from "@/types/jurisprudence-ingestion";
import type { JurisprudenceNewRecord, JurisprudenceRepositoryDependencies } from "@/types/jurisprudence-repository";

const NOW = "2026-07-29T20:00:00.000Z";

function context(seed = 1): JurisprudenceApplicationContext {
  return {
    requestId: `phase-11-g-request-${String(seed).padStart(3, "0")}`,
    actor: { kind: "internal_test", id: "operator-ficticio-11g" },
    operationSource: "test",
    requestedAt: NOW,
  };
}

function record(seed = 1): JurisprudenceNewRecord {
  const base = createFictitiousJurisprudenceRecord(seed);
  const marker = String(seed).padStart(3, "0");
  return {
    ...base,
    slug: `expediente-ficticio-11g-${marker}`,
    caseNumber: `EXP-FICTICIO-11G-${marker}`,
    resolutionNumber: `RESOLUCION-FICTICIA-${marker}`,
    resolutionType: "Resolución ficticia de prueba",
    institution: {
      ...base.institution,
      id: "organo-jurisdiccional-de-prueba",
      name: "ÓRGANO JURISDICCIONAL DE PRUEBA",
      shortName: "ÓRGANO PRUEBA",
    },
    issuingBody: "ORGANO-JURISDICCIONAL-DE-PRUEBA",
    chamberOrCourt: "SALA-FICTICIA-DE-PRUEBA",
    editorialContent: {
      ...base.editorialContent,
      editorialTitle: `Resolución ficticia 11.G ${marker}`,
      editorialSummary: "Texto editorial ficticio exclusivo de la suite 11.G.",
      relevantGrounds: ["  Fundamento   literal; no debe reescribirse.  "],
      citedNorms: ["Artículo 11-G, cita ficticia; conservar literal."],
      decision: "Parte resolutiva ficticia; conservar literalmente.\nSEGUNDA LÍNEA.",
      keywords: ["  Prueba  ", "ingesta", "prueba"],
    },
    officialContent: {
      ...base.officialContent,
      officialSummary: "  Sumilla ficticia con   espacios significativos.  ",
      officialFullText: null,
    },
    source: {
      ...base.source,
      documentId: `DOC-FICTICIO-11G-${marker}`,
      verificationNotes: "Fixture ficticio; no constituye fuente oficial.",
    },
  };
}

function source(seed = 1, content = `fixture-${seed}`) {
  return {
    sourceKind: "test_fixture" as const,
    sourceReference: `fixture-11g-${seed}`,
    acquiredAt: NOW,
    acquiredBy: "operator-ficticio-11g",
    checksum: sha256Hex(content),
    mediaType: "application/json" as const,
    originalFileName: `fixture-11g-${seed}.json`,
    byteSize: new TextEncoder().encode(content).byteLength,
    sourceSystem: "suite-11g",
  };
}

function batch(
  seed = 1,
  rawRecord = record(seed),
  requestedAction: JurisprudenceIngestionRequestedAction = "preview_create",
): JurisprudenceIngestionBatch {
  return {
    batchId: `batch-ficticio-11g-${seed}`,
    context: context(seed),
    items: [{
      ingestionItemId: `item-ficticio-11g-${seed}`,
      source: source(seed),
      rawRecord,
      requestedAction,
      idempotencyKey: `idempotencia-ficticia-11g-${seed}`,
    }],
  };
}

function dependencies(prefix: string): JurisprudenceRepositoryDependencies {
  let sequence = 0;
  return {
    now: () => `2026-07-29T20:00:${String(sequence++).padStart(2, "0")}.000Z`,
    generateId: () => `${prefix}-record-${String(sequence).padStart(3, "0")}`,
  };
}

interface TestSystem {
  api: JurisprudenceInternalApi;
  pipeline: JurisprudenceIngestionPipeline;
}

function system(kind: "memory" | "sqlite", options: { now?: () => string; logs?: JurisprudenceIngestionLogEvent[] } = {}): TestSystem {
  const api = kind === "memory"
    ? createJurisprudenceInternalApi({ repository: new InMemoryJurisprudenceRepository(dependencies("memory")), now: () => NOW })
    : createJurisprudenceInternalApi({ repository: new SqliteJurisprudenceRepository(":memory:", dependencies("sqlite")), now: () => NOW });
  let previewSequence = 0;
  const pipeline = createJurisprudenceIngestionPipeline({
    api,
    now: options.now ?? (() => NOW),
    generateId: () => `preview-ficticio-11g-${++previewSequence}`,
    ...(options.logs === undefined ? {} : { logger: { log: (event) => options.logs?.push(event) } }),
  });
  openPipelines.push(pipeline);
  return { api, pipeline };
}

function readyItem(result: JurisprudenceIngestionBatchPreviewResult) {
  expect(result.status).toBe("accepted");
  if (result.status !== "accepted") throw new Error("Preview rechazado.");
  const item = result.items[0];
  expect(item?.status).toBe("preview_ready");
  if (item?.status !== "preview_ready") throw new Error("Item sin preview.");
  return item;
}

const openPipelines: JurisprudenceIngestionPipeline[] = [];

afterEach(async () => {
  let seed = 900;
  await Promise.all(openPipelines.splice(0).map((pipeline) => pipeline.close(context(seed++))));
});

describe("contratos estrictos y privacidad preventiva", () => {
  it("acepta un lote ficticio válido", async () => {
    expect(await system("memory").pipeline.previewBatch(batch())).toMatchObject({ status: "accepted", items: [{ status: "preview_ready" }] });
  });

  it.each([
    ["campo desconocido", { ...batch(), sql: "SELECT" }],
    ["identificador vacío", { ...batch(), batchId: "" }],
    ["fecha inválida", { ...batch(), items: [{ ...batch().items[0], source: { ...batch().items[0]?.source, acquiredAt: "fecha" } }] }],
    ["media type no autorizado", { ...batch(), items: [{ ...batch().items[0], source: { ...batch().items[0]?.source, mediaType: "text/plain" } }] }],
    ["campo personal", { ...batch(), items: [{ ...batch().items[0], rawRecord: { ...record(), dni: "00000000" } }] }],
    ["ruta absoluta", { ...batch(), items: [{ ...batch().items[0], source: { ...batch().items[0]?.source, sourceReference: "C:\\privado\\fixture.json" } }] }],
  ])("rechaza %s sin lanzar error nativo", async (_label, input) => {
    await expect(system("memory").pipeline.previewBatch(input)).resolves.toMatchObject({ status: "rejected" });
  });

  it("rechaza tamaño y lote superiores a la configuración", async () => {
    const first = system("memory");
    const oversized = batch();
    const oversizedItem = { ...oversized.items[0], source: { ...oversized.items[0]?.source, byteSize: 300_000 } };
    await expect(first.pipeline.previewBatch({ ...oversized, items: [oversizedItem] })).resolves.toMatchObject({ items: [{ status: "rejected" }] });
    const api = createJurisprudenceInternalApi({ repository: new InMemoryJurisprudenceRepository(dependencies("limit")) });
    const limited = createJurisprudenceIngestionPipeline({ api, now: () => NOW, generateId: () => "preview-limit", maxBatchItems: 1 });
    openPipelines.push(limited);
    await expect(limited.previewBatch({ ...batch(), items: [batch().items[0], { ...batch(2).items[0] }] })).resolves.toMatchObject({ status: "rejected" });
  });

  it("rechaza estados que publicarían o verificarían automáticamente", async () => {
    const elevated = { ...record(), publicationStatus: "published", editorialStatus: "verified", source: { ...record().source, verificationStatus: "verified" } };
    const input = batch();
    await expect(system("memory").pipeline.previewBatch({
      ...input,
      items: input.items.map((item) => ({ ...item, rawRecord: elevated })),
    })).resolves.toMatchObject({ status: "rejected" });
  });
});

describe("normalización determinista, contenido jurídico e identidad", () => {
  it("normaliza metadatos, listas y espacios de forma determinista", () => {
    const raw = record();
    const messy = { ...raw, caseNumber: "  EXP-FICTICIO-11G-001   ", matter: "  Materia   procesal ficticia  " };
    const left = normalizeJurisprudenceIngestionRecord(messy, source().checksum);
    const right = normalizeJurisprudenceIngestionRecord(messy, source().checksum);
    expect(left).toEqual(right);
    expect(left.record.caseNumber).toBe("EXP-FICTICIO-11G-001");
    expect(left.record.matter).toBe("Materia procesal ficticia");
    expect(left.record.editorialContent.keywords).toEqual(["ingesta", "prueba"]);
  });

  it("conserva literalmente sumilla, texto, fundamentos y citas", () => {
    const raw = record();
    const normalized = normalizeJurisprudenceIngestionRecord(raw, source().checksum).record;
    expect(normalized.officialContent.officialSummary).toBe(raw.officialContent.officialSummary?.trim());
    expect(normalized.officialContent.officialFullText).toBe(raw.officialContent.officialFullText);
    expect(normalized.editorialContent.relevantGrounds).toEqual(raw.editorialContent.relevantGrounds.map((value) => value.trim()));
    expect(normalized.editorialContent.citedNorms).toEqual(raw.editorialContent.citedNorms.map((value) => value.trim()));
    expect(normalized.editorialContent.decision).toBe(raw.editorialContent.decision?.trim());
  });

  it("iguala fingerprints equivalentes y separa cambios materiales", () => {
    const first = normalizeJurisprudenceIngestionRecord({ ...record(), matter: "Materia   procesal ficticia" }, sha256Hex("a"));
    const equivalent = normalizeJurisprudenceIngestionRecord({ ...record(), matter: " Materia procesal ficticia " }, sha256Hex("b"));
    const changed = normalizeJurisprudenceIngestionRecord({ ...record(), resolutionNumber: "RESOLUCION-FICTICIA-DISTINTA" }, sha256Hex("a"));
    expect(equivalent.normalizedRecordFingerprint).toBe(first.normalizedRecordFingerprint);
    expect(changed.normalizedRecordFingerprint).not.toBe(first.normalizedRecordFingerprint);
    expect(first.sourceChecksum).not.toBe(equivalent.sourceChecksum);
    expect(first.jurisprudenceIdentityKey).not.toBe(changed.jurisprudenceIdentityKey);
  });
});

describe("duplicados, preview y confirmación", () => {
  it.each(["idempotency", "checksum", "fingerprint", "identity"] as const)("detecta duplicado de %s dentro del lote", async (kind) => {
    const first = batch().items[0];
    if (first === undefined) throw new Error("Fixture incompleto.");
    const secondRecord = kind === "identity" ? { ...record(), editorialContent: { ...record().editorialContent, editorialSummary: "Cambio material ficticio." } } : record();
    const second = {
      ...first,
      ingestionItemId: "item-ficticio-11g-002",
      idempotencyKey: kind === "idempotency" ? first.idempotencyKey : "idempotencia-ficticia-11g-002",
      source: { ...first.source, checksum: kind === "checksum" || kind === "idempotency" ? first.source.checksum : sha256Hex("otro-contenido") },
      rawRecord: secondRecord,
    };
    const result = await system("memory").pipeline.previewBatch({ ...batch(), items: [first, second] });
    expect(result).toMatchObject({ status: "accepted", items: [{ status: "preview_ready" }, { status: "duplicate_in_batch" }] });
    if (result.status === "accepted" && result.items[1]?.status === "duplicate_in_batch") {
      const expected = kind === "idempotency" ? "idempotency_key" : kind === "checksum" ? "source_checksum" : kind === "fingerprint" ? "normalized_fingerprint" : "identity";
      expect(result.items[1].reason).toBe(expected);
    }
  });

  it("preview no persiste, no crea historial, no versiona y no publica", async () => {
    const test = system("memory");
    const result = await test.pipeline.previewBatch(batch());
    readyItem(result);
    expect(JSON.stringify(result)).not.toMatch(/rawRecord|officialContent|editorialContent|internal|verificationNotes|Parte resolutiva/);
    await expect(test.api.countInternalRecords({ context: context(2) })).resolves.toMatchObject({ total: 0 });
  });

  it("hace idempotente el lote y rechaza reutilizar batchId con otro contenido", async () => {
    const test = system("memory");
    const original = batch();
    const first = await test.pipeline.previewBatch(original);
    await expect(test.pipeline.previewBatch(original)).resolves.toEqual(first);
    await expect(test.pipeline.previewBatch({
      ...original,
      items: original.items.map((item) => ({
        ...item,
        rawRecord: { ...item.rawRecord, matter: "Materia ficticia alterada" },
      })),
    })).resolves.toMatchObject({
      status: "rejected",
      issues: [{ code: "INVALID_BATCH", path: "batchId" }],
    });
  });

  it("no trata título coincidente como identidad suficiente", async () => {
    const first = batch().items[0];
    const secondBatch = batch(2, {
      ...record(2),
      editorialContent: {
        ...record(2).editorialContent,
        editorialTitle: record().editorialContent.editorialTitle,
      },
    });
    const second = secondBatch.items[0];
    if (first === undefined || second === undefined) throw new Error("Fixture incompleto.");
    const result = await system("memory").pipeline.previewBatch({
      ...batch(),
      items: [first, second],
    });
    expect(result).toMatchObject({
      status: "accepted",
      items: [{ status: "preview_ready" }, { status: "preview_ready" }],
    });
  });

  it("confirma creación mediante API y conserva estados privados", async () => {
    const test = system("memory");
    const preview = readyItem(await test.pipeline.previewBatch(batch()));
    const persisted = await test.pipeline.confirmPreview({ context: context(2), previewId: preview.previewId, normalizedRecordFingerprint: preview.normalizedRecordFingerprint, idempotencyKey: batch().items[0]?.idempotencyKey });
    expect(persisted).toMatchObject({ status: "persisted", recordVersion: 1, operation: "create" });
    if (persisted.status === "persisted") {
      await expect(test.api.getInternalRecord({ context: context(3), id: persisted.recordId })).resolves.toMatchObject({ record: { editorialStatus: "draft", publicationStatus: "private", verificationStatus: "unverified" } });
      await expect(test.api.getVersionHistory({ context: context(4), id: persisted.recordId })).resolves.toMatchObject({ entries: [{ version: 1 }] });
    }
  });

  it("confirmación es idempotente y preview alterado se rechaza", async () => {
    const test = system("memory");
    const preview = readyItem(await test.pipeline.previewBatch(batch()));
    const command = { context: context(2), previewId: preview.previewId, normalizedRecordFingerprint: preview.normalizedRecordFingerprint, idempotencyKey: batch().items[0]?.idempotencyKey };
    const first = await test.pipeline.confirmPreview(command);
    const repeated = await test.pipeline.confirmPreview(command);
    expect(repeated).toEqual(first);
    const other = system("memory");
    const otherPreview = readyItem(await other.pipeline.previewBatch(batch(2)));
    await expect(other.pipeline.confirmPreview({ context: context(3), previewId: otherPreview.previewId, normalizedRecordFingerprint: sha256Hex("alterado"), idempotencyKey: batch(2).items[0]?.idempotencyKey })).resolves.toMatchObject({ status: "conflict" });
  });

  it("preview expira", async () => {
    let clock = Date.parse(NOW);
    const test = system("memory", { now: () => new Date(clock).toISOString() });
    const preview = readyItem(await test.pipeline.previewBatch(batch()));
    clock += 16 * 60 * 1000;
    await expect(test.pipeline.confirmPreview({ context: context(2), previewId: preview.previewId, normalizedRecordFingerprint: preview.normalizedRecordFingerprint, idempotencyKey: batch().items[0]?.idempotencyKey })).resolves.toMatchObject({ status: "rejected", issues: [{ code: "PREVIEW_EXPIRED" }] });
  });

  it.each(["memory", "sqlite"] as const)("detecta identidad existente, unchanged y conflicto de versión con %s", async (kind) => {
    const test = system(kind);
    const firstPreview = readyItem(await test.pipeline.previewBatch(batch()));
    const created = await test.pipeline.confirmPreview({ context: context(2), previewId: firstPreview.previewId, normalizedRecordFingerprint: firstPreview.normalizedRecordFingerprint, idempotencyKey: batch().items[0]?.idempotencyKey });
    expect(created.status).toBe("persisted");
    const unchanged = await test.pipeline.previewBatch(batch(2, record()));
    expect(unchanged).toMatchObject({ items: [{ status: "unchanged" }] });
    if (created.status !== "persisted") throw new Error("Creación fallida.");
    const changed = { ...record(), editorialContent: { ...record().editorialContent, editorialSummary: "Resumen editorial actualizado ficticio." } };
    const updateBatch = batch(3, changed, "preview_update");
    const updateItem = { ...updateBatch.items[0], targetRecordId: created.recordId, expectedVersion: 99, changeKind: "editorial_update" as const };
    await expect(test.pipeline.previewBatch({ ...updateBatch, items: [updateItem] })).resolves.toMatchObject({ items: [{ status: "conflict", issues: [{ code: "VERSION_CONFLICT" }] }] });
  });

  it.each(["memory", "sqlite"] as const)("confirma actualización con expectedVersion mediante %s", async (kind) => {
    const test = system(kind);
    const createPreview = readyItem(await test.pipeline.previewBatch(batch()));
    const created = await test.pipeline.confirmPreview({ context: context(2), previewId: createPreview.previewId, normalizedRecordFingerprint: createPreview.normalizedRecordFingerprint, idempotencyKey: batch().items[0]?.idempotencyKey });
    if (created.status !== "persisted") throw new Error("Creación fallida.");
    const changed = { ...record(), editorialContent: { ...record().editorialContent, editorialSummary: "Resumen editorial actualizado ficticio." } };
    const updateBatch = batch(3, changed, "preview_update");
    const updateItem = { ...updateBatch.items[0], targetRecordId: created.recordId, expectedVersion: 1, changeKind: "editorial_update" as const };
    const preview = readyItem(await test.pipeline.previewBatch({ ...updateBatch, items: [updateItem] }));
    const updated = await test.pipeline.confirmPreview({ context: context(4), previewId: preview.previewId, normalizedRecordFingerprint: preview.normalizedRecordFingerprint, idempotencyKey: updateItem.idempotencyKey, expectedVersion: 1 });
    expect(updated).toMatchObject({ status: "persisted", operation: "update", recordVersion: 2 });
  });
});

describe("persistencia de archivo, logging, lifecycle y readiness", () => {
  it("SQLite temporal cierra, reabre, recupera historial y limpia auxiliares", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "buholex-ingestion-11g-"));
    const databasePath = path.join(directory, "ingestion.sqlite");
    let first: JurisprudenceIngestionPipeline | undefined;
    let reopened: JurisprudenceInternalApi | undefined;
    try {
      const api = createSqliteJurisprudenceInternalApi({ databasePath, now: () => NOW });
      first = createJurisprudenceIngestionPipeline({ api, now: () => NOW, generateId: () => "preview-file-11g" });
      const preview = readyItem(await first.previewBatch(batch()));
      const persisted = await first.confirmPreview({ context: context(2), previewId: preview.previewId, normalizedRecordFingerprint: preview.normalizedRecordFingerprint, idempotencyKey: batch().items[0]?.idempotencyKey });
      if (persisted.status !== "persisted") throw new Error("Persistencia fallida.");
      await first.close(context(3));
      first = undefined;
      reopened = createSqliteJurisprudenceInternalApi({ databasePath, now: () => NOW });
      await expect(reopened.getInternalRecord({ context: context(4), id: persisted.recordId })).resolves.toMatchObject({ record: { recordVersion: 1 } });
      await expect(reopened.getVersionHistory({ context: context(5), id: persisted.recordId })).resolves.toMatchObject({ entries: [{ version: 1 }] });
      await reopened.close(context(6));
      reopened = undefined;
      expect(statSync(databasePath).isFile()).toBe(true);
    } finally {
      if (first !== undefined) await first.close(context(7));
      if (reopened !== undefined) await reopened.close(context(8));
      rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      expect(() => statSync(directory)).toThrow();
    }
  });

  it("logging usa campos permitidos, un terminal y no filtra contenido", async () => {
    const logs: JurisprudenceIngestionLogEvent[] = [];
    const test = system("memory", { logs });
    await test.pipeline.previewBatch(batch());
    const terminal = logs.filter((event) => event.operation === "preview_batch" && (event.phase === "completed" || event.phase === "rejected"));
    expect(terminal).toHaveLength(1);
    for (const event of logs) expect(Object.keys(event).sort()).toEqual(["batchId", "operation", "phase", "requestId", "resultCode"].sort());
    expect(JSON.stringify(logs)).not.toMatch(/rawRecord|Parte resolutiva|Sumilla|EXP-FICTICIO|[a-f0-9]{64}|sqlite|SELECT|stack|token|cookie/i);
  });

  it("cierre es idempotente y bloquea operaciones posteriores", async () => {
    const test = system("memory");
    await test.pipeline.close(context(2));
    await test.pipeline.close(context(3));
    await expect(test.pipeline.previewBatch(batch())).resolves.toMatchObject({ status: "rejected", issues: [{ code: "RESOURCE_CLOSED" }] });
  });

  it("readiness mantiene ingesta productiva, publicación, UI y endpoints deshabilitados", () => {
    expect(evaluateJurisprudenceIngestionReadiness()).toMatchObject({
      ingestionContractsReady: true,
      deterministicNormalizationReady: true,
      previewWorkflowReady: true,
      persistenceIntegrationReadyForTesting: true,
      realSourceAcquisitionReady: false,
      personalDataReviewReady: false,
      productionIngestionReady: false,
      automatedPublicationReady: false,
      endpointsMounted: false,
      uiConnected: false,
      overrideSupported: false,
      blockers: expect.arrayContaining(["operator_authentication_missing", "publication_workflow_missing"]),
    });
  });
});

describe("seguridad estática y preservación", () => {
  it("pipeline no importa repositorios, SQLite, SQL, React, rutas ni UI", () => {
    const pipelineSource = readFileSync(path.join(process.cwd(), "lib", "jurisprudence-ingestion-pipeline.ts"), "utf8");
    expect(pipelineSource).not.toMatch(/InMemoryJurisprudenceRepository|SqliteJurisprudenceRepository|from ["']react|components\/|app\/|SELECT |INSERT |UPDATE /);
  });

  it("no crea app/api, route.ts, scraping, fetch, OCR, IA, RAG ni embeddings", () => {
    const authorizedRouteFiles = [
    "app/api/admin/complaints/[complaintId]/responses/route.ts",
    "app/api/admin/complaints/[complaintId]/review/route.ts",
    "app/api/admin/complaints/[complaintId]/route.ts",
    "app/api/admin/complaints/route.ts",
    "app/api/complaints/route.ts",
    "app/api/owl/admission/route.ts",
];
    const appEntries = readdirSync(path.join(process.cwd(), "app"), { recursive: true }).filter((entry): entry is string => typeof entry === "string");
    const routeFiles = appEntries
      .filter((entry) => path.basename(entry) === "route.ts")
      .map((entry) => path.relative(process.cwd(), path.join(process.cwd(), "app", entry)).split(path.sep).join("/"));
    expect(routeFiles.sort()).toEqual(authorizedRouteFiles.sort());
    // ingesta no crea rutas API de jurisprudencia
    expect(appEntries.some((entry) => entry.replaceAll("\\", "/").startsWith("api/") && /jurisprudence/.test(entry))).toBe(false);
    const files = ["types/jurisprudence-ingestion.ts", "lib/schemas/jurisprudence-ingestion.ts", "lib/jurisprudence-ingestion-normalization.ts", "lib/jurisprudence-ingestion-pipeline.ts", "lib/jurisprudence-ingestion-readiness.ts"];
    const sourceCode = files.map((file) => readFileSync(path.join(process.cwd(), file), "utf8")).join("\n");
    expect(sourceCode).not.toMatch(/fetch\(|scrap|crawl|OCR|embedding|\bRAG\b|OpenAI|Anthropic|@auth0/i);
    expect(sourceCode).not.toMatch(/\bany\b/);
  });

  it("barrera de despliegue: el servicio de ingesta carece de rutas y dependencias externas cruzadas", () => {
    const manifest = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    expect(manifest.dependencies).toMatchObject({ react: "19.1.6", "react-dom": "19.1.6" });
    expect(readFileSync(path.join(process.cwd(), "app", "jurisprudencia", "page.tsx"), "utf8")).not.toMatch(/IngestionPipeline|ingestion-pipeline|ingestJurisprudenceRecord|fetch\(/);
  });

  it("no incorpora fixtures jurisprudenciales en public", () => {
    const publicEntries = readdirSync(path.join(process.cwd(), "public"), { recursive: true }).filter((entry): entry is string => typeof entry === "string");
    expect(publicEntries.some((entry) => /11g|jurisprud|fixture/i.test(entry))).toBe(false);
  });

  it("preserva SRV-WEB-001 y BL-LEG-CON-001 estructuralmente", () => {
    expect(publicServices.find((service) => service.id === "SRV-WEB-001")).toMatchObject({ allowsImmediatePayment: false, published: false });
    expect(rentalHousingContract).toMatchObject({
      availabilityStatus: "editorial_preview",
      price: null,
      currency: null,
      licenseStatus: "pending",
      publicationAuthorization: { authorized: false },
      intellectualProperty: { supportingDocument: { publiclyVisible: false, downloadable: false } },
      masterInternalFile: { publicDownloadAuthorized: false },
    });
    expect(rentalHousingContract.commercialFiles.every((file) => !file.publicDownloadAuthorized)).toBe(true);
    expect(rentalHousingContract.annexFiles.every((file) => !file.publicDownloadAuthorized)).toBe(true);
  });
});
