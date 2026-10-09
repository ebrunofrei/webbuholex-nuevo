import { owlLegalAnalysisResultSchema, validateReferentialConsistency } from "@/lib/owl/contracts/owl-analysis.schemas";
import type { OwlLegalAnalysisResult } from "@/types/owl/owl-analysis";
import type { HermesProviderOutcome } from "../contracts/hermes-envelope";
import type { HermesProviderError } from "../contracts/hermes-provider-error";

export type HermesModelOutputResult =
  | { readonly ok: true; readonly result: OwlLegalAnalysisResult }
  | { readonly ok: false; readonly error: HermesProviderError };

export function parseAndValidateModelOutput(outcome: HermesProviderOutcome): HermesModelOutputResult {
  if (!outcome.ok) {
    return { ok: false, error: outcome.error };
  }

  const parsed = owlLegalAnalysisResultSchema.safeParse(outcome.payload);

  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "invalid_output",
        isRetryable: false
      }
    };
  }

  const refCheck = validateReferentialConsistency(parsed.data);
  if (!refCheck.valid) {
    return {
      ok: false,
      error: {
        code: "invalid_output",
        isRetryable: false
      }
    };
  }

  return {
    ok: true,
    result: parsed.data
  };
}
