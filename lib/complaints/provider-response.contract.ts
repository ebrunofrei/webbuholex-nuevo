import { z } from "zod";
import { COMPLAINT_RESPONSE_CHANNELS, COMPLAINT_LIMITS } from "./complaint.constants";

const trimmedString = (max: number) => z.string().trim().min(1).max(max);

export const ProviderResponseHttpSchema = z.object({
  expectedCurrentStatus: z.enum(["under_review", "awaiting_information"]),
  responseChannel: z.enum(COMPLAINT_RESPONSE_CHANNELS),
  responderName: trimmedString(COMPLAINT_LIMITS.firstNames),
  responderRole: trimmedString(COMPLAINT_LIMITS.representativeRole),
  responseText: trimmedString(COMPLAINT_LIMITS.facts).optional(),
  actionsTaken: trimmedString(COMPLAINT_LIMITS.facts).optional(),
}).strict();

export type ProviderResponseHttpPayload = z.infer<typeof ProviderResponseHttpSchema>;
