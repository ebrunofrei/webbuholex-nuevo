import { z } from "zod";
import { jurisprudenceSearchInputSchema } from "@/lib/schemas/jurisprudence";
import {
  jurisprudenceExternalIdentitySchema,
  jurisprudenceNewRecordSchema,
  jurisprudenceRepositoryFiltersSchema,
} from "@/lib/schemas/jurisprudence-repository";

export const jurisprudenceApplicationActorSchema = z.object({
  kind: z.enum(["system", "editorial_operator", "internal_test"]),
  id: z.string().trim().min(1).max(160),
  displayName: z.string().trim().min(1).max(200).optional(),
}).strict();

export const jurisprudenceApplicationContextSchema = z.object({
  requestId: z.string().trim().min(8).max(200),
  actor: jurisprudenceApplicationActorSchema,
  operationSource: z.enum(["internal_api", "editorial_workflow", "test"]),
  requestedAt: z.string().datetime(),
}).strict();

export const createJurisprudenceRecordCommandSchema = z.object({
  context: jurisprudenceApplicationContextSchema,
  idempotencyKey: z.string().trim().min(8).max(200),
  record: jurisprudenceNewRecordSchema,
}).strict();

export const updateJurisprudenceRecordCommandSchema = z.object({
  context: jurisprudenceApplicationContextSchema,
  id: z.string().trim().min(1).max(160),
  expectedVersion: z.number().int().positive(),
  changeKind: z.enum(["editorial_update", "source_update"]),
  record: jurisprudenceNewRecordSchema,
}).strict();

const contextAndIdSchema = z.object({
  context: jurisprudenceApplicationContextSchema,
  id: z.string().trim().min(1).max(160),
}).strict();

export const getInternalJurisprudenceRecordQuerySchema = contextAndIdSchema;
export const getJurisprudenceVersionHistoryQuerySchema = contextAndIdSchema;
export const evaluateJurisprudencePublicationQuerySchema = contextAndIdSchema;

export const getInternalJurisprudenceRecordBySlugQuerySchema = z.object({
  context: jurisprudenceApplicationContextSchema,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
}).strict();

export const getInternalJurisprudenceRecordByIdentityQuerySchema = z.object({
  context: jurisprudenceApplicationContextSchema,
  identity: jurisprudenceExternalIdentitySchema,
}).strict();

export const listInternalJurisprudenceRecordsQuerySchema = z.object({
  context: jurisprudenceApplicationContextSchema,
  input: z.object({
    filters: jurisprudenceRepositoryFiltersSchema.optional(),
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(50).optional(),
    sort: z.enum(["issued_at_asc", "issued_at_desc", "updated_at_asc", "updated_at_desc"]).optional(),
  }).strict().optional(),
}).strict();

export const searchInternalJurisprudenceRecordsQuerySchema = z.object({
  context: jurisprudenceApplicationContextSchema,
  q: z.string().trim().min(1).max(500),
  filters: jurisprudenceRepositoryFiltersSchema.optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(50).optional(),
  sort: z.enum(["issued_at_asc", "issued_at_desc", "updated_at_asc", "updated_at_desc"]).optional(),
}).strict();

export const countInternalJurisprudenceRecordsQuerySchema = z.object({
  context: jurisprudenceApplicationContextSchema,
  filters: jurisprudenceRepositoryFiltersSchema.optional(),
}).strict();

export const searchPublicJurisprudenceQuerySchema = z.object({
  context: jurisprudenceApplicationContextSchema,
  input: jurisprudenceSearchInputSchema,
}).strict();

export const getPublicJurisprudenceDetailQuerySchema = z.object({
  context: jurisprudenceApplicationContextSchema,
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
}).strict();
