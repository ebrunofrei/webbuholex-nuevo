import { z } from "zod";
import { hermesSystemMessageSchema, hermesUserMessageSchema } from "./hermes-messages";
import type { HermesProviderError } from "./hermes-provider-error";

export const hermesRequestSchema = z.object({
  messages: z.tuple([hermesSystemMessageSchema, hermesUserMessageSchema]),
  structuredOutputIntent: z.literal("owl_legal_analysis_result"),
  metadata: z.object({
    analysisId: z.string(),
    locale: z.literal("es-PE")
  }).strict()
}).strict();

export type HermesRequest = z.infer<typeof hermesRequestSchema>;

export type HermesProviderOutcome =
  | { readonly ok: true; readonly payload: unknown }
  | { readonly ok: false; readonly error: HermesProviderError };
