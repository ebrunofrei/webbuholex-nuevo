import { z } from "zod";
import { jurisprudenceSearchInputSchema } from "@/lib/schemas/jurisprudence";
import { jurisprudenceNewRecordSchema, jurisprudenceRepositoryFiltersSchema } from "@/lib/schemas/jurisprudence-repository";

export const jurisprudenceHttpRequestIdSchema = z.string().regex(/^[A-Za-z0-9_-]{8,128}$/);
export const jurisprudenceHttpIdempotencyKeySchema = z.string().regex(/^[A-Za-z0-9._:-]{8,160}$/);
export const jurisprudenceHttpSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(200);
export const jurisprudenceHttpRecordIdSchema = z.string().trim().min(1).max(160);

export const jurisprudenceHttpPublicSearchSchema = jurisprudenceSearchInputSchema;

export const jurisprudenceHttpInternalListSchema = z.object({
  filters: jurisprudenceRepositoryFiltersSchema.default({}),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
  sort: z.enum(["issued_at_asc", "issued_at_desc", "updated_at_asc", "updated_at_desc"]).default("updated_at_desc"),
}).strict();

export const jurisprudenceHttpCreateBodySchema = z.object({
  record: jurisprudenceNewRecordSchema,
}).strict();

export const jurisprudenceHttpUpdateBodySchema = z.object({
  expectedVersion: z.number().int().positive(),
  changeKind: z.enum(["editorial_update", "source_update"]),
  record: jurisprudenceNewRecordSchema,
}).strict();
