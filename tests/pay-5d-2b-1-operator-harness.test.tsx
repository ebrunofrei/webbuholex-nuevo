import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { OperatorTokenHarness } from "@/components/payments/operator-token-harness";
import CulqiSandboxTokenPage from "@/app/app/admin/sandbox/culqi-token/page";
import { authorizeAdminPaymentsWrite } from "@/lib/payments/payments-admin-http-runtime";
import { notFound, redirect } from "next/navigation";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";

vi.mock("@/lib/payments/payments-admin-http-runtime", () => ({
  authorizeAdminPaymentsWrite: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/script", () => ({
  default: ({ onLoad, onError }: any) => {
    (global as any).simulateScriptLoad = onLoad;
    (global as any).simulateScriptError = onError;
    return <div data-testid="mock-script" />;
  },
}));

describe("PAY-5D.2B.1-R1 — CUSTOM CHECKOUT TOKENIZATION HARNESS", () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    delete (window as any).CulqiCheckout;
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Server Page Guards", () => {
    it("Production unavailable (notFound)", async () => {
      vi.stubEnv("VERCEL_ENV", "production");
      vi.stubEnv("NODE_ENV", "production");
      
      try {
        await CulqiSandboxTokenPage();
      } catch {}

      expect(notFound).toHaveBeenCalled();
    });

    it("Preview guard allows access", async () => {
      vi.stubEnv("VERCEL_ENV", "preview");
      vi.stubEnv("NEXT_PUBLIC_CULQI_PUBLIC_KEY", "pk_test_123");
      vi.mocked(authorizeAdminPaymentsWrite).mockResolvedValue({ kind: "authorized", principal: { operatorId: "1", identitySource: "authenticated_session" } });

      const element = await CulqiSandboxTokenPage();
      expect(notFound).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
      expect(element).toBeDefined();
    });

    it("payments:write authorization missing redirects to /app", async () => {
      vi.stubEnv("VERCEL_ENV", "preview");
      vi.mocked(authorizeAdminPaymentsWrite).mockResolvedValue({ kind: "capability_missing" });

      try {
        await CulqiSandboxTokenPage();
      } catch {}

      expect(redirect).toHaveBeenCalledWith("/app");
    });
    
    it("missing pk_test_* fails safely with Configuration Required warning", async () => {
      vi.stubEnv("VERCEL_ENV", "preview");
      vi.stubEnv("NEXT_PUBLIC_CULQI_PUBLIC_KEY", "");
      vi.mocked(authorizeAdminPaymentsWrite).mockResolvedValue({ kind: "authorized", principal: { operatorId: "1", identitySource: "authenticated_session" } });

      const element = await CulqiSandboxTokenPage();
      const { container } = render(element as React.ReactElement);
      expect(screen.getByText("Configuration Required")).toBeDefined();
    });
  });

  describe("Operator Token Harness Client Component", () => {
    it("malformed/non-test public key rejected in Preview", async () => {
      const mockOpen = vi.fn();
      class MockCulqiCheckout {
        constructor() {}
        open = mockOpen;
      }
      (window as any).CulqiCheckout = MockCulqiCheckout;

      render(<OperatorTokenHarness publicKey="pk_live_123" />);
      
      act(() => {
        (global as any).simulateScriptLoad();
      });
      
      await waitFor(() => {
        expect(screen.getByText("Invalid public key. Must be a test key (pk_test_...).")).toBeDefined();
      });
      expect(mockOpen).not.toHaveBeenCalled();
    });

    it("successful callback accepts valid tkn_* and opens checkout only after provider client ready", async () => {
      const mockOpen = vi.fn();
      let capturedInstance: any;
      class MockCulqiCheckout {
        constructor(key: string, options: any) {
          capturedInstance = this;
        }
        open = mockOpen;
        close = vi.fn();
        token: any;
        error: any;
        culqi: any;
      }
      (window as any).CulqiCheckout = MockCulqiCheckout;

      render(<OperatorTokenHarness publicKey="pk_test_123" />);
      
      expect(screen.getByText("Loading checkout...")).toBeDefined();
      
      act(() => {
        (global as any).simulateScriptLoad();
      });
      
      await waitFor(() => {
        expect(screen.getByText("Open Culqi Checkout")).toBeDefined();
      });

      fireEvent.click(screen.getByText("Open Culqi Checkout"));
      expect(mockOpen).toHaveBeenCalled();

      act(() => {
        capturedInstance.token = { id: "tkn_test_123abc" };
        capturedInstance.culqi();
      });

      await waitFor(() => {
        expect(screen.getByText("Token Generated Successfully")).toBeDefined();
        expect(screen.getByText("tkn_test_123abc")).toBeDefined();
      });
    });
    
    it("malformed token rejected by callback", async () => {
      const mockOpen = vi.fn();
      let capturedInstance: any;
      class MockCulqiCheckout {
        constructor(key: string, options: any) {
          capturedInstance = this;
        }
        open = mockOpen;
        close = vi.fn();
        token: any;
        error: any;
        culqi: any;
      }
      (window as any).CulqiCheckout = MockCulqiCheckout;

      render(<OperatorTokenHarness publicKey="pk_test_123" />);
      act(() => {
        (global as any).simulateScriptLoad();
      });
      
      await waitFor(() => {
        expect(screen.getByText("Open Culqi Checkout")).toBeDefined();
      });

      act(() => {
        capturedInstance.token = { id: "bad_string" };
        capturedInstance.culqi();
      });

      await waitFor(() => {
        expect(screen.getByText("Provider returned an invalid token format.")).toBeDefined();
      });
    });

    it("sanitized provider error behavior is shown", async () => {
      const mockOpen = vi.fn();
      let capturedInstance: any;
      class MockCulqiCheckout {
        constructor() {
          capturedInstance = this;
        }
        open = mockOpen;
        close = vi.fn();
        token: any;
        error: any;
        culqi: any;
      }
      (window as any).CulqiCheckout = MockCulqiCheckout;

      render(<OperatorTokenHarness publicKey="pk_test_123" />);
      act(() => {
        (global as any).simulateScriptLoad();
      });
      
      await waitFor(() => {
        expect(screen.getByText("Open Culqi Checkout")).toBeDefined();
      });

      act(() => {
        capturedInstance.error = { user_message: "Card declined by bank sandbox." };
        capturedInstance.culqi();
      });

      await waitFor(() => {
        expect(screen.getByText("Card declined by bank sandbox.")).toBeDefined();
      });
    });
  });
});
