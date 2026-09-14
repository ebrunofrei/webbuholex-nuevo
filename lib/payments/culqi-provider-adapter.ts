import { z } from "zod";
import { CreateChargeCommand, NormalizedChargeResponse, PaymentProviderClient } from "./payment-provider-client";
import {
  CulqiAuthenticationError,
  CulqiDeclineError,
  CulqiMalformedResponseError,
  CulqiNetworkError,
  CulqiRateLimitError,
  CulqiTimeoutError,
  CulqiUnavailableError,
  CulqiValidationError,
  CulqiReconciliationError,
} from "./culqi-errors";

const CULQI_API_URL = "https://api.culqi.com/v2";

const chargeResponseSchema = z.object({
  object: z.literal("charge"),
  id: z.string().startsWith("chr_"),
  amount: z.number().int(),
  currency: z.enum(["PEN"]),
  response_code: z.string(),
  state: z.string(),
}).passthrough();

const errorResponseSchema = z.object({
  object: z.literal("error").optional(),
  type: z.string().optional(),
  charge_id: z.string().startsWith("chr_").optional(),
  code: z.string().optional(),
  decline_code: z.string().optional(),
}).passthrough();

export type CulqiAdapterConfig = {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
};

export class CulqiProviderAdapter implements PaymentProviderClient {
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(config?: CulqiAdapterConfig) {
    this.fetchFn = config?.fetchFn ?? fetch.bind(globalThis);
    this.timeoutMs = config?.timeoutMs ?? 10000;
  }

  private getAuthHeaders(): HeadersInit {
    const key = process.env.CULQI_PRIVATE_KEY;
    if (!key) {
      throw new CulqiAuthenticationError("CULQI_PRIVATE_KEY is not configured.");
    }
    return {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    };
  }

  async createCharge(command: CreateChargeCommand): Promise<NormalizedChargeResponse> {
    const headers = this.getAuthHeaders();

    const body = {
      amount: command.amountMinor,
      currency_code: command.currency,
      email: command.customerEmail,
      source_id: command.sourceToken,
      metadata: {
        payment_operation_key: command.metadataCorrelation,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchFn(`${CULQI_API_URL}/charges`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new CulqiTimeoutError();
      }
      throw new CulqiNetworkError(err.message || "Network error occurred connecting to Culqi");
    }

    clearTimeout(timeout);
    return this.handleResponse(response, command);
  }

  async getCharge(providerPaymentId: string): Promise<NormalizedChargeResponse> {
    const headers = this.getAuthHeaders();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchFn(`${CULQI_API_URL}/charges/${providerPaymentId}`, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new CulqiTimeoutError();
      }
      throw new CulqiNetworkError(err.message || "Network error occurred connecting to Culqi");
    }

    clearTimeout(timeout);
    return this.handleResponse(response);
  }

  private async handleResponse(response: Response, command?: CreateChargeCommand): Promise<NormalizedChargeResponse> {
    if (response.status === 401 || response.status === 403) {
      throw new CulqiAuthenticationError();
    }
    if (response.status === 429) {
      throw new CulqiRateLimitError();
    }

    let json: any;
    try {
      json = await response.json();
    } catch (err) {
      if (!response.ok) {
        if (response.status >= 500) {
          throw new CulqiUnavailableError(`Provider returned ${response.status}`);
        }
        throw new CulqiNetworkError(`Received non-JSON error ${response.status}`);
      }
      throw new CulqiMalformedResponseError("Failed to parse JSON response");
    }

    if (response.status >= 400 && response.status < 500) {
      const errorParsed = errorResponseSchema.safeParse(json);
      const errObj = errorParsed.success ? errorParsed.data : {};

      const errorCode = errObj.code || "unknown";
      const declineCode = errObj.decline_code;
      const chargeId = errObj.charge_id;
      const type = errObj.type;

      if (type === "card_error" || type === "authentication_error") {
        throw new CulqiDeclineError("Payment declined by provider", errorCode, declineCode, chargeId);
      } else {
        throw new CulqiValidationError("Validation failed", errorCode);
      }
    }

    if (!response.ok) {
      throw new CulqiUnavailableError(`Culqi returned status ${response.status}`);
    }

    const parsed = chargeResponseSchema.safeParse(json);
    if (!parsed.success) {
      // It's a 2xx response but malformed. Could mean mutation happened!
      // We must check if we can extract a valid charge_id safely.
      let chargeId: string | undefined;
      if (json && typeof json.id === "string" && json.id.startsWith("chr_")) {
        chargeId = json.id;
      }
      throw new CulqiReconciliationError("Invalid charge object returned by provider", chargeId);
    }

    const charge = parsed.data;

    if (command) {
      if (charge.amount !== command.amountMinor || charge.currency !== command.currency) {
        throw new CulqiReconciliationError("Amount or currency mismatch", charge.id);
      }
    }

    if (charge.response_code !== "venta_exitosa" || charge.state !== "Exitosa") {
      throw new CulqiReconciliationError("Charge object state is not successful", charge.id);
    }

    return {
      providerPaymentId: charge.id,
      amountMinor: charge.amount,
      currency: charge.currency,
      providerState: "success",
      providerResponseCode: charge.response_code,
    };
  }
}
