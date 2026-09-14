import { describe, it, expect, vi, beforeEach } from "vitest";
import { CulqiProviderAdapter } from "../lib/payments/culqi-provider-adapter";
import {
  CulqiAuthenticationError,
  CulqiValidationError,
  CulqiDeclineError,
  CulqiRateLimitError,
  CulqiUnavailableError,
  CulqiNetworkError,
  CulqiTimeoutError,
  CulqiReconciliationError,
} from "../lib/payments/culqi-errors";

describe("CulqiProviderAdapter", () => {
  let adapter: CulqiProviderAdapter;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.CULQI_PRIVATE_KEY = "test_key";
    mockFetch = vi.fn();
    adapter = new CulqiProviderAdapter({ fetchFn: mockFetch as any, timeoutMs: 10000 });
  });

  const validCommand = {
    amountMinor: 5000,
    currency: "PEN" as const,
    customerEmail: "test@example.com",
    sourceToken: "tkn_123",
    metadataCorrelation: "op_123",
  };

  it("sends correct POST request with Bearer token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        object: "charge",
        id: "chr_test123",
        amount: 5000,
        currency: "PEN",
        response_code: "venta_exitosa",
        state: "Exitosa",
      }),
    } as any);

    const response = await adapter.createCharge(validCommand);
    const [url, init] = mockFetch.mock.calls[0] as any[];
    expect(url).toBe("https://api.culqi.com/v2/charges");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer test_key");
    const body = JSON.parse(init.body);
    expect(body.amount).toBe(5000);
    expect(body.currency_code).toBe("PEN");
    expect(body.email).toBe("test@example.com");
    expect(body.source_id).toBe("tkn_123");
    expect(body.metadata.payment_operation_key).toBe("op_123");

    expect(response.providerPaymentId).toBe("chr_test123");
    expect(response.amountMinor).toBe(5000);
    expect(response.currency).toBe("PEN");
    expect(response.providerState).toBe("success");
    expect(response.providerResponseCode).toBe("venta_exitosa");
  });

  it("handles 401 Authentication Error without catching in network", async () => {
    delete process.env.CULQI_PRIVATE_KEY;
    await expect(adapter.createCharge(validCommand)).rejects.toThrow(CulqiAuthenticationError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("handles 429 Rate Limit", async () => {
    mockFetch.mockResolvedValueOnce({ status: 429, ok: false } as any);
    await expect(adapter.createCharge(validCommand)).rejects.toThrow(CulqiRateLimitError);
  });

  it("handles decline card_error with charge_id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        object: "error",
        type: "card_error",
        charge_id: "chr_declined123",
        code: "insufficient_funds",
        decline_code: "51",
      }),
    } as any);

    try {
      await adapter.createCharge(validCommand);
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(CulqiDeclineError);
      expect(err.providerPaymentId).toBe("chr_declined123");
      expect(err.code).toBe("insufficient_funds");
      expect(err.declineCode).toBe("51");
    }
  });

  it("handles decline without charge_id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        object: "error",
        type: "card_error",
        code: "invalid_card",
      }),
    } as any);

    try {
      await adapter.createCharge(validCommand);
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(CulqiDeclineError);
      expect(err.providerPaymentId).toBeUndefined();
    }
  });

  it("handles validation error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        object: "error",
        type: "invalid_request_error",
        code: "invalid_email",
      }),
    } as any);
    await expect(adapter.createCharge(validCommand)).rejects.toThrow(CulqiValidationError);
  });

  it("handles amount mismatch as reconciliation error with charge_id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        object: "charge",
        id: "chr_test123",
        amount: 4000, // mismatch
        currency: "PEN",
        response_code: "venta_exitosa",
        state: "Exitosa",
      }),
    } as any);

    try {
      await adapter.createCharge(validCommand);
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(CulqiReconciliationError);
      expect(err.providerPaymentId).toBe("chr_test123");
    }
  });

  it("handles state mismatch as reconciliation error with charge_id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        object: "charge",
        id: "chr_test123",
        amount: 5000,
        currency: "PEN",
        response_code: "venta_exitosa",
        state: "Pendiente", // not exitosa
      }),
    } as any);

    try {
      await adapter.createCharge(validCommand);
      expect.fail("Should have thrown");
    } catch (err: any) {
      expect(err).toBeInstanceOf(CulqiReconciliationError);
      expect(err.providerPaymentId).toBe("chr_test123");
    }
  });

  it("handles timeout error", async () => {
    mockFetch.mockRejectedValueOnce({ name: "AbortError" });
    await expect(adapter.createCharge(validCommand)).rejects.toThrow(CulqiTimeoutError);
  });

  it("handles network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("fetch failed"));
    await expect(adapter.createCharge(validCommand)).rejects.toThrow(CulqiNetworkError);
  });

  it("handles 500 error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error(); },
    } as any);
    await expect(adapter.createCharge(validCommand)).rejects.toThrow(CulqiUnavailableError);
  });

  it("sends correct GET request for getCharge", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        object: "charge",
        id: "chr_123",
        amount: 5000,
        currency: "PEN",
        response_code: "venta_exitosa",
        state: "Exitosa",
      }),
    } as any);

    const response = await adapter.getCharge("chr_123");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as any[];
    expect(url).toBe("https://api.culqi.com/v2/charges/chr_123");
    expect(init.method).toBe("GET");
    expect(response.providerPaymentId).toBe("chr_123");
  });
});
