import { z } from "zod";

const idempotencyKeySchema = z.string().trim().min(8).max(200).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const opaqueReferenceSchema = z.string().uuid();

export const jurisprudencePublicationRecoveryCommandSchema = z.object({
  originalOutboxId: opaqueReferenceSchema,
  recordId: opaqueReferenceSchema,
  recordVersion: z.number().int().min(1),
  idempotencyKey: idempotencyKeySchema,
}).strict();

export type JurisprudencePublicationRecoveryCommand = z.infer<typeof jurisprudencePublicationRecoveryCommandSchema>;
