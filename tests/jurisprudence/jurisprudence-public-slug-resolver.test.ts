// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  JurisprudencePublicSlugResolver,
  resolveJurisprudenceCanonicalRecordBySlug,
  type JurisprudenceCanonicalRecordReference,
  type JurisprudencePublicSlugResolverGateway,
} from "@/lib/jurisprudence/jurisprudence-public-slug-resolver";
import { jurisprudencePublicSearchItemSchema } from "@/lib/schemas/jurisprudence-public-search-gateway";
import type { JurisprudencePublicSearchItem } from "@/types/jurisprudence-public-search-gateway";
import type { JurisprudencePublicProjectionDetail } from "@/types/jurisprudence";

describe("HERMES-PROD-A2.2 Server-Side Public Slug → Canonical Record Resolver", () => {
  // CASE 1: slug publicado válido → retorna recordId + recordVersion correctos
  it("CASE 1: slug publicado válido -> retorna recordId + recordVersion correctos", async () => {
    const mockRepo: JurisprudencePublicSlugResolverGateway = {
      findCanonicalReferenceBySlug: vi.fn(async (slug: string): Promise<JurisprudenceCanonicalRecordReference | null> => {
        if (slug === "exp-00123-2024-aa-tc") {
          return {
            recordId: "rec-canonical-uuid-001",
            recordVersion: 2,
          };
        }
        return null;
      }),
    };

    const resolver = new JurisprudencePublicSlugResolver({ repository: mockRepo });
    const result = await resolver.resolveByPublicSlug("exp-00123-2024-aa-tc");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.recordId).toBe("rec-canonical-uuid-001");
      expect(result.value.recordVersion).toBe(2);
    }
    expect(mockRepo.findCanonicalReferenceBySlug).toHaveBeenCalledWith("exp-00123-2024-aa-tc");
  });

  // CASE 2: slug inexistente → not_found
  it("CASE 2: slug inexistente -> not_found", async () => {
    const mockRepo: JurisprudencePublicSlugResolverGateway = {
      findCanonicalReferenceBySlug: vi.fn().mockResolvedValue(null),
    };

    const resolver = new JurisprudencePublicSlugResolver({ repository: mockRepo });
    const result = await resolver.resolveByPublicSlug("slug-inexistente-valido");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("not_found");
    }
    expect(mockRepo.findCanonicalReferenceBySlug).toHaveBeenCalledWith("slug-inexistente-valido");
  });

  // CASE 3: slug vacío → rejected / invalid input según contrato
  it("CASE 3: slug vacío o whitespace -> rejected (invalid_slug)", async () => {
    const mockRepo: JurisprudencePublicSlugResolverGateway = {
      findCanonicalReferenceBySlug: vi.fn(),
    };

    const resolver = new JurisprudencePublicSlugResolver({ repository: mockRepo });

    for (const emptyInput of ["", "   ", " \t\n "]) {
      const result = await resolver.resolveByPublicSlug(emptyInput);
      expect(result).toEqual({ ok: false, code: "invalid_slug" });
    }

    expect(mockRepo.findCanonicalReferenceBySlug).not.toHaveBeenCalled();
  });

  // CASE 4: slug con formato inválido → rejected
  it("CASE 4: slug con formato inválido -> rejected (invalid_slug)", async () => {
    const mockRepo: JurisprudencePublicSlugResolverGateway = {
      findCanonicalReferenceBySlug: vi.fn(),
    };

    const resolver = new JurisprudencePublicSlugResolver({ repository: mockRepo });

    const invalidInputs: unknown[] = [
      "SLUG-MAYUSCULAS",
      "slug_con_guion_bajo",
      "slug/con/slashes",
      "slug;DROP TABLE",
      "slug con espacios",
      "ab", // menos de 3 caracteres
      "a".repeat(181), // más de 180 caracteres
      "--guiones-dobles",
      "-guion-inicial",
      "guion-final-",
      null,
      undefined,
      12345,
      {},
      [],
      { slug: "exp-00123-2024-aa-tc" },
    ];

    for (const invalidInput of invalidInputs) {
      const result = await resolver.resolveByPublicSlug(invalidInput);
      expect(result).toEqual({ ok: false, code: "invalid_slug" });
    }

    expect(mockRepo.findCanonicalReferenceBySlug).not.toHaveBeenCalled();
  });

  // CASE 5: registro interno existente pero no presente en published_records → not_found
  it("CASE 5: registro interno existente pero no presente en published_records -> not_found", async () => {
    // Simula que existe un almacén interno donde el slug existe, pero la proyección pública no lo tiene
    const internalStore = new Map<string, { id: string; version: number }>([
      ["exp-interno-privado-no-publicado", { id: "rec-internal-only", version: 1 }],
    ]);

    const publicProjectionStore = new Map<string, { id: string; version: number }>();
    // publicProjectionStore está intencionalmente vacío para este slug

    const mockRepo: JurisprudencePublicSlugResolverGateway = {
      findCanonicalReferenceBySlug: vi.fn(async (slug: string) => {
        // La consulta del repositorio se realiza EXCLUSIVAMENTE contra la proyección pública
        const published = publicProjectionStore.get(slug);
        if (!published) return null;
        return { recordId: published.id, recordVersion: published.version };
      }),
    };

    const resolver = new JurisprudencePublicSlugResolver({ repository: mockRepo });
    const result = await resolver.resolveByPublicSlug("exp-interno-privado-no-publicado");

    expect(result).toEqual({ ok: false, code: "not_found" });
    expect(mockRepo.findCanonicalReferenceBySlug).toHaveBeenCalledWith("exp-interno-privado-no-publicado");
    // Confirmar que el almacén interno contenía el dato, pero el resolver no lo expuso
    expect(internalStore.has("exp-interno-privado-no-publicado")).toBe(true);
  });

  // CASE 6: registro previamente publicado pero retirado de proyección → not_found
  it("CASE 6: registro previamente publicado pero retirado de proyección -> not_found", async () => {
    // Simula registro que fue despublicado (retirado de published_records)
    const publicProjection = new Map<string, { id: string; version: number }>();
    // Previamente existía "exp-retirado-2024", ahora ha sido eliminado de la tabla
    const mockRepo: JurisprudencePublicSlugResolverGateway = {
      findCanonicalReferenceBySlug: vi.fn(async (slug: string) => {
        const item = publicProjection.get(slug);
        if (!item) return null;
        return { recordId: item.id, recordVersion: item.version };
      }),
    };

    const resolver = new JurisprudencePublicSlugResolver({ repository: mockRepo });
    const result = await resolver.resolveByPublicSlug("exp-retirado-2024");

    expect(result).toEqual({ ok: false, code: "not_found" });
    expect(mockRepo.findCanonicalReferenceBySlug).toHaveBeenCalledWith("exp-retirado-2024");
  });

  // CASE 7: resolver consulta únicamente la proyección pública
  it("CASE 7: resolver consulta únicamente la proyección pública", async () => {
    const calls: string[] = [];
    const mockRepo: JurisprudencePublicSlugResolverGateway = {
      findCanonicalReferenceBySlug: vi.fn(async (slug: string) => {
        calls.push(`public_projection:${slug}`);
        return {
          recordId: "rec-case-7",
          recordVersion: 1,
        };
      }),
    };

    const resolver = new JurisprudencePublicSlugResolver({ repository: mockRepo });
    const result = await resolver.resolveByPublicSlug("exp-valido-007");

    expect(result.ok).toBe(true);
    expect(calls).toEqual(["public_projection:exp-valido-007"]);
    expect(mockRepo.findCanonicalReferenceBySlug).toHaveBeenCalledWith("exp-valido-007");
  });

  // CASE 8: resultado contiene exclusivamente: recordId, recordVersion
  it("CASE 8: resultado contiene exclusivamente: recordId, recordVersion", async () => {
    const mockRepo: JurisprudencePublicSlugResolverGateway = {
      findCanonicalReferenceBySlug: vi.fn().mockResolvedValue({
        recordId: "rec-case-8",
        recordVersion: 1,
      }),
    };

    const resolver = new JurisprudencePublicSlugResolver({ repository: mockRepo });
    const result = await resolver.resolveByPublicSlug("exp-case-8-slug");

    expect(result.ok).toBe(true);
    if (result.ok) {
      const keys = Object.keys(result.value).sort();
      expect(keys).toEqual(["recordId", "recordVersion"].sort());

      // Verificación estricta de que NO contiene otros campos
      expect("id" in result.value).toBe(false);
      expect("slug" in result.value).toBe(false);
      expect("title" in result.value).toBe(false);
      expect("fullText" in result.value).toBe(false);
      expect("officialTitle" in result.value).toBe(false);
      expect("summary" in result.value).toBe(false);
      expect("sourceName" in result.value).toBe(false);
      expect("metadata" in result.value).toBe(false);
      expect("reviewer" in result.value).toBe(false);
    }
  });

  // CASE 9: DTO público de búsqueda sigue sin recordId/recordVersion
  it("CASE 9: DTO público de búsqueda sigue sin recordId/recordVersion", () => {
    const sampleItem: JurisprudencePublicSearchItem = {
      slug: "exp-00123-2024-aa-tc",
      title: "Título oficial",
      caseTitle: "Caso oficial",
      caseNumber: "EXP-001",
      resolutionNumber: "RES-001",
      resolutionType: "Sentencia",
      institutionName: "TC",
      issuingBody: "Pleno",
      matter: "Constitucional",
      issuedAt: "2024-01-01",
      summary: "Resumen público",
      sourceName: "Tribunal Constitucional",
    };

    const itemKeys = Object.keys(sampleItem);
    expect(itemKeys).not.toContain("recordId");
    expect(itemKeys).not.toContain("recordVersion");
    expect(itemKeys).not.toContain("id");

    // Verificar que el schema de búsqueda rechaza campos adicionales de recordId / recordVersion
    const injected = {
      ...sampleItem,
      recordId: "forbidden-record-id",
      recordVersion: 1,
    };
    const parsed = jurisprudencePublicSearchItemSchema.safeParse(injected);
    // .strict() schema debe rechazar campos inyectados
    expect(parsed.success).toBe(false);
  });

  // CASE 10: DTO público de detalle sigue sin recordId/recordVersion
  it("CASE 10: DTO público de detalle sigue sin recordId/recordVersion", () => {
    const sampleDetail: JurisprudencePublicProjectionDetail = {
      slug: "exp-00123-2024-aa-tc",
      title: "Título oficial",
      caseTitle: "Caso oficial",
      caseNumber: "EXP-001",
      resolutionNumber: "RES-001",
      resolutionType: "Sentencia",
      institutionName: "TC",
      issuingBody: "Pleno",
      matter: "Constitucional",
      issuedAt: "2024-01-01",
      summary: "Resumen público",
      sourceName: "Tribunal Constitucional",
      officialHtmlUrl: "https://tc.gob.pe/html",
      officialPdfUrl: "https://tc.gob.pe/pdf",
    };

    const detailKeys = Object.keys(sampleDetail);
    expect(detailKeys).not.toContain("recordId");
    expect(detailKeys).not.toContain("recordVersion");
    expect(detailKeys).not.toContain("id");
  });

  // CASE 11: Client Components no importan módulo server-only
  it("CASE 11: Client Components no importan módulo server-only", () => {
    // 1. Confirmar que el módulo declara "server-only"
    const resolverSource = readFileSync(
      path.join(process.cwd(), "lib", "jurisprudence", "jurisprudence-public-slug-resolver.ts"),
      "utf8"
    );
    expect(resolverSource).toMatch(/import\s+["']server-only["']/);

    // 2. Escanear todos los componentes y páginas cliente ("use client")
    const clientDirs = ["components", "app"];
    const clientFiles: string[] = [];

    function scanDir(dirPath: string) {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(tsx|ts)$/.test(entry.name)) {
          const content = readFileSync(fullPath, "utf8");
          if (content.includes('"use client"') || content.includes("'use client'")) {
            clientFiles.push(fullPath);
          }
        }
      }
    }

    for (const dir of clientDirs) {
      scanDir(path.join(process.cwd(), dir));
    }

    expect(clientFiles.length).toBeGreaterThan(0);

    for (const file of clientFiles) {
      const content = readFileSync(file, "utf8");
      expect(content).not.toContain("jurisprudence-public-slug-resolver");
      expect(content).not.toContain("resolveJurisprudenceCanonicalRecordBySlug");
      expect(content).not.toContain("findCanonicalReferenceBySlug");
    }
  });

  // CASE 12: no existe fallback hacia jurisprudence_internal
  it("CASE 12: no existe fallback hacia jurisprudence_internal", () => {
    const resolverSource = readFileSync(
      path.join(process.cwd(), "lib", "jurisprudence", "jurisprudence-public-slug-resolver.ts"),
      "utf8"
    );
    expect(resolverSource).not.toContain("jurisprudence_internal");
    expect(resolverSource).not.toContain("jurisprudenceInternalSchema");
    expect(resolverSource).not.toContain("jurisprudenceRecords");

    const repoSource = readFileSync(
      path.join(process.cwd(), "lib", "jurisprudence", "postgres-jurisprudence-public-read-repository.ts"),
      "utf8"
    );
    expect(repoSource).not.toContain("jurisprudence_internal");
    expect(repoSource).not.toContain("jurisprudenceInternalSchema");
    expect(repoSource).not.toContain("jurisprudenceRecords");
  });

  it("Helper resolveJurisprudenceCanonicalRecordBySlug funciona idéntico a clase resolver", async () => {
    const mockRepo: JurisprudencePublicSlugResolverGateway = {
      findCanonicalReferenceBySlug: vi.fn(async (slug: string) => {
        if (slug === "exp-helper-001") {
          return { recordId: "rec-helper-1", recordVersion: 1 };
        }
        return null;
      }),
    };

    const resSuccess = await resolveJurisprudenceCanonicalRecordBySlug("exp-helper-001", {
      repository: mockRepo,
    });
    expect(resSuccess).toEqual({
      ok: true,
      value: { recordId: "rec-helper-1", recordVersion: 1 },
    });

    const resNotFound = await resolveJurisprudenceCanonicalRecordBySlug("exp-no-existe-999", {
      repository: mockRepo,
    });
    expect(resNotFound).toEqual({
      ok: false,
      code: "not_found",
    });

    const resInvalid = await resolveJurisprudenceCanonicalRecordBySlug("", {
      repository: mockRepo,
    });
    expect(resInvalid).toEqual({
      ok: false,
      code: "invalid_slug",
    });
  });
});
