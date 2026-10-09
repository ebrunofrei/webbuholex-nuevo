import type { OwlLegalAnalysisRequest } from "@/types/owl/owl-analysis";
import type { HermesUserMessage } from "../contracts/hermes-messages";

export function buildHermesUserContent(validatedRequest: OwlLegalAnalysisRequest): HermesUserMessage {
  // Trust boundary enforcement: input remains untrusted user content.
  // It is explicitly isolated in the 'user' role with a clear classification.
  return {
    role: "user",
    content: validatedRequest.text,
    classification: "USER_PROVIDED_LEGAL_TEXT"
  };
}
