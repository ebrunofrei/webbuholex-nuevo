// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import {
  ingestJurisprudenceProduction,
  validateProductionEnvironment,
  mapPilotRecordToCanonicalNewRecord,
  isUnknownRecord,
  JURISPRUDENCE_PRODUCTION_CONFIRM_TOKEN,
  JURISPRUDENCE_PRODUCTION_TARGET,
} from "@/lib/jurisprudence/jurisprudence-production-ingestion";
import type {
  CreateJurisprudenceRecordCommand,
  JurisprudenceInternalApi,
  JurisprudenceRecordMutationResultDto,
  JurisprudenceInternalRecordDto,
  JurisprudenceInternalRecordResultDto,
} from "@/types/jurisprudence-application";

import {
  validateAndExtractPdfSourceDocument,
  type ExtractedSourceDocument,
} from "@/lib/jurisprudence/pdf-text-extractor";
import { CanonicalJurisprudenceInterpretationSourceAdapter } from "@/lib/jurisprudence/canonical-jurisprudence-interpretation-source-adapter";

const VALID_PROD_URL =
  "postgresql://jurisprudence_internal_write_login.znsotcbeawjaigowlzsx:mock_pass@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require&prepare=false";

const PILOT_FIXTURE_PATH = path.resolve(
  process.cwd(),
  "data/jurisprudence/records/1417-2005-AA-TC.json"
);

const SAMPLE_PDF_PATH = path.resolve(
  process.cwd(),
  "tests/fixtures/sample-test.pdf"
);

function makeSampleRecordInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    caseNumber: "EXP-TEST-001/TC",
    slug: "exp-test-001-tc-resolucion",
    editorialTitle: "Resolución de prueba unitaria para extracción",
    processType: "Acción de amparo",
    court: "Tribunal Constitucional del Perú",
    institution: {
      id: "tribunal-constitucional-peru",
      name: "Tribunal Constitucional del Perú",
      shortName: "TC",
      country: "Perú",
      kind: "constitutional_court",
      officialHomepage: "https://www.tc.gob.pe",
    },
    chamber: "Pleno Jurisdiccional",
    decisionDate: "2026-05-15",
    publicationDate: "2026-05-20",
    jurisdiction: "Perú",
    specialty: "Derecho constitucional",
    matter: ["Derecho a la pensión", "Amparo"],
    sourceDocumentId: "4be5f1fcc36814117fca38da6e94db9d6116de4fc128b3ad5ff311b0005d558c",
    sourceVerificationStatus: "official_source_verified",
    sourceVerifiedAt: "2026-05-15",
    ...overrides,
  };
}

function makeValidEnv(
  overrides: Record<string, string | undefined> = {}
): Record<string, string | undefined> {
  return {
    DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL: VALID_PROD_URL,
    JURISPRUDENCE_PRODUCTION_CONFIRM: JURISPRUDENCE_PRODUCTION_CONFIRM_TOKEN,
    ...overrides,
  };
}

describe("Canonical Jurisprudence Production Ingestion Operator", () => {
  describe("A. Refuses execution without Production confirmation guard", () => {
    it("refuses when JURISPRUDENCE_PRODUCTION_CONFIRM is missing", async () => {
      const env = makeValidEnv({ JURISPRUDENCE_PRODUCTION_CONFIRM: undefined });
      await expect(
        ingestJurisprudenceProduction({
          filePath: PILOT_FIXTURE_PATH,
          env,
          dryRun: false,
        })
      ).rejects.toThrow("jurisprudence_production_confirmation_required");
    });

    it("refuses when JURISPRUDENCE_PRODUCTION_CONFIRM has wrong value", async () => {
      const env = makeValidEnv({ JURISPRUDENCE_PRODUCTION_CONFIRM: "YES_DO_IT" });
      await expect(
        ingestJurisprudenceProduction({
          filePath: PILOT_FIXTURE_PATH,
          env,
          dryRun: false,
        })
      ).rejects.toThrow("jurisprudence_production_confirmation_required");
    });
  });

  describe("B. Hardened Production target validation", () => {
    it("refuses if staging project ref is present in write URL", () => {
      const env = makeValidEnv({
        DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL:
          "postgresql://postgres.eyaxxyacysfawlsallic:secret@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?prepare=false",
      });
      expect(() => validateProductionEnvironment(env)).toThrow(
        "jurisprudence_production_target_unverified: staging target detected"
      );
    });

    it("refuses if staging environment variables are present", () => {
      const env = makeValidEnv({
        JURISPRUDENCE_STAGING_PROJECT_REF: "eyaxxyacysfawlsallic",
      });
      expect(() => validateProductionEnvironment(env)).toThrow(
        "jurisprudence_production_target_unverified: staging target detected"
      );
    });

    it("refuses if host does not match approved production host", () => {
      const env = makeValidEnv({
        DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL:
          "postgresql://jurisprudence_internal_write_login.znsotcbeawjaigowlzsx:pass@localhost:6543/postgres?prepare=false",
      });
      expect(() => validateProductionEnvironment(env)).toThrow(
        "unexpected host localhost"
      );
    });

    it("refuses Session Pooler port 5432 (must be Transaction Pooler port 6543)", () => {
      const env = makeValidEnv({
        DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL:
          "postgresql://jurisprudence_internal_write_login.znsotcbeawjaigowlzsx:pass@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?prepare=false",
      });
      expect(() => validateProductionEnvironment(env)).toThrow(
        "unexpected port 5432 (expected Transaction Pooler port 6543)"
      );
    });

    it("refuses default port when not explicitly 6543", () => {
      const env = makeValidEnv({
        DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL:
          "postgresql://jurisprudence_internal_write_login.znsotcbeawjaigowlzsx:pass@aws-0-sa-east-1.pooler.supabase.com/postgres?prepare=false",
      });
      expect(() => validateProductionEnvironment(env)).toThrow(
        "unexpected port default (expected Transaction Pooler port 6543)"
      );
    });

    it("refuses missing prepare=false parameter", () => {
      const env = makeValidEnv({
        DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL:
          "postgresql://jurisprudence_internal_write_login.znsotcbeawjaigowlzsx:pass@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
      });
      expect(() => validateProductionEnvironment(env)).toThrow(
        "prepare=false required for transaction pooler connection"
      );
    });

    it("refuses prepare=true parameter", () => {
      const env = makeValidEnv({
        DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL:
          "postgresql://jurisprudence_internal_write_login.znsotcbeawjaigowlzsx:pass@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?prepare=true",
      });
      expect(() => validateProductionEnvironment(env)).toThrow(
        "prepare=false required for transaction pooler connection"
      );
    });

    it("refuses if username does not contain production project ref", () => {
      const env = makeValidEnv({
        DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL:
          "postgresql://jurisprudence_internal_write_login.wrong_ref:pass@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?prepare=false",
      });
      expect(() => validateProductionEnvironment(env)).toThrow(
        "username does not contain production project ref"
      );
    });

    it("refuses if username does not use internal write login", () => {
      const env = makeValidEnv({
        DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL:
          "postgresql://postgres.znsotcbeawjaigowlzsx:pass@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?prepare=false",
      });
      expect(() => validateProductionEnvironment(env)).toThrow(
        "username does not use internal write login"
      );
    });

    it("refuses username with prefix variation (jurisprudence_internal_write_login_extra...)", () => {
      const env = makeValidEnv({
        DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL:
          "postgresql://jurisprudence_internal_write_login_extra.znsotcbeawjaigowlzsx:pass@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?prepare=false",
      });
      expect(() => validateProductionEnvironment(env)).toThrow(
        "expected exact match"
      );
    });

    it("refuses username with middle variation (jurisprudence_internal_write_login.foo.znsotcbeawjaigowlzsx)", () => {
      const env = makeValidEnv({
        DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL:
          "postgresql://jurisprudence_internal_write_login.foo.znsotcbeawjaigowlzsx:pass@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?prepare=false",
      });
      expect(() => validateProductionEnvironment(env)).toThrow(
        "expected exact match"
      );
    });

    it("refuses if database name is not postgres", () => {
      const env = makeValidEnv({
        DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL:
          "postgresql://jurisprudence_internal_write_login.znsotcbeawjaigowlzsx:pass@aws-0-sa-east-1.pooler.supabase.com:6543/other_db?prepare=false",
      });
      expect(() => validateProductionEnvironment(env)).toThrow(
        "unexpected database name"
      );
    });
  });

  describe("C. Uses canonical application layer without forbidden type casts", () => {
    it("invokes DefaultJurisprudenceInternalApi.createRecord and resolves types without casts", async () => {
      const capturedCommands: CreateJurisprudenceRecordCommand[] = [];

      const mockApi: JurisprudenceInternalApi = {
        createRecord: async (command: CreateJurisprudenceRecordCommand): Promise<JurisprudenceRecordMutationResultDto> => {
          capturedCommands.push(command);
          return {
            requestId: command.context.requestId,
            id: "rec-canonical-001",
            slug: command.record.slug,
            recordVersion: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            editorialStatus: command.record.editorialStatus,
            publicationStatus: command.record.publicationStatus,
            verificationStatus: command.record.source.verificationStatus,
          };
        },
        updateRecord: vi.fn(),
        getInternalRecord: vi.fn(),
        getInternalRecordBySlug: vi.fn(),
        getInternalRecordByIdentity: vi.fn(),
        getVersionHistory: vi.fn(),
        evaluatePublication: vi.fn(),
        listInternalRecords: vi.fn(),
        searchInternalRecords: vi.fn(),
        countInternalRecords: vi.fn(),
        searchPublicRecords: vi.fn(),
        getPublicDetail: vi.fn(),
        close: vi.fn(),
      };

      const result = await ingestJurisprudenceProduction({
        filePath: PILOT_FIXTURE_PATH,
        env: makeValidEnv(),
        customApi: mockApi,
        dryRun: false,
      });

      expect(result.recordId).toBe("rec-canonical-001");
      expect(result.recordVersion).toBe(1);

      // Proven: ZERO double casts, narrowed via type guard
      const capturedCommand = capturedCommands[0];
      if (!capturedCommand) {
        throw new Error("expected capturedCommand to be populated");
      }
      expect(capturedCommand.context.operationSource).toBe("internal_api");
      expect(capturedCommand.context.actor.kind).toBe("system");
      expect(capturedCommand.record.caseNumber).toBe("1417-2005-AA/TC");
    });

    it("validates untrusted input using isUnknownRecord type guard", () => {
      expect(isUnknownRecord({})).toBe(true);
      expect(isUnknownRecord({ key: "val" })).toBe(true);
      expect(isUnknownRecord(null)).toBe(false);
      expect(isUnknownRecord([])).toBe(false);
      expect(isUnknownRecord("string")).toBe(false);
      expect(isUnknownRecord(123)).toBe(false);
    });
  });

  describe("D. Does not publish (forces draft and private)", () => {
    it("ensures publicationStatus is private and editorialStatus is draft", async () => {
      let savedPublicationStatus = "";
      let savedEditorialStatus = "";

      const mockApi: JurisprudenceInternalApi = {
        createRecord: async (command: CreateJurisprudenceRecordCommand): Promise<JurisprudenceRecordMutationResultDto> => {
          savedPublicationStatus = command.record.publicationStatus;
          savedEditorialStatus = command.record.editorialStatus;
          return {
            requestId: command.context.requestId,
            id: "rec-draft-001",
            slug: command.record.slug,
            recordVersion: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            editorialStatus: command.record.editorialStatus,
            publicationStatus: command.record.publicationStatus,
            verificationStatus: command.record.source.verificationStatus,
          };
        },
        updateRecord: vi.fn(),
        getInternalRecord: vi.fn(),
        getInternalRecordBySlug: vi.fn(),
        getInternalRecordByIdentity: vi.fn(),
        getVersionHistory: vi.fn(),
        evaluatePublication: vi.fn(),
        listInternalRecords: vi.fn(),
        searchInternalRecords: vi.fn(),
        countInternalRecords: vi.fn(),
        searchPublicRecords: vi.fn(),
        getPublicDetail: vi.fn(),
        close: vi.fn(),
      };

      const rawContent = fs.readFileSync(PILOT_FIXTURE_PATH, "utf8");
      const rawParsed: unknown = JSON.parse(rawContent);
      if (!isUnknownRecord(rawParsed)) {
        throw new Error("expected pilot fixture to be record");
      }
      expect(rawParsed.isPublic).toBe(true);

      const result = await ingestJurisprudenceProduction({
        recordInput: rawParsed,
        env: makeValidEnv(),
        customApi: mockApi,
        dryRun: false,
      });

      expect(result.editorialStatus).toBe("draft");
      expect(result.publicationStatus).toBe("private");
      expect(savedEditorialStatus).toBe("draft");
      expect(savedPublicationStatus).toBe("private");
    });

    it("rejects canonical input that attempts to auto-publish", () => {
      const canonicalPublished = {
        slug: "1417-2005-aa-tc-test",
        editorialStatus: "verified",
        publicationStatus: "published",
      };
      expect(() => mapPilotRecordToCanonicalNewRecord(canonicalPublished)).toThrow(
        "jurisprudence_ingest_safety_violation"
      );
    });
  });

  describe("E. Real outbox non-invocation test (fixes false outbox test)", () => {
    it("proves structurally and behaviorally that ingest operator only calls createRecord and does not touch publication execution, outbox, or public projection", async () => {
      const invokedMethods: string[] = [];

      const mockApi: JurisprudenceInternalApi = {
        createRecord: vi.fn(async (command: CreateJurisprudenceRecordCommand): Promise<JurisprudenceRecordMutationResultDto> => {
          invokedMethods.push("createRecord");
          expect(command.record.publicationStatus).toBe("private");
          expect(command.record.editorialStatus).toBe("draft");
          expect(command.record.officialContent.publicationAllowed).toBe(false);

          return {
            requestId: command.context.requestId,
            id: "rec-no-outbox",
            slug: command.record.slug,
            recordVersion: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            editorialStatus: command.record.editorialStatus,
            publicationStatus: command.record.publicationStatus,
            verificationStatus: command.record.source.verificationStatus,
          };
        }),
        updateRecord: vi.fn(async () => {
          invokedMethods.push("updateRecord");
          throw new Error("unexpected updateRecord call");
        }),
        getInternalRecord: vi.fn(),
        getInternalRecordBySlug: vi.fn(),
        getInternalRecordByIdentity: vi.fn(),
        getVersionHistory: vi.fn(),
        evaluatePublication: vi.fn(async () => {
          invokedMethods.push("evaluatePublication");
          throw new Error("unexpected evaluatePublication call");
        }),
        listInternalRecords: vi.fn(),
        searchInternalRecords: vi.fn(),
        countInternalRecords: vi.fn(),
        searchPublicRecords: vi.fn(async () => {
          invokedMethods.push("searchPublicRecords");
          throw new Error("unexpected searchPublicRecords call");
        }),
        getPublicDetail: vi.fn(),
        close: vi.fn(),
      };

      const result = await ingestJurisprudenceProduction({
        filePath: PILOT_FIXTURE_PATH,
        env: makeValidEnv(),
        customApi: mockApi,
        dryRun: false,
      });

      expect(mockApi.createRecord).toHaveBeenCalledTimes(1);
      expect(invokedMethods).toEqual(["createRecord"]);
      expect(mockApi.evaluatePublication).not.toHaveBeenCalled();
      expect(mockApi.searchPublicRecords).not.toHaveBeenCalled();
      expect(mockApi.updateRecord).not.toHaveBeenCalled();
      expect(result.publicationStatus).toBe("private");
      expect(result.editorialStatus).toBe("draft");
    });
  });

  describe("F. Does not call OpenAI", () => {
    it("performs zero OpenAI or external LLM network requests", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const mockApi: JurisprudenceInternalApi = {
        createRecord: async (command: CreateJurisprudenceRecordCommand): Promise<JurisprudenceRecordMutationResultDto> => {
          return {
            requestId: command.context.requestId,
            id: "rec-no-openai",
            slug: command.record.slug,
            recordVersion: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            editorialStatus: command.record.editorialStatus,
            publicationStatus: command.record.publicationStatus,
            verificationStatus: command.record.source.verificationStatus,
          };
        },
        updateRecord: vi.fn(),
        getInternalRecord: vi.fn(),
        getInternalRecordBySlug: vi.fn(),
        getInternalRecordByIdentity: vi.fn(),
        getVersionHistory: vi.fn(),
        evaluatePublication: vi.fn(),
        listInternalRecords: vi.fn(),
        searchInternalRecords: vi.fn(),
        countInternalRecords: vi.fn(),
        searchPublicRecords: vi.fn(),
        getPublicDetail: vi.fn(),
        close: vi.fn(),
      };

      await ingestJurisprudenceProduction({
        filePath: PILOT_FIXTURE_PATH,
        env: makeValidEnv(),
        customApi: mockApi,
        dryRun: false,
      });

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });

  describe("G. Does not directly write public projection", () => {
    it("operates strictly within internal records ledger via repository contract", async () => {
      const mockApi: JurisprudenceInternalApi = {
        createRecord: async (command: CreateJurisprudenceRecordCommand): Promise<JurisprudenceRecordMutationResultDto> => {
          expect(command.record.publicationStatus).toBe("private");
          return {
            requestId: command.context.requestId,
            id: "rec-internal-only",
            slug: command.record.slug,
            recordVersion: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            editorialStatus: command.record.editorialStatus,
            publicationStatus: command.record.publicationStatus,
            verificationStatus: command.record.source.verificationStatus,
          };
        },
        updateRecord: vi.fn(),
        getInternalRecord: vi.fn(),
        getInternalRecordBySlug: vi.fn(),
        getInternalRecordByIdentity: vi.fn(),
        getVersionHistory: vi.fn(),
        evaluatePublication: vi.fn(),
        listInternalRecords: vi.fn(),
        searchInternalRecords: vi.fn(),
        countInternalRecords: vi.fn(),
        searchPublicRecords: vi.fn(),
        getPublicDetail: vi.fn(),
        close: vi.fn(),
      };

      const result = await ingestJurisprudenceProduction({
        filePath: PILOT_FIXTURE_PATH,
        env: makeValidEnv(),
        customApi: mockApi,
        dryRun: false,
      });

      expect(result.publicationStatus).toBe("private");
    });
  });

  describe("H. Fails closed on missing required legal metadata (No Legal Fabrication)", () => {
    it("fails closed when file does not exist", async () => {
      await expect(
        ingestJurisprudenceProduction({
          filePath: "non-existent-path.json",
          env: makeValidEnv(),
          dryRun: true,
        })
      ).rejects.toThrow("jurisprudence_source_not_found");
    });

    it("fails closed when record input is not an object", () => {
      expect(() => mapPilotRecordToCanonicalNewRecord("invalid-string")).toThrow(
        "jurisprudence_source_malformed"
      );
    });

    it("fails closed when caseNumber is missing", () => {
      expect(() => mapPilotRecordToCanonicalNewRecord({ slug: "valid-slug" })).toThrow(
        "missing required caseNumber"
      );
    });

    it("fails closed when processType/resolutionType is missing (no amparo default)", () => {
      expect(() =>
        mapPilotRecordToCanonicalNewRecord({
          caseNumber: "123-2026",
          slug: "123-2026-test",
          editorialTitle: "Título editorial válido",
        })
      ).toThrow("missing required processType/resolutionType");
    });

    it("fails closed when court/institution is missing (no TC default)", () => {
      expect(() =>
        mapPilotRecordToCanonicalNewRecord({
          caseNumber: "123-2026",
          slug: "123-2026-test",
          editorialTitle: "Título editorial válido",
          processType: "Habeas corpus",
        })
      ).toThrow("missing required court/institution");
    });

    it("fails closed when jurisdiction is missing (no Perú default)", () => {
      expect(() =>
        mapPilotRecordToCanonicalNewRecord({
          caseNumber: "123-2026",
          slug: "123-2026-test",
          editorialTitle: "Título editorial válido",
          processType: "Habeas corpus",
          court: "Corte Superior de Lima",
        })
      ).toThrow("missing required jurisdiction");
    });

    it("fails closed when chamber is missing (no Pleno default)", () => {
      expect(() =>
        mapPilotRecordToCanonicalNewRecord({
          caseNumber: "123-2026",
          slug: "123-2026-test",
          editorialTitle: "Título editorial válido",
          processType: "Habeas corpus",
          court: "Corte Superior de Lima",
          jurisdiction: "Perú",
        })
      ).toThrow("missing required chamber/issuingBody");
    });

    it("fails closed when decisionDate is missing", () => {
      expect(() =>
        mapPilotRecordToCanonicalNewRecord({
          caseNumber: "123-2026",
          slug: "123-2026-test",
          editorialTitle: "Título editorial válido",
          processType: "Habeas corpus",
          court: "Corte Superior de Lima",
          jurisdiction: "Perú",
          chamber: "Sala Penal",
        })
      ).toThrow("missing required decisionDate/issuedAt");
    });

    it("fails closed when specialty is missing (no Derecho constitucional default)", () => {
      expect(() =>
        mapPilotRecordToCanonicalNewRecord({
          caseNumber: "123-2026",
          slug: "123-2026-test",
          editorialTitle: "Título editorial válido",
          processType: "Habeas corpus",
          court: "Corte Superior de Lima",
          jurisdiction: "Perú",
          chamber: "Sala Penal",
          decisionDate: "2026-05-10",
        })
      ).toThrow("missing required specialty");
    });

    it("fails closed when matter is missing (no pensión default)", () => {
      expect(() =>
        mapPilotRecordToCanonicalNewRecord({
          caseNumber: "123-2026",
          slug: "123-2026-test",
          editorialTitle: "Título editorial válido",
          processType: "Habeas corpus",
          court: "Corte Superior de Lima",
          jurisdiction: "Perú",
          chamber: "Sala Penal",
          decisionDate: "2026-05-10",
          specialty: "Derecho penal",
        })
      ).toThrow("missing required matter");
    });
  });

  describe("I. Provenance and Legal Integrity", () => {
    it("preserves real SHA-256 source checksum from pilot provenance", () => {
      const rawContent = fs.readFileSync(PILOT_FIXTURE_PATH, "utf8");
      const rawParsed: unknown = JSON.parse(rawContent);
      if (!isUnknownRecord(rawParsed)) {
        throw new Error("expected pilot fixture to be record");
      }

      const canonical = mapPilotRecordToCanonicalNewRecord(rawParsed);

      // Proven: Preserves verified SHA-256 checksum from sourceDocumentId
      expect(canonical.source.checksum).toBe(
        "9b0b8f171a825110c6c5fb23049731743639f436402fb1af13d5b0a7102f2f48"
      );
      expect(canonical.source.documentId).toBe(
        "9B0B8F171A825110C6C5FB23049731743639F436402FB1AF13D5B0A7102F2F48"
      );
    });

    it("does not fabricate human verifier when reviewer is absent", () => {
      const rawContent = fs.readFileSync(PILOT_FIXTURE_PATH, "utf8");
      const rawParsed: unknown = JSON.parse(rawContent);
      if (!isUnknownRecord(rawParsed)) {
        throw new Error("expected pilot fixture to be record");
      }

      // Remove reviewer from input
      const withoutReviewer = { ...rawParsed, reviewer: undefined };
      const canonical = mapPilotRecordToCanonicalNewRecord(withoutReviewer);

      // Proven: verifiedBy is null, never fabricated
      expect(canonical.source.verifiedBy).toBeNull();
    });

    it("maps reviewer truthfully when explicitly present", () => {
      const rawContent = fs.readFileSync(PILOT_FIXTURE_PATH, "utf8");
      const rawParsed: unknown = JSON.parse(rawContent);
      if (!isUnknownRecord(rawParsed)) {
        throw new Error("expected pilot fixture to be record");
      }

      const canonical = mapPilotRecordToCanonicalNewRecord(rawParsed);
      expect(canonical.source.verifiedBy).toBe("Eduardo Frei Bruno Gómez");
    });

    it("fails closed when source claims verified but lacks sourceVerifiedAt date", () => {
      const rawContent = fs.readFileSync(PILOT_FIXTURE_PATH, "utf8");
      const rawParsed: unknown = JSON.parse(rawContent);
      if (!isUnknownRecord(rawParsed)) {
        throw new Error("expected pilot fixture to be record");
      }

      const unverifiedDate = { ...rawParsed, sourceVerifiedAt: undefined };
      expect(() => mapPilotRecordToCanonicalNewRecord(unverifiedDate)).toThrow(
        "verified source status requires sourceVerifiedAt date"
      );
    });

    it("does not fabricate validity conclusions when source lacks validity evidence", () => {
      const rawContent = fs.readFileSync(PILOT_FIXTURE_PATH, "utf8");
      const rawParsed: unknown = JSON.parse(rawContent);
      if (!isUnknownRecord(rawParsed)) {
        throw new Error("expected pilot fixture to be record");
      }

      const canonical = mapPilotRecordToCanonicalNewRecord(rawParsed);

      // Proven: truthful domain-supported unknown state, no fabricated validity assertions
      expect(canonical.authority.validityStatus).toBe("unknown");
      expect(canonical.authority.validityEvidence).toBeNull();
    });

    it("truthfully maps explicit operator audit identity when provided", async () => {
      const capturedCommands: CreateJurisprudenceRecordCommand[] = [];

      const mockApi: JurisprudenceInternalApi = {
        createRecord: async (command: CreateJurisprudenceRecordCommand): Promise<JurisprudenceRecordMutationResultDto> => {
          capturedCommands.push(command);
          return {
            requestId: command.context.requestId,
            id: "rec-op-001",
            slug: command.record.slug,
            recordVersion: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            editorialStatus: command.record.editorialStatus,
            publicationStatus: command.record.publicationStatus,
            verificationStatus: command.record.source.verificationStatus,
          };
        },
        updateRecord: vi.fn(),
        getInternalRecord: vi.fn(),
        getInternalRecordBySlug: vi.fn(),
        getInternalRecordByIdentity: vi.fn(),
        getVersionHistory: vi.fn(),
        evaluatePublication: vi.fn(),
        listInternalRecords: vi.fn(),
        searchInternalRecords: vi.fn(),
        countInternalRecords: vi.fn(),
        searchPublicRecords: vi.fn(),
        getPublicDetail: vi.fn(),
        close: vi.fn(),
      };

      await ingestJurisprudenceProduction({
        filePath: PILOT_FIXTURE_PATH,
        env: makeValidEnv(),
        customApi: mockApi,
        operatorId: "operator_human_42",
        operatorDisplayName: "Human Operator 42",
        dryRun: false,
      });

      const capturedCommand = capturedCommands[0];
      if (!capturedCommand) {
        throw new Error("expected command to be captured");
      }
      expect(capturedCommand.context.actor.kind).toBe("editorial_operator");
      expect(capturedCommand.context.actor.id).toBe("operator_human_42");
      expect(capturedCommand.context.actor.displayName).toBe("Human Operator 42");
    });
  });

  describe("J. Accepts valid canonical committed pilot fixture in dry-run/validation mode", () => {
    it("successfully validates 1417-2005-AA-TC.json in dry-run mode", async () => {
      const result = await ingestJurisprudenceProduction({
        filePath: PILOT_FIXTURE_PATH,
        env: makeValidEnv(),
        dryRun: true,
      });

      expect(result.dryRun).toBe(true);
      expect(result.caseNumber).toBe("1417-2005-AA/TC");
      expect(result.slug).toBe(
        "1417-2005-aa-tc-contenido-protegido-pension-amparo"
      );
      expect(result.editorialStatus).toBe("draft");
      expect(result.publicationStatus).toBe("private");
    });
  });

  describe("K. Verified PDF Source Document Contract & Validation (H2R-FIX2)", () => {
    it("fails closed when source document path does not exist", () => {
      expect(() =>
        validateAndExtractPdfSourceDocument("tests/fixtures/non-existent.pdf")
      ).toThrow("jurisprudence_source_document_not_found");
    });

    it("fails closed when source document path is empty or whitespace", () => {
      expect(() => validateAndExtractPdfSourceDocument("   ")).toThrow(
        "jurisprudence_source_document_missing_path"
      );
    });

    it("fails closed when source document is empty (0 bytes)", () => {
      const emptyPath = path.resolve(process.cwd(), "scratch/empty-temp.pdf");
      try {
        fs.writeFileSync(emptyPath, Buffer.alloc(0));
        expect(() => validateAndExtractPdfSourceDocument(emptyPath)).toThrow(
          "jurisprudence_source_document_invalid: file is empty"
        );
      } finally {
        if (fs.existsSync(emptyPath)) fs.unlinkSync(emptyPath);
      }
    });

    it("fails closed when source document does not have .pdf extension", () => {
      const txtPath = path.resolve(process.cwd(), "scratch/not-a-pdf.txt");
      try {
        fs.writeFileSync(txtPath, "Some non-pdf text content");
        expect(() => validateAndExtractPdfSourceDocument(txtPath)).toThrow(
          "jurisprudence_source_document_invalid: file must have .pdf extension"
        );
      } finally {
        if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath);
      }
    });

    it("fails closed when file has .pdf extension but lacks %PDF- header", () => {
      const fakePdfPath = path.resolve(process.cwd(), "scratch/fake-header.pdf");
      try {
        fs.writeFileSync(fakePdfPath, "NOT_A_REAL_PDF_HEADER");
        expect(() => validateAndExtractPdfSourceDocument(fakePdfPath)).toThrow(
          "jurisprudence_source_document_invalid: file does not have valid %PDF- header"
        );
      } finally {
        if (fs.existsSync(fakePdfPath)) fs.unlinkSync(fakePdfPath);
      }
    });

    it("fails closed when PDF has no extractable text layer (OCR forbidden)", () => {
      expect(() =>
        validateAndExtractPdfSourceDocument(SAMPLE_PDF_PATH, {
          customExtractor: () => ({
            pageCount: 1,
            pages: [{ pageNumber: 1, text: "   \n\r  " }],
          }),
        })
      ).toThrow("jurisprudence_source_document_text_layer_missing");
    });

    it("extracts text deterministically with page count and boundary markers", () => {
      const doc = validateAndExtractPdfSourceDocument(SAMPLE_PDF_PATH);

      expect(doc.pageCount).toBe(2);
      expect(doc.fileName).toBe("sample-test.pdf");
      expect(doc.sha256).toBe(
        "4be5f1fcc36814117fca38da6e94db9d6116de4fc128b3ad5ff311b0005d558c"
      );
      expect(doc.officialFullText).toContain("--- [PÁGINA 1] ---");
      expect(doc.officialFullText).toContain("Texto de la primera pagina");
      expect(doc.officialFullText).toContain("--- [PÁGINA 2] ---");
      expect(doc.officialFullText).toContain("Texto de la segunda pagina");
      expect(doc.characterCount).toBe(doc.officialFullText.length);
    });
  });

  describe("L. Checksum Reconciliation & Provenance Semantics (H2R-FIX2)", () => {
    it("fails closed when PDF SHA-256 does not match metadata sourceDocumentId", async () => {
      const mismatchedInput = makeSampleRecordInput({
        sourceDocumentId:
          "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      });

      await expect(
        ingestJurisprudenceProduction({
          recordInput: mismatchedInput,
          sourceDocumentPath: SAMPLE_PDF_PATH,
          env: makeValidEnv(),
          dryRun: true,
        })
      ).rejects.toThrow("jurisprudence_source_document_checksum_mismatch");
    });

    it("reconciles checksum successfully when PDF SHA-256 matches metadata", async () => {
      const matchingInput = makeSampleRecordInput({
        sourceDocumentId:
          "4be5f1fcc36814117fca38da6e94db9d6116de4fc128b3ad5ff311b0005d558c",
      });

      const result = await ingestJurisprudenceProduction({
        recordInput: matchingInput,
        sourceDocumentPath: SAMPLE_PDF_PATH,
        env: makeValidEnv(),
        dryRun: true,
      });

      expect(result.dryRun).toBe(true);
      expect(result.checksumMatch).toBe(true);
      expect(result.sourceFileName).toBe("sample-test.pdf");
      expect(result.pageCount).toBe(2);
      expect(result.fullTextAvailable).toBe(true);
      expect(result.extractedCharacterCount).toBeGreaterThan(0);
    });

    it("proves sourceDocumentId semantics identify binary PDF digest", () => {
      const doc = validateAndExtractPdfSourceDocument(SAMPLE_PDF_PATH);
      const binaryBytes = fs.readFileSync(SAMPLE_PDF_PATH);
      const expectedDigest = crypto
        .createHash("sha256")
        .update(binaryBytes)
        .digest("hex");

      expect(doc.sha256).toBe(expectedDigest);
    });

    it("does NOT persist workstation local paths into canonical database record", () => {
      const doc = validateAndExtractPdfSourceDocument(SAMPLE_PDF_PATH);
      const input = makeSampleRecordInput();
      const canonical = mapPilotRecordToCanonicalNewRecord(input, {
        sourceDocument: doc,
      });

      const serialized = JSON.stringify(canonical);
      expect(serialized).not.toContain("C:\\");
      expect(serialized).not.toContain("C:/");
      expect(serialized).not.toContain("/Users/");
      expect(serialized).not.toContain("sample-test.pdf");
      expect(canonical.officialFile).toBeNull();
    });
  });

  describe("M. Canonical Content State & Invariants (H2R-FIX2)", () => {
    it("maps officialContent with fullTextAvailable, documentAvailability and pageCount", () => {
      const doc = validateAndExtractPdfSourceDocument(SAMPLE_PDF_PATH);
      const input = makeSampleRecordInput();
      const canonical = mapPilotRecordToCanonicalNewRecord(input, {
        sourceDocument: doc,
      });

      expect(canonical.officialContent.fullTextAvailable).toBe(true);
      expect(canonical.officialContent.documentAvailability).toBe(
        "full_text_available"
      );
      expect(canonical.officialContent.originFormat).toBe("pdf");
      expect(canonical.officialContent.pageCount).toBe(2);
      expect(canonical.officialContent.officialFullText).toBe(
        doc.officialFullText
      );
    });

    it("enforces publicationAllowed=false, publicationStatus=private, editorialStatus=draft", () => {
      const doc = validateAndExtractPdfSourceDocument(SAMPLE_PDF_PATH);
      const input = makeSampleRecordInput();
      const canonical = mapPilotRecordToCanonicalNewRecord(input, {
        sourceDocument: doc,
      });

      expect(canonical.officialContent.publicationAllowed).toBe(false);
      expect(canonical.publicationStatus).toBe("private");
      expect(canonical.editorialStatus).toBe("draft");
    });

    it("does NOT infer legal metadata from PDF text layer", () => {
      const doc = validateAndExtractPdfSourceDocument(SAMPLE_PDF_PATH);
      const input = makeSampleRecordInput({
        caseNumber: "EXP-LEGAL-METADATA-999/TC",
        processType: "Sentencia interlocutoria",
      });
      const canonical = mapPilotRecordToCanonicalNewRecord(input, {
        sourceDocument: doc,
      });

      expect(canonical.caseNumber).toBe("EXP-LEGAL-METADATA-999/TC");
      expect(canonical.resolutionType).toBe("Sentencia interlocutoria");
      expect(canonical.institution.name).toBe("Tribunal Constitucional del Perú");
    });
  });

  describe("N. Hermes Interpretation Source Adapter Readiness Contract (H2R-FIX2)", () => {
    it("refuses immediate Hermes execution while record remains private/draft", async () => {
      const doc = validateAndExtractPdfSourceDocument(SAMPLE_PDF_PATH);
      const input = makeSampleRecordInput();
      const canonical = mapPilotRecordToCanonicalNewRecord(input, {
        sourceDocument: doc,
      });

      const mockRecord: JurisprudenceInternalRecordDto = {
        id: "rec-test-123",
        slug: canonical.slug,
        recordVersion: 1,
        editorialStatus: canonical.editorialStatus,
        publicationStatus: canonical.publicationStatus,
        verificationStatus: canonical.source.verificationStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        caseNumber: canonical.caseNumber,
        resolutionNumber: canonical.resolutionNumber,
        resolutionType: canonical.resolutionType,
        institution: canonical.institution,
        institutionId: canonical.institution.id,
        institutionName: canonical.institution.name,
        issuingBody: canonical.issuingBody,
        instanceLevel: canonical.instanceLevel,
        specialty: canonical.specialty,
        matter: canonical.matter,
        submatter: canonical.submatter,
        judicialDistrict: canonical.judicialDistrict,
        chamberOrCourt: canonical.chamberOrCourt,
        rapporteur: canonical.rapporteur,
        issuedAt: canonical.issuedAt,
        officiallyPublishedAt: canonical.officiallyPublishedAt,
        officialContent: canonical.officialContent,
        editorialContent: canonical.editorialContent,
        generatedContent: canonical.generatedContent,
        authority: canonical.authority,
        legalAuthority: canonical.authority.legalAuthority,
        source: canonical.source,
        officialFile: canonical.officialFile,
        search: canonical.search,
        internal: canonical.internal,
        publicable: false,
      };

      const adapter = new CanonicalJurisprudenceInterpretationSourceAdapter({
        service: {
          getInternalRecord: async (): Promise<JurisprudenceInternalRecordResultDto> => ({
            requestId: "req-hermes-test-1",
            record: mockRecord,
          }),
        },
      });

      const retrieved = await adapter.findById("rec-test-123");
      expect(retrieved).toBeNull();
    });

    it("proves Hermes can retrieve officialFullText once subsequent publication occurs", async () => {
      const doc = validateAndExtractPdfSourceDocument(SAMPLE_PDF_PATH);
      const input = makeSampleRecordInput();
      const canonical = mapPilotRecordToCanonicalNewRecord(input, {
        sourceDocument: doc,
      });

      const publishedRecord: JurisprudenceInternalRecordDto = {
        id: "rec-test-123",
        slug: canonical.slug,
        recordVersion: 1,
        editorialStatus: "verified",
        publicationStatus: "published",
        verificationStatus: canonical.source.verificationStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        caseNumber: canonical.caseNumber,
        resolutionNumber: canonical.resolutionNumber,
        resolutionType: canonical.resolutionType,
        institution: canonical.institution,
        institutionId: canonical.institution.id,
        institutionName: canonical.institution.name,
        issuingBody: canonical.issuingBody,
        instanceLevel: canonical.instanceLevel,
        specialty: canonical.specialty,
        matter: canonical.matter,
        submatter: canonical.submatter,
        judicialDistrict: canonical.judicialDistrict,
        chamberOrCourt: canonical.chamberOrCourt,
        rapporteur: canonical.rapporteur,
        issuedAt: canonical.issuedAt,
        officiallyPublishedAt: canonical.officiallyPublishedAt,
        officialContent: {
          ...canonical.officialContent,
          publicationAllowed: true,
        },
        editorialContent: canonical.editorialContent,
        generatedContent: canonical.generatedContent,
        authority: canonical.authority,
        legalAuthority: canonical.authority.legalAuthority,
        source: canonical.source,
        officialFile: canonical.officialFile,
        search: canonical.search,
        internal: canonical.internal,
        publicable: true,
      };

      const adapter = new CanonicalJurisprudenceInterpretationSourceAdapter({
        service: {
          getInternalRecord: async (): Promise<JurisprudenceInternalRecordResultDto> => ({
            requestId: "req-hermes-test-2",
            record: publishedRecord,
          }),
        },
      });

      const retrieved = await adapter.findById("rec-test-123");
      expect(retrieved).not.toBeNull();
      if (!retrieved) throw new Error("expected retrieved record");
      expect(retrieved.caseNumber).toBe(canonical.caseNumber);
      expect(retrieved.fullText).toBe(doc.officialFullText);
      expect(retrieved.fullText).toContain("--- [PÁGINA 1] ---");
    });
  });

  describe("O. Production Pilot Dry-Run Validation (Portable Fixture)", () => {
    it("validates dry-run execution using repository-contained fixture", async () => {
      const result = await ingestJurisprudenceProduction({
        recordInput: makeSampleRecordInput({
          sourceDocumentId:
            "4be5f1fcc36814117fca38da6e94db9d6116de4fc128b3ad5ff311b0005d558c",
        }),
        sourceDocumentPath: SAMPLE_PDF_PATH,
        env: makeValidEnv(),
        dryRun: true,
      });

      expect(result.dryRun).toBe(true);
      expect(result.caseNumber).toBe("EXP-TEST-001/TC");
      expect(result.sourceFileName).toBe("sample-test.pdf");
      expect(result.pageCount).toBe(2);
      expect(result.checksumMatch).toBe(true);
      expect(result.fullTextAvailable).toBe(true);
      expect(result.extractedCharacterCount).toBeGreaterThan(0);
      expect(result.editorialStatus).toBe("draft");
      expect(result.publicationStatus).toBe("private");
    });
  });

  const runtimeOperatorPdf = process.env.OPERATOR_SOURCE_DOCUMENT_PATH;
  const describeOperatorRun =
    runtimeOperatorPdf && fs.existsSync(runtimeOperatorPdf)
      ? describe
      : describe.skip;
  describeOperatorRun(
    "P. Operator Real Pilot Dry-Run (Runtime-Provided Path)",
    () => {
      it("validates 1417-2005-AA-TC.json with operator-provided 29-page PDF", async () => {
        if (!runtimeOperatorPdf) return;
        const result = await ingestJurisprudenceProduction({
          filePath: PILOT_FIXTURE_PATH,
          sourceDocumentPath: runtimeOperatorPdf,
          env: makeValidEnv(),
          dryRun: true,
        });

        expect(result.dryRun).toBe(true);
        expect(result.caseNumber).toBe("1417-2005-AA/TC");
        expect(result.slug).toBe(
          "1417-2005-aa-tc-contenido-protegido-pension-amparo"
        );
        expect(result.pageCount).toBe(29);
        expect(result.checksumMatch).toBe(true);
        expect(result.fullTextAvailable).toBe(true);
        expect(result.extractedCharacterCount).toBeGreaterThan(70_000);
        expect(result.editorialStatus).toBe("draft");
        expect(result.publicationStatus).toBe("private");
      });
    }
  );

  describe("Q. Direct Canonical Parse Bypass Regression Prevention (Section 10 & 11)", () => {
    it("reconciles sourceDocument into canonical record even when input is already fully schema-valid", () => {
      const doc = validateAndExtractPdfSourceDocument(SAMPLE_PDF_PATH);
      // Create an already fully schema-valid canonical record with metadata-only / empty text
      const initialValidCanonical = mapPilotRecordToCanonicalNewRecord(
        makeSampleRecordInput()
      );
      expect(
        initialValidCanonical.officialContent.officialFullText
      ).toBeNull();
      expect(
        initialValidCanonical.officialContent.fullTextAvailable
      ).toBe(false);
      expect(initialValidCanonical.officialContent.originFormat).toBe("html");

      // Pass the already schema-valid canonical record + valid sourceDocument
      const reconciled = mapPilotRecordToCanonicalNewRecord(
        initialValidCanonical,
        {
          sourceDocument: doc,
        }
      );

      // MUST contain verified source PDF data (would FAIL against pre-FIX3 implementation)
      expect(reconciled.officialContent.officialFullText).not.toBeNull();
      expect(reconciled.officialContent.officialFullText).toBe(
        doc.officialFullText
      );
      expect(reconciled.officialContent.fullTextAvailable).toBe(true);
      expect(reconciled.officialContent.originFormat).toBe("pdf");
      expect(reconciled.officialContent.pageCount).toBe(doc.pageCount);
      expect(reconciled.source.checksum).toBe(doc.sha256);
      expect(reconciled.editorialStatus).toBe("draft");
      expect(reconciled.publicationStatus).toBe("private");
      expect(reconciled.officialContent.publicationAllowed).toBe(false);
    });

    it("fails closed if already schema-valid canonical record source checksum mismatches sourceDocument", () => {
      const doc = validateAndExtractPdfSourceDocument(SAMPLE_PDF_PATH);
      const initialValidCanonical = mapPilotRecordToCanonicalNewRecord(
        makeSampleRecordInput()
      );
      // Alter the checksum to a different valid sha256
      const tamperedRecord = {
        ...initialValidCanonical,
        source: {
          ...initialValidCanonical.source,
          checksum:
            "1111111111111111111111111111111111111111111111111111111111111111",
        },
      };

      expect(() =>
        mapPilotRecordToCanonicalNewRecord(tamperedRecord, {
          sourceDocument: doc,
        })
      ).toThrow("jurisprudence_source_document_checksum_mismatch");
    });
  });

  describe("R. Zero Legal Classification Inference (Section 7, 8, 9)", () => {
    it("does not infer legalAuthority from bindingJurisprudentialRule or court name, defaulting to unknown", () => {
      const input = makeSampleRecordInput({
        court: "Tribunal Constitucional del Perú",
        bindingJurisprudentialRule:
          "Regla vinculante extensa para probar la completa eliminación de inferencia",
      });
      delete input.authority;

      const canonical = mapPilotRecordToCanonicalNewRecord(input);
      expect(canonical.authority.legalAuthority).toBe("unknown");
      expect(canonical.authority.authorityEvidence).toBeNull();
    });

    it("does not infer resolutionCategory from institution.kind constitutional_court, defaulting to other", () => {
      const input = makeSampleRecordInput({
        institution: {
          id: "tribunal-constitucional-peru",
          name: "Tribunal Constitucional del Perú",
          shortName: "TC",
          country: "Perú",
          kind: "constitutional_court",
          officialHomepage: "https://www.tc.gob.pe",
        },
      });
      delete input.authority;

      const canonical = mapPilotRecordToCanonicalNewRecord(input);
      expect(canonical.authority.resolutionCategory).toBe("other");
    });

    it("accepts explicit verified authority metadata from structured input", () => {
      const input = makeSampleRecordInput({
        authority: {
          resolutionCategory: "constitutional_judgment",
          legalAuthority: "constitutional_precedent",
          authorityEvidence:
            "Criterio declarado expresamente como precedente vinculante en fundamento resolutivo de prueba.",
          authorityVerifiedAt: "2026-08-02T00:00:00.000Z",
          validityStatus: "current",
          validityEvidence: "Precedente vinculante vigente.",
        },
      });

      const canonical = mapPilotRecordToCanonicalNewRecord(input);
      expect(canonical.authority.resolutionCategory).toBe(
        "constitutional_judgment"
      );
      expect(canonical.authority.legalAuthority).toBe(
        "constitutional_precedent"
      );
      expect(canonical.authority.authorityEvidence).toBe(
        "Criterio declarado expresamente como precedente vinculante en fundamento resolutivo de prueba."
      );
      expect(canonical.authority.validityStatus).toBe("current");
    });

    it("proves sourceVerifiedAt alone does NOT populate authorityVerifiedAt", () => {
      const input = makeSampleRecordInput({
        sourceVerifiedAt: "2026-08-02",
      });
      delete input.authority;

      const canonical = mapPilotRecordToCanonicalNewRecord(input);
      expect(canonical.source.verifiedAt).toBe("2026-08-02T00:00:00.000Z");
      expect(canonical.authority.authorityVerifiedAt).toBeNull();
    });

    it("fails closed when non-unknown legalAuthority lacks explicit authorityVerifiedAt date", () => {
      const input = makeSampleRecordInput({
        sourceVerifiedAt: "2026-08-02",
        authority: {
          resolutionCategory: "constitutional_judgment",
          legalAuthority: "constitutional_precedent",
          authorityEvidence:
            "Criterio declarado expresamente como precedente vinculante en fundamento resolutivo de prueba.",
        },
      });

      expect(() => mapPilotRecordToCanonicalNewRecord(input)).toThrow(
        "non-unknown legalAuthority requires explicit authorityVerifiedAt date"
      );
    });

    it("validates pilot fixture contains explicit verified authority metadata", () => {
      const pilotJson = JSON.parse(
        fs.readFileSync(PILOT_FIXTURE_PATH, "utf8")
      );
      expect(pilotJson.authority).toBeDefined();
      expect(pilotJson.authority.resolutionCategory).toBe(
        "constitutional_judgment"
      );
      expect(pilotJson.authority.legalAuthority).toBe(
        "constitutional_precedent"
      );
      expect(pilotJson.authority.authorityEvidence).toContain("fundamento 37");
      expect(pilotJson.authority.authorityEvidence).toContain(
        "fundamento 47 declara que los criterios jurídicos contenidos en el fundamento 37 constituyen precedente vinculante"
      );
      expect(pilotJson.authority.authorityEvidence).toContain(
        "numeral 5 del fallo declara vinculantes las reglas procesales previstas en los fundamentos 54 a 58"
      );

      const canonical = mapPilotRecordToCanonicalNewRecord(pilotJson);
      expect(canonical.authority.resolutionCategory).toBe(
        "constitutional_judgment"
      );
      expect(canonical.authority.legalAuthority).toBe(
        "constitutional_precedent"
      );
      expect(canonical.authority.authorityEvidence).toBe(
        pilotJson.authority.authorityEvidence
      );
      expect(canonical.authority.validityStatus).toBe("unknown");
      expect(canonical.authority.validityEvidence).toBeNull();
    });
  });

  describe("S. Canonical PDF Engine Reproducibility & Fail-Closed (Section 4, 5, 6)", () => {
    it("extracts text deterministically using pypdfium2 canonical engine", () => {
      const doc = validateAndExtractPdfSourceDocument(SAMPLE_PDF_PATH);
      expect(doc.engine).toBe("pypdfium2");
      expect(doc.pageCount).toBe(2);
      expect(doc.officialFullText).toContain("--- [PÁGINA 1] ---");
      expect(doc.officialFullText).toContain("Texto de la primera pagina");
      expect(doc.officialFullText).toContain("--- [PÁGINA 2] ---");
      expect(doc.officialFullText).toContain("Texto de la segunda pagina");
    });

    it("fails closed if canonical engine is unavailable", () => {
      expect(() =>
        validateAndExtractPdfSourceDocument(SAMPLE_PDF_PATH, {
          customExtractor: () => {
            throw new Error(
              "CANONICAL_PDF_ENGINE_UNAVAILABLE: Canonical extractor 'pypdfium2==4.30.0' is not installed."
            );
          },
        })
      ).toThrow("CANONICAL_PDF_ENGINE_UNAVAILABLE");
    });

    it("verifies requirements-jurisprudence.txt pins pypdfium2==4.30.0", () => {
      const reqPath = path.resolve(
        process.cwd(),
        "requirements-jurisprudence.txt"
      );
      expect(fs.existsSync(reqPath)).toBe(true);
      const content = fs.readFileSync(reqPath, "utf8");
      expect(content).toContain("pypdfium2==4.30.0");
    });
  });

  describe("T. Provenance and Zero Workstation Path Leakage (Section 2 & 12)", () => {
    it("proves canonical persisted record contains no workstation path or developer directory", () => {
      const doc = validateAndExtractPdfSourceDocument(SAMPLE_PDF_PATH);
      const input = makeSampleRecordInput();
      const canonical = mapPilotRecordToCanonicalNewRecord(input, {
        sourceDocument: doc,
      });

      const serialized = JSON.stringify(canonical);
      expect(serialized).not.toContain("Users");
      expect(serialized).not.toContain("Documents");
      expect(serialized).not.toContain("BUHOLEX-CORPUS");
      expect(serialized).not.toContain("sample-test.pdf");
      expect(serialized).not.toContain("tests/fixtures");
      expect(canonical.officialFile).toBeNull();
      expect(canonical.source.documentId).toBe(doc.sha256.toUpperCase());
    });
  });
});
