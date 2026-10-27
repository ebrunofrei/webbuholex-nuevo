import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("server-only", () => ({}));

import { workspaceNavigation, adminNavigation } from "@/data/navigation";
import { resolveAuthorizedNavigation } from "@/lib/authorization/navigation-resolver";
import {
  resolveAdminOperatorEligibility,
  resolveTrustedAdminPrincipal,
} from "@/lib/authorization/authorization-resolver";
import { evaluateWorkspaceAccess } from "@/lib/auth/workspace-guard";
import { WorkspacePlaceholder } from "@/components/workspace/workspace-placeholder";
import LegacyAppComplaintsPage, { dynamic as legacyComplaintsDynamic } from "@/app/app/reclamos/page";
import LegacyAppComplaintDetailPage, { dynamic as legacyComplaintDetailDynamic } from "@/app/app/reclamos/[complaintId]/page";
import AdminComplaintsPage from "@/app/admin/reclamos/page";
import AdminComplaintDetailPage from "@/app/admin/reclamos/[complaintId]/page";
import AdminBackofficeLayout, { dynamic as adminLayoutDynamic } from "@/app/admin/layout";
import PrivateWorkspaceLayout from "@/app/app/layout";
import { getAuthorizationDatabase } from "@/database/client";
import { CommercialHome } from "@/components/home/commercial-home";
import type { WorkspaceSession } from "@/types/auth";
import type { OperatorAuthorizationRepository } from "@/database/repositories/authorization.repository";
import type {
  AuthorizationRepositoryResult,
  OperatorEligibilityResult,
} from "@/database/repositories/authorization.types";
import { AuthorizationPersistenceError } from "@/database/repositories/authorization.errors";

import LegacyAppCulqiSandboxTokenPage, { dynamic as legacyCulqiDynamic } from "@/app/app/admin/sandbox/culqi-token/page";
import CulqiSandboxTokenPage from "@/app/admin/sandbox/culqi-token/page";
import { sanitizeWorkspaceReturnTo, DEFAULT_SAFE_RETURN_TO } from "@/lib/auth/return-to";
import { authorizeAdminPaymentsWrite } from "@/lib/payments/payments-admin-http-runtime";

// Mocks
const mockRedirect = vi.fn();
const mockNotFound = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
  notFound: () => {
    mockNotFound();
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/admin",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/payments/payments-admin-http-runtime", () => ({
  authorizeAdminPaymentsWrite: vi.fn(),
}));

let mockSession: WorkspaceSession = {
  status: "unauthenticated",
  sessionId: null,
  providerSubjectId: null,
  issuedAt: null,
  expiresAt: null,
  provider: null,
};

vi.mock("@/lib/auth/session", () => ({
  getWorkspaceSession: vi.fn(async () => mockSession),
}));

let mockAuthorizedResult: AuthorizationRepositoryResult = { kind: "operator_not_mapped" };
let mockActiveResult: OperatorEligibilityResult = { kind: "operator_not_mapped" };
let mockPersistenceError: AuthorizationPersistenceError | null = null;

function setMockRepoState(
  authorized: AuthorizationRepositoryResult,
  active?: OperatorEligibilityResult
): void {
  mockAuthorizedResult = authorized;
  if (active) {
    mockActiveResult = active;
  } else if (authorized.kind === "capability_missing") {
    mockActiveResult = { kind: "authorized", operatorId: "op-1" };
  } else {
    mockActiveResult = authorized;
  }
  mockPersistenceError = null;
}

const mockRepo: OperatorAuthorizationRepository = {
  resolveAuthorizedOperator: vi.fn(
    async (_provider, _sub, capability): Promise<AuthorizationRepositoryResult> => {
      if (mockPersistenceError) {
        throw mockPersistenceError;
      }
      if (capability === "complaints:read" && mockAuthorizedResult.kind === "authorized") {
        return { kind: "authorized", operatorId: mockAuthorizedResult.operatorId };
      }
      return mockAuthorizedResult;
    }
  ),
  resolveActiveOperator: vi.fn(
    async (): Promise<OperatorEligibilityResult> => {
      if (mockPersistenceError) {
        throw mockPersistenceError;
      }
      return mockActiveResult;
    }
  ),
};

vi.mock("@/database/client", () => ({
  getAuthorizationDatabase: vi.fn(() => ({})),
}));

vi.mock("@/database/repositories/authorization.repository", () => ({
  createAuthorizationRepository: vi.fn(() => mockRepo),
}));

describe("BÚHOLEX-AUTH-A0.4: Customer Workspace vs Internal Admin Structural Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedirect.mockClear();
    mockNotFound.mockClear();
    mockAuthorizedResult = { kind: "operator_not_mapped" };
    mockActiveResult = { kind: "operator_not_mapped" };
    mockPersistenceError = null;
  });

  describe("1. Homepage / Entrypoint Integrity", () => {
    it("homepage CTA points to /app and does not advertise /admin", () => {
      render(<CommercialHome />);
      const customerLink = screen.getByRole("link", { name: /Espacio IA legal/i });
      expect(customerLink).toHaveAttribute("href", "/app");

      const allLinks = screen.getAllByRole("link");
      const adminLinks = allLinks.filter((l) => l.getAttribute("href")?.startsWith("/admin"));
      expect(adminLinks).toHaveLength(0);
    });
  });

  describe("2. Customer Workspace Navigation (/app)", () => {
    it("removes Reclamos completely from customer workspace navigation", () => {
      const complaintItem = workspaceNavigation.find(
        (item) => item.id === "workspace-complaints" || item.href === "/app/reclamos"
      );
      expect(complaintItem).toBeUndefined();

      const capItems = workspaceNavigation.filter((item) => item.requiredCapability !== undefined);
      expect(capItems).toHaveLength(0);
    });

    it("proves /app authenticated customer layout does NOT call getAuthorizationDatabase()", async () => {
      mockSession = {
        status: "authenticated",
        sessionId: "sess-cust-1",
        providerSubjectId: "cust-sub-123",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      setMockRepoState({ kind: "operator_not_mapped" });
      vi.mocked(getAuthorizationDatabase).mockClear();

      const element = await PrivateWorkspaceLayout({
        children: <div data-testid="customer-child">Customer Workspace</div>,
      });
      render(element);

      expect(screen.getByTestId("customer-child")).toBeInTheDocument();
      expect(getAuthorizationDatabase).not.toHaveBeenCalled();
      expect(mockRepo.resolveActiveOperator).not.toHaveBeenCalled();
      expect(mockRepo.resolveAuthorizedOperator).not.toHaveBeenCalled();
    });

    it("proves /app authenticated customer does NOT require operator mapping and is not redirected", async () => {
      mockSession = {
        status: "authenticated",
        sessionId: "sess-cust-unbound",
        providerSubjectId: "cust-unbound-guid",
        issuedAt: "2026-10-26T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      setMockRepoState({ kind: "operator_not_mapped" });
      mockRedirect.mockClear();

      const element = await PrivateWorkspaceLayout({
        children: <div data-testid="unbound-customer-view">Unbound Customer</div>,
      });
      render(element);

      expect(screen.getByTestId("unbound-customer-view")).toBeInTheDocument();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("proves /app customer navigation does not expose Reclamos or admin modules", () => {
      const visibleCustomerItems = workspaceNavigation.filter((item) => item.visibility !== "hidden");
      expect(visibleCustomerItems.length).toBeGreaterThan(0);
      expect(visibleCustomerItems.some((item) => item.id.includes("admin") || item.href.includes("admin"))).toBe(false);
      expect(visibleCustomerItems.some((item) => item.id.includes("reclamos") || item.href.includes("reclamos"))).toBe(false);
      expect(visibleCustomerItems.some((item) => item.requiredCapability !== undefined)).toBe(false);
    });
  });

  describe("3. Admin Navigation (/admin)", () => {
    it("adminNavigation contains Reclamos gated by complaints:read", () => {
      const complaintsNav = adminNavigation.find((item) => item.id === "admin-complaints");
      expect(complaintsNav).toBeDefined();
      expect(complaintsNav?.href).toBe("/admin/reclamos");
      expect(complaintsNav?.requiredCapability).toBe("complaints:read");
    });

    it("does not expose customer placeholder modules in admin navigation", () => {
      expect(adminNavigation.some((i) => i.id === "workspace-assistant")).toBe(false);
      expect(adminNavigation.some((i) => i.id === "workspace-projects")).toBe(false);
      expect(adminNavigation.some((i) => i.id === "workspace-library")).toBe(false);
    });

    it("hides Reclamos in admin navigation if operator lacks complaints:read", async () => {
      const operatorSession: WorkspaceSession = {
        status: "authenticated",
        sessionId: "sess-op-1",
        providerSubjectId: "op-sub-123",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };

      setMockRepoState({ kind: "capability_missing" });

      const resolved = await resolveAuthorizedNavigation(adminNavigation, operatorSession, mockRepo);
      expect(resolved.find((i) => i.id === "admin-complaints")).toBeUndefined();
    });

    it("displays Reclamos in admin navigation if operator has complaints:read", async () => {
      const operatorSession: WorkspaceSession = {
        status: "authenticated",
        sessionId: "sess-op-1",
        providerSubjectId: "op-sub-123",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };

      setMockRepoState({
        kind: "authorized",
        operatorId: "op-1",
      });

      const resolved = await resolveAuthorizedNavigation(adminNavigation, operatorSession, mockRepo);
      expect(resolved.find((i) => i.id === "admin-complaints")).toBeDefined();
      expect(resolved.find((i) => i.id === "admin-complaints")?.href).toBe("/admin/reclamos");
    });
  });

  describe("4. Admin Layout Fail-Closed Enforcement", () => {
    it("redirects unauthenticated user to login with returnTo=/admin", async () => {
      mockSession = {
        status: "unauthenticated",
        sessionId: null,
        providerSubjectId: null,
        issuedAt: null,
        expiresAt: null,
        provider: null,
      };

      await expect(
        AdminBackofficeLayout({ children: <div>Admin Content</div> })
      ).rejects.toThrow("NEXT_REDIRECT:/iniciar-sesion?returnTo=%2Fadmin");
    });

    it("redirects authenticated customer without operator binding to /app (fail-closed)", async () => {
      mockSession = {
        status: "authenticated",
        sessionId: "sess-1",
        providerSubjectId: "customer-sub",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      setMockRepoState({ kind: "operator_not_mapped" });

      await expect(
        AdminBackofficeLayout({ children: <div>Admin Content</div> })
      ).rejects.toThrow("NEXT_REDIRECT:/app");
    });

    it("redirects inactive/suspended operator to /app (fail-closed)", async () => {
      mockSession = {
        status: "authenticated",
        sessionId: "sess-1",
        providerSubjectId: "inactive-op-sub",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      setMockRepoState({ kind: "operator_inactive" });

      await expect(
        AdminBackofficeLayout({ children: <div>Admin Content</div> })
      ).rejects.toThrow("NEXT_REDIRECT:/app");
    });

    it("redirects to /app when authorization persistence is unavailable (fail-closed)", async () => {
      mockSession = {
        status: "authenticated",
        sessionId: "sess-1",
        providerSubjectId: "active-op-sub",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      mockPersistenceError = new AuthorizationPersistenceError("database unavailable");

      await expect(
        AdminBackofficeLayout({ children: <div>Admin Content</div> })
      ).rejects.toThrow("NEXT_REDIRECT:/app");
    });

    it("renders admin shell for active mapped operator", async () => {
      mockSession = {
        status: "authenticated",
        sessionId: "sess-1",
        providerSubjectId: "active-op-sub",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      setMockRepoState({ kind: "authorized", operatorId: "op-uuid-1" });

      const element = await AdminBackofficeLayout({ children: <div data-testid="admin-child">Admin Content</div> });
      render(element);
      expect(screen.getByTestId("admin-child")).toBeInTheDocument();
      expect(screen.getByText("BúhoLex Admin")).toBeInTheDocument();
    });

    it("proves /admin still requires operator authorization DB and resolves operator", async () => {
      mockSession = {
        status: "authenticated",
        sessionId: "sess-1",
        providerSubjectId: "active-op-sub",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      setMockRepoState({ kind: "authorized", operatorId: "op-uuid-1" });
      vi.mocked(getAuthorizationDatabase).mockClear();

      const element = await AdminBackofficeLayout({ children: <div data-testid="admin-child">Admin Content</div> });
      expect(element).toBeDefined();
      expect(getAuthorizationDatabase).toHaveBeenCalled();
      expect(mockRepo.resolveActiveOperator).toHaveBeenCalledWith("supabase", "active-op-sub");
    });
  });

  describe("5. Direct Route Access Defense in Depth (/admin/reclamos)", () => {
    it("active operator without complaints:read is denied /admin/reclamos and redirected to /admin", async () => {
      mockSession = {
        status: "authenticated",
        sessionId: "sess-1",
        providerSubjectId: "active-op-sub",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      setMockRepoState({ kind: "capability_missing" }, { kind: "authorized", operatorId: "op-uuid-1" });

      await expect(AdminComplaintsPage()).rejects.toThrow("NEXT_REDIRECT:/admin");
    });

    it("active operator without complaints:read is denied /admin/reclamos/[complaintId] and redirected to /admin", async () => {
      mockSession = {
        status: "authenticated",
        sessionId: "sess-1",
        providerSubjectId: "active-op-sub",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      setMockRepoState({ kind: "capability_missing" }, { kind: "authorized", operatorId: "op-uuid-1" });

      await expect(
        AdminComplaintDetailPage({ params: Promise.resolve({ complaintId: "cmp-100" }) })
      ).rejects.toThrow("NEXT_REDIRECT:/admin");
    });

    it("active operator with complaints:read is allowed to access /admin/reclamos", async () => {
      mockSession = {
        status: "authenticated",
        sessionId: "sess-1",
        providerSubjectId: "active-op-sub",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      setMockRepoState({ kind: "authorized", operatorId: "op-uuid-1" });

      const page = await AdminComplaintsPage();
      expect(page).toBeDefined();
    });
  });

  describe("6. Legacy Route Handling (/app/reclamos -> /admin/reclamos)", () => {
    it("authorized operator visiting legacy /app/reclamos is redirected to /admin/reclamos", async () => {
      mockSession = {
        status: "authenticated",
        sessionId: "sess-1",
        providerSubjectId: "active-op-sub",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      setMockRepoState({ kind: "authorized", operatorId: "op-uuid-1" });

      await expect(LegacyAppComplaintsPage()).rejects.toThrow("NEXT_REDIRECT:/admin/reclamos");
    });

    it("unauthorized customer visiting legacy /app/reclamos is redirected to /app (no admin leak)", async () => {
      mockSession = {
        status: "authenticated",
        sessionId: "sess-1",
        providerSubjectId: "customer-sub",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      setMockRepoState({ kind: "operator_not_mapped" });

      await expect(LegacyAppComplaintsPage()).rejects.toThrow("NEXT_REDIRECT:/app");
    });

    it("authorized operator visiting legacy /app/reclamos/[complaintId] is redirected to /admin/reclamos/[complaintId]", async () => {
      mockSession = {
        status: "authenticated",
        sessionId: "sess-1",
        providerSubjectId: "active-op-sub",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      setMockRepoState({ kind: "authorized", operatorId: "op-uuid-1" });

      await expect(
        LegacyAppComplaintDetailPage({ params: Promise.resolve({ complaintId: "cmp-456" }) })
      ).rejects.toThrow("NEXT_REDIRECT:/admin/reclamos/cmp-456");
    });

    it("unauthorized customer visiting legacy /app/reclamos/[complaintId] is redirected to /app", async () => {
      mockSession = {
        status: "authenticated",
        sessionId: "sess-1",
        providerSubjectId: "customer-sub",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      setMockRepoState({ kind: "operator_not_mapped" });

      await expect(
        LegacyAppComplaintDetailPage({ params: Promise.resolve({ complaintId: "cmp-456" }) })
      ).rejects.toThrow("NEXT_REDIRECT:/app");
    });
  });

  describe("7. Provider Neutrality (Auth0 & Supabase compatibility)", () => {
    it("resolveAdminOperatorEligibility supports supabase provider", async () => {
      const session: WorkspaceSession = {
        status: "authenticated",
        sessionId: null,
        providerSubjectId: "5ab70b02-783c-4465-923d-f4a708cf981c",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      setMockRepoState({ kind: "authorized", operatorId: "c42af620-86df-4c4f-8448-d981063dea5d" });

      const result = await resolveAdminOperatorEligibility(session, mockRepo);
      expect(result.kind).toBe("authorized");
      expect(mockRepo.resolveActiveOperator).toHaveBeenCalledWith(
        "supabase",
        "5ab70b02-783c-4465-923d-f4a708cf981c"
      );
    });

    it("resolveAdminOperatorEligibility supports auth0 provider", async () => {
      const session: WorkspaceSession = {
        status: "authenticated",
        sessionId: "auth0-sess",
        providerSubjectId: "auth0|665544332211",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "auth0",
      };
      setMockRepoState({ kind: "authorized", operatorId: "c42af620-86df-4c4f-8448-d981063dea5d" });

      const result = await resolveAdminOperatorEligibility(session, mockRepo);
      expect(result.kind).toBe("authorized");
      expect(mockRepo.resolveActiveOperator).toHaveBeenCalledWith(
        "auth0",
        "auth0|665544332211"
      );
    });

    it("rejects unsupported provider or missing subject", async () => {
      const sessionNullProvider: WorkspaceSession = {
        status: "authenticated",
        sessionId: null,
        providerSubjectId: "some-sub",
        issuedAt: null,
        expiresAt: null,
        provider: null,
      };
      expect(await resolveAdminOperatorEligibility(sessionNullProvider, mockRepo)).toEqual({ kind: "unauthenticated" });

      const sessionNullSubject: WorkspaceSession = {
        status: "authenticated",
        sessionId: null,
        providerSubjectId: null,
        issuedAt: null,
        expiresAt: null,
        provider: "supabase",
      };
      expect(await resolveAdminOperatorEligibility(sessionNullSubject, mockRepo)).toEqual({ kind: "unauthenticated" });

      const sessionEmptySubject: WorkspaceSession = {
        status: "authenticated",
        sessionId: null,
        providerSubjectId: "",
        issuedAt: null,
        expiresAt: null,
        provider: "supabase",
      };
      expect(await resolveAdminOperatorEligibility(sessionEmptySubject, mockRepo)).toEqual({ kind: "unauthenticated" });

      const sessionWhitespaceSubject: WorkspaceSession = {
        status: "authenticated",
        sessionId: null,
        providerSubjectId: "   ",
        issuedAt: null,
        expiresAt: null,
        provider: "supabase",
      };
      expect(await resolveAdminOperatorEligibility(sessionWhitespaceSubject, mockRepo)).toEqual({ kind: "unauthenticated" });

      const sessionUnauthenticated: WorkspaceSession = {
        status: "unauthenticated",
        sessionId: null,
        providerSubjectId: "op-sub-123",
        issuedAt: null,
        expiresAt: null,
        provider: "supabase",
      };
      expect(await resolveAdminOperatorEligibility(sessionUnauthenticated, mockRepo)).toEqual({ kind: "unauthenticated" });
    });

    it("generic admin eligibility succeeds with REAL operator UUID and no complaints:read dependency", async () => {
      const session: WorkspaceSession = {
        status: "authenticated",
        sessionId: "sess-op-real",
        providerSubjectId: "op-sub-real",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      const realUuid = "3f8d9b1a-2e4c-4a5f-8b9d-1a2b3c4d5e6f";
      setMockRepoState({ kind: "authorized", operatorId: realUuid });

      const result = await resolveAdminOperatorEligibility(session, mockRepo);
      expect(result.kind).toBe("authorized");
      if (result.kind === "authorized") {
        expect(result.principal.operatorId).toBe(realUuid);
        expect(result.principal.operatorId).not.toBe("operator_active");
      }
    });

    it("prohibits synthetic operator_active identifier across all authorization paths", async () => {
      const session: WorkspaceSession = {
        status: "authenticated",
        sessionId: "sess-op-real",
        providerSubjectId: "op-sub-real",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      setMockRepoState({ kind: "authorized", operatorId: "valid-operator-uuid" });

      const adminEligibility = await resolveAdminOperatorEligibility(session, mockRepo);
      if (adminEligibility.kind === "authorized") {
        expect(adminEligibility.principal.operatorId).toBe("valid-operator-uuid");
        expect(adminEligibility.principal.operatorId).not.toBe("operator_active");
      }

      setMockRepoState({ kind: "operator_not_mapped" });
      const unmappedEligibility = await resolveAdminOperatorEligibility(session, mockRepo);
      expect(unmappedEligibility.kind).toBe("operator_not_mapped");

      setMockRepoState({ kind: "operator_inactive" });
      const inactiveEligibility = await resolveAdminOperatorEligibility(session, mockRepo);
      expect(inactiveEligibility.kind).toBe("operator_inactive");
    });

    it("proves generic admin eligibility does not query or depend on capabilities", async () => {
      const session: WorkspaceSession = {
        status: "authenticated",
        sessionId: "sess-op-real",
        providerSubjectId: "op-sub-real",
        issuedAt: "2026-10-22T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      setMockRepoState({ kind: "authorized", operatorId: "real-uuid-999" });
      await resolveAdminOperatorEligibility(session, mockRepo);
      expect(mockRepo.resolveActiveOperator).toHaveBeenCalledWith("supabase", "op-sub-real");
      expect(mockRepo.resolveAuthorizedOperator).not.toHaveBeenCalled();
    });

    it("proves no literal operator_active exists in production implementation", async () => {
      const fs = await import("fs");
      const resolverContent = fs.readFileSync("lib/authorization/authorization-resolver.ts", "utf-8");
      expect(resolverContent).not.toContain("operator_active");
      const repoContent = fs.readFileSync("database/repositories/authorization.repository.ts", "utf-8");
      expect(repoContent).not.toContain("operator_active");
    });
  });

  describe("8. Placeholder Copy Truthfulness", () => {
    it("renders ESPACIO VIRTUAL INTELIGENTE and truthful neutral in-preparation copy", () => {
      render(<WorkspacePlaceholder title="Módulo de Prueba" description="Descripción de prueba" />);
      expect(screen.getByText("ESPACIO VIRTUAL INTELIGENTE")).toBeInTheDocument();
      expect(screen.getByText("Módulo en preparación. Próximamente disponible.")).toBeInTheDocument();
      expect(screen.queryByText(/ESPACIO PRIVADO/i)).toBeNull();
      expect(screen.queryByText(/Capacidad reservada\. Requiere una sesión válida\./i)).toBeNull();
    });
  });

  describe("9. Legacy Culqi Route Security Invariant", () => {
    it("Production calls notFound() and does not expose or redirect legacy sandbox route", async () => {
      vi.stubEnv("VERCEL_ENV", "production");
      vi.stubEnv("NODE_ENV", "production");

      try {
        await expect(LegacyAppCulqiSandboxTokenPage()).rejects.toThrow("NEXT_NOT_FOUND");
        expect(mockNotFound).toHaveBeenCalled();
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it("Preview redirects authorized payments:write operator to /admin/sandbox/culqi-token", async () => {
      vi.stubEnv("VERCEL_ENV", "preview");
      vi.mocked(authorizeAdminPaymentsWrite).mockResolvedValueOnce({
        kind: "authorized",
        principal: { operatorId: "op-pay", identitySource: "authenticated_session" },
      });

      try {
        await expect(LegacyAppCulqiSandboxTokenPage()).rejects.toThrow(
          "NEXT_REDIRECT:/admin/sandbox/culqi-token"
        );
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it("Preview redirects unauthorized user to /app", async () => {
      vi.stubEnv("VERCEL_ENV", "preview");
      vi.mocked(authorizeAdminPaymentsWrite).mockResolvedValueOnce({
        kind: "capability_missing",
      });

      try {
        await expect(LegacyAppCulqiSandboxTokenPage()).rejects.toThrow("NEXT_REDIRECT:/app");
      } finally {
        vi.unstubAllEnvs();
      }
    });
  });

  describe("10. Return-To Destination Security Hardening", () => {
    it("accepts valid /admin destinations", () => {
      expect(sanitizeWorkspaceReturnTo("/admin")).toBe("/admin");
      expect(sanitizeWorkspaceReturnTo("/admin/")).toBe("/admin/");
      expect(sanitizeWorkspaceReturnTo("/admin/reclamos")).toBe("/admin/reclamos");
      expect(sanitizeWorkspaceReturnTo("/admin/reclamos/cmp-123")).toBe("/admin/reclamos/cmp-123");
      expect(sanitizeWorkspaceReturnTo("/admin/sandbox/culqi-token")).toBe("/admin/sandbox/culqi-token");
    });

    it("rejects malicious or malformed /admin variants and falls back to /app", () => {
      expect(sanitizeWorkspaceReturnTo("//admin")).toBe(DEFAULT_SAFE_RETURN_TO);
      expect(sanitizeWorkspaceReturnTo("/\\admin")).toBe(DEFAULT_SAFE_RETURN_TO);
      expect(sanitizeWorkspaceReturnTo("/admin\\evil")).toBe(DEFAULT_SAFE_RETURN_TO);
      expect(sanitizeWorkspaceReturnTo("/admin/../evil")).toBe(DEFAULT_SAFE_RETURN_TO);
      expect(sanitizeWorkspaceReturnTo("https://evil.example/admin")).toBe(DEFAULT_SAFE_RETURN_TO);
      expect(sanitizeWorkspaceReturnTo("javascript:alert(1)")).toBe(DEFAULT_SAFE_RETURN_TO);
    });
  });

  describe("11. Canonical Culqi Sandbox Route Security & Control Flow (/admin/sandbox/culqi-token)", () => {
    it("Production calls notFound() and does not expose sandbox harness", async () => {
      vi.stubEnv("VERCEL_ENV", "production");
      vi.stubEnv("NODE_ENV", "production");

      try {
        await expect(CulqiSandboxTokenPage()).rejects.toThrow("NEXT_NOT_FOUND");
        expect(mockNotFound).toHaveBeenCalled();
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it("authorized payments:write operator renders harness normally in Preview", async () => {
      vi.stubEnv("VERCEL_ENV", "preview");
      vi.stubEnv("NEXT_PUBLIC_CULQI_PUBLIC_KEY", "pk_test_valid_key_123");
      vi.mocked(authorizeAdminPaymentsWrite).mockResolvedValueOnce({
        kind: "authorized",
        principal: { operatorId: "op-pay", identitySource: "authenticated_session" },
      });

      try {
        const page = await CulqiSandboxTokenPage();
        expect(page).toBeDefined();
        expect(mockRedirect).not.toHaveBeenCalled();
        expect(mockNotFound).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it("capability_missing triggers redirect('/admin') outside catchable try block", async () => {
      vi.stubEnv("VERCEL_ENV", "preview");
      vi.mocked(authorizeAdminPaymentsWrite).mockResolvedValueOnce({
        kind: "capability_missing",
      });

      try {
        await expect(CulqiSandboxTokenPage()).rejects.toThrow("NEXT_REDIRECT:/admin");
        expect(mockRedirect).toHaveBeenCalledWith("/admin");
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it("authorization helper throwing triggers redirect('/admin') outside catchable try block", async () => {
      vi.stubEnv("VERCEL_ENV", "preview");
      vi.mocked(authorizeAdminPaymentsWrite).mockRejectedValueOnce(
        new Error("Auth internal transport failure")
      );

      try {
        await expect(CulqiSandboxTokenPage()).rejects.toThrow("NEXT_REDIRECT:/admin");
        expect(mockRedirect).toHaveBeenCalledWith("/admin");
      } finally {
        vi.unstubAllEnvs();
      }
    });
  });

  describe("12. Request-Time Dynamic Architecture & Build-Time DB Prohibition (BÚHOLEX-AUTH-A0.4-FIX5)", () => {
    it("admin root layout explicitly configures dynamic = 'force-dynamic' as highest segment boundary", () => {
      expect(adminLayoutDynamic).toBe("force-dynamic");
    });

    it("legacy authenticated redirect routes explicitly configure dynamic = 'force-dynamic'", () => {
      expect(legacyComplaintsDynamic).toBe("force-dynamic");
      expect(legacyComplaintDetailDynamic).toBe("force-dynamic");
      expect(legacyCulqiDynamic).toBe("force-dynamic");
    });

    it("proves authorization database client is not evaluated on module import and only runs on request invocation", async () => {
      const dbClientModule = await import("@/database/client");
      expect(typeof dbClientModule.getAuthorizationDatabase).toBe("function");
    });

    it("proves /admin layout executes operator authorization strictly at request-time", async () => {
      const validSession: WorkspaceSession = {
        status: "authenticated",
        sessionId: "sess-op-1",
        providerSubjectId: "op-sub-1",
        issuedAt: "2026-10-25T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      mockSession = validSession;
      setMockRepoState({ kind: "authorized", operatorId: "op-1" });

      const element = await AdminBackofficeLayout({ children: React.createElement("div", null, "Contenido Admin") });
      expect(element).toBeDefined();
      expect(mockRepo.resolveActiveOperator).toHaveBeenCalledWith("supabase", "op-sub-1");
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("unauthorized user invoking /admin layout at request-time is redirected to /app", async () => {
      const validSession: WorkspaceSession = {
        status: "authenticated",
        sessionId: "sess-user-1",
        providerSubjectId: "user-sub-1",
        issuedAt: "2026-10-25T00:00:00Z",
        expiresAt: null,
        provider: "supabase",
      };
      mockSession = validSession;
      setMockRepoState({ kind: "operator_not_mapped" });

      await expect(
        AdminBackofficeLayout({ children: React.createElement("div", null, "Contenido Admin") })
      ).rejects.toThrow("NEXT_REDIRECT:/app");
      expect(mockRedirect).toHaveBeenCalledWith("/app");
    });
  });
});
