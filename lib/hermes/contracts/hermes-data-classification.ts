import { z } from "zod";

export const hermesDataClassificationSchema = z.enum([
  "TRUSTED_SYSTEM_POLICY",
  "USER_PROVIDED_LEGAL_TEXT",
  "FUTURE_RETRIEVED_CONTEXT"
]);

export type HermesDataClassification = z.infer<typeof hermesDataClassificationSchema>;
