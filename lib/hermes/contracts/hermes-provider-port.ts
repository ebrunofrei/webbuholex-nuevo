import type { HermesRequest, HermesProviderOutcome } from "./hermes-envelope";

export interface HermesProviderPort {
  generateStructuredOutput(request: HermesRequest): Promise<HermesProviderOutcome>;
}
