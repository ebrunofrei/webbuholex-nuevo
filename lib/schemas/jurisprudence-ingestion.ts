import { z } from "zod";
import { jurisprudenceApplicationContextSchema } from "@/lib/schemas/jurisprudence-application";
import { jurisprudenceNewRecordSchema } from "@/lib/schemas/jurisprudence-repository";
import type {
  ConfirmJurisprudenceIngestionPreviewCommand,
  JurisprudenceIngestionBatch,
} from "@/types/jurisprudence-ingestion";

const opaqueReferenceSchema = z.string().trim().min(3).max(200)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

export const jurisprudenceIngestionSourceKindSchema = z.enum([
  "local_json",
  "local_structured_record",
  "test_fixture",
]);

export const jurisprudenceIngestionSourceSchema = z.object({
  sourceKind: jurisprudenceIngestionSourceKindSchema,
  sourceReference: opaqueReferenceSchema,
  acquiredAt: z.string().datetime(),
  acquiredBy: opaqueReferenceSchema,
  checksum: z.string().regex(/^[a-fA-F0-9]{64}$/),
  mediaType: z.literal("application/json"),
  originalFileName: z.string().trim().min(1).max(255)
    .regex(/^[^\\/:*?"<>|]+$/).optional(),
  byteSize: z.number().int().positive().max(10_485_760),
  sourceSystem: opaqueReferenceSchema.optional(),
}).strict();

export const jurisprudenceIngestionItemSchema = z.object({
  ingestionItemId: opaqueReferenceSchema,
  source: jurisprudenceIngestionSourceSchema,
  rawRecord: jurisprudenceNewRecordSchema,
  requestedAction: z.enum([
    "preview_create",
    "preview_update",
    "confirm_create",
    "confirm_update",
  ]),
  idempotencyKey: z.string().trim().min(8).max(200),
  targetRecordId: z.string().trim().min(1).max(160).optional(),
  expectedVersion: z.number().int().positive().optional(),
  changeKind: z.enum(["editorial_update", "source_update"]).optional(),
}).strict().superRefine((item, context) => {
  const update = item.requestedAction === "preview_update" || item.requestedAction === "confirm_update";
  if (update && item.targetRecordId === undefined) {
    context.addIssue({ code: "custom", path: ["targetRecordId"], message: "La actualización requiere targetRecordId." });
  }
  if (update && item.expectedVersion === undefined) {
    context.addIssue({ code: "custom", path: ["expectedVersion"], message: "La actualización requiere expectedVersion." });
  }
  if (update && item.changeKind === undefined) {
    context.addIssue({ code: "custom", path: ["changeKind"], message: "La actualización requiere changeKind." });
  }
  if (!update && (item.targetRecordId !== undefined || item.expectedVersion !== undefined || item.changeKind !== undefined)) {
    context.addIssue({ code: "custom", path: ["requestedAction"], message: "La creación no admite campos de actualización." });
  }
  if (item.rawRecord.editorialStatus !== "draft") {
    context.addIssue({ code: "custom", path: ["rawRecord", "editorialStatus"], message: "La ingesta solo crea o actualiza borradores." });
  }
  if (item.rawRecord.publicationStatus !== "private") {
    context.addIssue({ code: "custom", path: ["rawRecord", "publicationStatus"], message: "La ingesta no puede publicar registros." });
  }
  if (item.rawRecord.source.verificationStatus !== "unverified") {
    context.addIssue({ code: "custom", path: ["rawRecord", "source", "verificationStatus"], message: "La ingesta no declara verificación oficial." });
  }
  if (item.rawRecord.officialContent.publicationAllowed) {
    context.addIssue({ code: "custom", path: ["rawRecord", "officialContent", "publicationAllowed"], message: "La ingesta no autoriza publicación." });
  }
  if (item.rawRecord.officialFile !== null) {
    context.addIssue({ code: "custom", path: ["rawRecord", "officialFile"], message: "11.G no admite archivos ni ubicaciones privadas." });
  }
});

export const jurisprudenceIngestionBatchSchema = z.object({
  batchId: opaqueReferenceSchema,
  context: jurisprudenceApplicationContextSchema,
  items: z.array(jurisprudenceIngestionItemSchema).min(1).max(100),
}).strict().transform((batch): JurisprudenceIngestionBatch => ({
  batchId: batch.batchId,
  context: {
    requestId: batch.context.requestId,
    actor: {
      kind: batch.context.actor.kind,
      id: batch.context.actor.id,
      ...(batch.context.actor.displayName === undefined
        ? {}
        : { displayName: batch.context.actor.displayName }),
    },
    operationSource: batch.context.operationSource,
    requestedAt: batch.context.requestedAt,
  },
  items: batch.items.map((item) => ({
    ingestionItemId: item.ingestionItemId,
    source: {
      sourceKind: item.source.sourceKind,
      sourceReference: item.source.sourceReference,
      acquiredAt: item.source.acquiredAt,
      acquiredBy: item.source.acquiredBy,
      checksum: item.source.checksum,
      mediaType: item.source.mediaType,
      byteSize: item.source.byteSize,
      ...(item.source.originalFileName === undefined
        ? {}
        : { originalFileName: item.source.originalFileName }),
      ...(item.source.sourceSystem === undefined
        ? {}
        : { sourceSystem: item.source.sourceSystem }),
    },
    rawRecord: item.rawRecord,
    requestedAction: item.requestedAction,
    idempotencyKey: item.idempotencyKey,
    ...(item.targetRecordId === undefined ? {} : { targetRecordId: item.targetRecordId }),
    ...(item.expectedVersion === undefined ? {} : { expectedVersion: item.expectedVersion }),
    ...(item.changeKind === undefined ? {} : { changeKind: item.changeKind }),
  })),
}));

export const confirmJurisprudenceIngestionPreviewCommandSchema = z.object({
  context: jurisprudenceApplicationContextSchema,
  previewId: opaqueReferenceSchema,
  normalizedRecordFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  idempotencyKey: z.string().trim().min(8).max(200),
  expectedVersion: z.number().int().positive().optional(),
}).strict().transform((command): ConfirmJurisprudenceIngestionPreviewCommand => ({
  context: {
    requestId: command.context.requestId,
    actor: {
      kind: command.context.actor.kind,
      id: command.context.actor.id,
      ...(command.context.actor.displayName === undefined
        ? {}
        : { displayName: command.context.actor.displayName }),
    },
    operationSource: command.context.operationSource,
    requestedAt: command.context.requestedAt,
  },
  previewId: command.previewId,
  normalizedRecordFingerprint: command.normalizedRecordFingerprint,
  idempotencyKey: command.idempotencyKey,
  ...(command.expectedVersion === undefined ? {} : { expectedVersion: command.expectedVersion }),
}));
