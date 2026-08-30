import { test, expect, describe, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createJurisprudencePublicationExecutionRuntime } from "@/lib/jurisprudence/jurisprudence-publication-execution-runtime";
import { PostgresJurisprudencePublicationSourceReader } from "@/lib/jurisprudence/postgres-jurisprudence-publication-source-reader";
import { PostgresJurisprudencePublicationExecutionRepository } from "@/lib/jurisprudence/postgres-jurisprudence-publication-execution-repository";
import { PostgresJurisprudencePublicProjectionRepository } from "@/lib/jurisprudence/postgres-jurisprudence-public-projection-repository";
import { PostgresJurisprudencePublicationTransactionCoordinator } from "@/lib/jurisprudence/postgres-jurisprudence-publication-transaction-coordinator";
import { PostgresJurisprudenceEditorialCaseRepository } from "@/lib/postgres-jurisprudence-editorial-case-repository";
import { PostgresJurisprudencePublicationDossierRepository } from "@/lib/postgres-jurisprudence-publication-dossier-repository";
import { PostgresJurisprudencePublicationAuthorizationRepository } from "@/lib/postgres-jurisprudence-publication-authorization-repository";
import { createJurisprudencePublicationExecutionService } from "@/lib/jurisprudence-publication-execution-service";
import { createJurisprudenceEditorialWorkflow } from "@/lib/jurisprudence-editorial-workflow";
import { createJurisprudencePublicationGovernanceService } from "@/lib/jurisprudence-publication-governance-service";
import { createJurisprudencePublicationAuthorizationService } from "@/lib/jurisprudence-publication-authorization-service";
import { getJurisprudenceInternalWriteDatabase } from "@/database/client";
import { getJurisprudenceInternalReadDatabase } from "@/database/jurisprudence-internal-read-database";

const mockWriteDb = { write: true } as const;
const mockReadDb = { read: true } as const;

vi.mock("@/database/client", () => ({
  getJurisprudenceInternalWriteDatabase: vi.fn(() => mockWriteDb),
}));

vi.mock("@/database/jurisprudence-internal-read-database", () => ({
  getJurisprudenceInternalReadDatabase: vi.fn(() => mockReadDb),
}));

const mockService = { close: vi.fn() };
const mockEditorialWorkflow = { close: vi.fn() };
const mockGovernance = { close: vi.fn() };
const mockAuthorization = { close: vi.fn() };

vi.mock("@/lib/jurisprudence-publication-execution-service", () => ({
  createJurisprudencePublicationExecutionService: vi.fn(() => mockService),
}));
vi.mock("@/lib/jurisprudence-editorial-workflow", () => ({
  createJurisprudenceEditorialWorkflow: vi.fn(() => mockEditorialWorkflow),
}));
vi.mock("@/lib/jurisprudence-publication-governance-service", () => ({
  createJurisprudencePublicationGovernanceService: vi.fn(() => mockGovernance),
}));
vi.mock("@/lib/jurisprudence-publication-authorization-service", () => ({
  createJurisprudencePublicationAuthorizationService: vi.fn(() => mockAuthorization),
}));

vi.mock("@/lib/jurisprudence/postgres-jurisprudence-publication-source-reader");
vi.mock("@/lib/jurisprudence/postgres-jurisprudence-publication-execution-repository");
vi.mock("@/lib/jurisprudence/postgres-jurisprudence-public-projection-repository");
vi.mock("@/lib/jurisprudence/postgres-jurisprudence-publication-transaction-coordinator");

describe("B6: Jurisprudence Publication Execution Runtime Composition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Static Import Barrier", () => {
    test("does not import InMemory or Sqlite adapters", () => {
      const sourceCode = readFileSync(path.resolve(process.cwd(), "lib/jurisprudence/jurisprudence-publication-execution-runtime.ts"), "utf-8");

      expect(sourceCode).not.toMatch(/in-memory-jurisprudence/);
      expect(sourceCode).not.toMatch(/sqlite-jurisprudence/);
      expect(sourceCode).not.toMatch(/InMemory/);
      expect(sourceCode).not.toMatch(/Sqlite/);
      expect(sourceCode).not.toMatch(/app\/api/);
      expect(sourceCode).not.toMatch(/components/);
      expect(sourceCode).not.toMatch(/tests/);

      expect(sourceCode).toMatch(/PostgresJurisprudencePublicationSourceReader/);
      expect(sourceCode).toMatch(/PostgresJurisprudencePublicationExecutionRepository/);
      expect(sourceCode).toMatch(/PostgresJurisprudencePublicProjectionRepository/);
      expect(sourceCode).toMatch(/PostgresJurisprudencePublicationTransactionCoordinator/);
      expect(sourceCode).toMatch(/PostgresJurisprudenceEditorialCaseRepository/);
      expect(sourceCode).toMatch(/PostgresJurisprudencePublicationDossierRepository/);
      expect(sourceCode).toMatch(/PostgresJurisprudencePublicationAuthorizationRepository/);
      expect(sourceCode).toMatch(/PostgresJurisprudenceRepository/);
    });
  });

  describe("Service Construction and Wiring", () => {
    test("factory composes dependencies correctly", () => {
      const runtime = createJurisprudencePublicationExecutionRuntime();

      expect(getJurisprudenceInternalWriteDatabase).toHaveBeenCalledTimes(1);
      expect(getJurisprudenceInternalReadDatabase).toHaveBeenCalledTimes(1);

      // Verify db is passed
      expect(PostgresJurisprudencePublicationSourceReader).toHaveBeenCalledWith(mockReadDb);
      expect(PostgresJurisprudencePublicationExecutionRepository).toHaveBeenCalledWith(mockWriteDb);
      expect(PostgresJurisprudencePublicationTransactionCoordinator).toHaveBeenCalledWith(mockWriteDb);

      const edSpy = vi.mocked(createJurisprudenceEditorialWorkflow);
      expect(edSpy).toHaveBeenCalledTimes(1);
      const edArgs = edSpy.mock.calls[0]![0];
      expect(edArgs.api).toBeDefined();
      expect(edArgs.repository).toBeInstanceOf(PostgresJurisprudenceEditorialCaseRepository);
      expect(edArgs.now).toBeInstanceOf(Function);
      expect(edArgs.generateId).toBeInstanceOf(Function);
      expect(edArgs.logger).toBeDefined();

      const govSpy = vi.mocked(createJurisprudencePublicationGovernanceService);
      expect(govSpy).toHaveBeenCalledTimes(1);
      const govArgs = govSpy.mock.calls[0]![0];
      expect(govArgs.api).toBe(edArgs.api);
      expect(govArgs.editorialWorkflow).toBe(mockEditorialWorkflow);
      expect(govArgs.repository).toBeInstanceOf(PostgresJurisprudencePublicationDossierRepository);
      expect(govArgs.now).toBeInstanceOf(Function);
      expect(govArgs.generateId).toBeInstanceOf(Function);
      expect(govArgs.logger).toBeDefined();

      const authSpy = vi.mocked(createJurisprudencePublicationAuthorizationService);
      expect(authSpy).toHaveBeenCalledTimes(1);
      const authArgs = authSpy.mock.calls[0]![0];
      expect(authArgs.api).toBe(edArgs.api);
      expect(authArgs.editorialWorkflow).toBe(mockEditorialWorkflow);
      expect(authArgs.publicationGovernance).toBe(mockGovernance);
      expect(authArgs.repository).toBeInstanceOf(PostgresJurisprudencePublicationAuthorizationRepository);
      expect(authArgs.now).toBeInstanceOf(Function);
      expect(authArgs.generateId).toBeInstanceOf(Function);
      expect(authArgs.logger).toBeDefined();

      const execSpy = vi.mocked(createJurisprudencePublicationExecutionService);
      expect(execSpy).toHaveBeenCalledTimes(1);
      const execArgs = execSpy.mock.calls[0]![0];

      expect(execArgs.sourceReader).toBeInstanceOf(PostgresJurisprudencePublicationSourceReader);
      expect(execArgs.editorialWorkflow).toBe(mockEditorialWorkflow);
      expect(execArgs.publicationGovernance).toBe(mockGovernance);
      expect(execArgs.publicationAuthorization).toBe(mockAuthorization);
      expect(execArgs.executionRepository).toBeInstanceOf(PostgresJurisprudencePublicationExecutionRepository);
      expect(execArgs.projectionRepository).toBeInstanceOf(PostgresJurisprudencePublicProjectionRepository);
      expect(execArgs.transactionCoordinator).toBeInstanceOf(PostgresJurisprudencePublicationTransactionCoordinator);
      expect(execArgs.now).toBeInstanceOf(Function);
      expect(execArgs.generateId).toBeInstanceOf(Function);
      expect(execArgs.logger).toBeDefined();
    });

    test("actual execution service factory returns DefaultJurisprudencePublicationExecutionService", async () => {
      const execSpy = vi.mocked(createJurisprudencePublicationExecutionService);
      createJurisprudencePublicationExecutionRuntime();
      const capturedDeps = execSpy.mock.calls[execSpy.mock.calls.length - 1]![0];

      const actualModule = await vi.importActual<typeof import("@/lib/jurisprudence-publication-execution-service")>("@/lib/jurisprudence-publication-execution-service");

      const realService = actualModule.createJurisprudencePublicationExecutionService(capturedDeps);
      expect(realService).toBeInstanceOf(actualModule.DefaultJurisprudencePublicationExecutionService);
    });
  });

  describe("Lifecycle", () => {
    test("closes gracefully, handles idempotency, and respects ownership", async () => {
      const runtime = createJurisprudencePublicationExecutionRuntime();

      await runtime.close();

      expect(mockService.close).toHaveBeenCalledTimes(1);
      expect(mockAuthorization.close).toHaveBeenCalledTimes(1);
      expect(mockGovernance.close).toHaveBeenCalledTimes(1);
      expect(mockEditorialWorkflow.close).not.toHaveBeenCalled();

      // Second close
      await runtime.close();

      expect(mockService.close).toHaveBeenCalledTimes(1);
      expect(mockAuthorization.close).toHaveBeenCalledTimes(1);
      expect(mockGovernance.close).toHaveBeenCalledTimes(1);
      expect(mockEditorialWorkflow.close).not.toHaveBeenCalled();
    });
  });
});
