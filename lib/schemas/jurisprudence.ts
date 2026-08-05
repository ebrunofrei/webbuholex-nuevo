import { z } from "zod";

export const jurisprudenceSourceKindSchema = z.enum(["official_api", "official_open_dataset", "official_document", "official_page", "manual_official_link"]);
export const jurisprudenceIngestionStateSchema = z.enum(["discovered", "metadata_imported", "official_link_verified", "document_downloaded", "integrity_verified", "parsed", "editorially_reviewed", "approved", "stale", "source_unavailable"]);
export const jurisprudenceCitationSchema = z.object({
  id: z.string().min(1), documentId: z.string().min(1), pageStart: z.number().int().positive(), pageEnd: z.number().int().positive(), paragraph: z.string().nullable(), quote: z.string().nullable(), officialUrl: z.string().url(), verified: z.boolean(),
}).superRefine((citation, context) => {
  if (citation.pageEnd < citation.pageStart) context.addIssue({ code: "custom", path: ["pageEnd"], message: "La página final no puede preceder a la inicial." });
});

export const jurisprudenceDocumentSchema = z.object({
  id: z.string().min(1),
  institution: z.object({ id: z.string().min(1), name: z.string().min(2), shortName: z.string().min(2), country: z.string().min(2), kind: z.enum(["judiciary", "constitutional_court", "international_court", "legal_information_system", "other_official"]), officialHomepage: z.string().url().nullable() }),
  issuingBody: z.string().min(2), chamber: z.string().nullable(), resolutionType: z.string().min(2), resolutionNumber: z.string().min(1), caseNumber: z.string().min(1), date: z.string().date(), publicationDate: z.string().date().nullable(), specialty: z.string().min(2), matter: z.string().min(2), submatter: z.string().nullable(),
  legalIssues: z.array(z.object({ id: z.string().min(1), question: z.string().min(10), specialty: z.string().min(2), matter: z.string().min(2), submatter: z.string().nullable(), sourceSectionIds: z.array(z.string().min(1)), verified: z.boolean() })),
  holdings: z.array(z.object({ id: z.string().min(1), kind: z.enum(["ratio_decidendi", "obiter_dictum", "concurring_opinion", "dissenting_opinion"]), statement: z.string().min(10), legalIssueIds: z.array(z.string().min(1)), citationIds: z.array(z.string().min(1)), verified: z.boolean() })),
  sections: z.array(z.object({ id: z.string().min(1), kind: z.enum(["identification", "background", "facts", "procedural_history", "legal_ground", "decision", "separate_opinion", "annex"]), heading: z.string().nullable(), startPage: z.number().int().positive(), endPage: z.number().int().positive(), officialExcerpt: z.string().nullable(), systemSummary: z.string().nullable() })),
  citations: z.array(jurisprudenceCitationSchema),
  officialSource: z.object({ kind: jurisprudenceSourceKindSchema, canonicalUrl: z.string().url(), documentUrl: z.string().url().nullable(), verifiedAt: z.string().datetime(), state: jurisprudenceIngestionStateSchema }),
  bindingStatus: z.enum(["binding", "persuasive", "not_binding", "undetermined"]), documentStatus: z.enum(["metadata_only", "source_verified", "parsed", "editorially_reviewed", "approved", "stale", "unavailable"]), pageCount: z.number().int().positive().nullable(), keywords: z.array(z.string().min(2)), hasSeparateOpinions: z.boolean().nullable(),
}).superRefine((document, context) => {
  const citationIds = new Set(document.citations.map((citation) => citation.id));
  document.holdings.forEach((holding, index) => {
    if (holding.verified && holding.citationIds.length === 0) context.addIssue({ code: "custom", path: ["holdings", index, "citationIds"], message: "Un criterio verificado requiere al menos una cita." });
    holding.citationIds.forEach((citationId) => { if (!citationIds.has(citationId)) context.addIssue({ code: "custom", path: ["holdings", index, "citationIds"], message: "La cita del criterio debe pertenecer al documento." }); });
  });
  if (document.documentStatus === "approved" && document.officialSource.state !== "approved") context.addIssue({ code: "custom", path: ["officialSource", "state"], message: "Un documento aprobado requiere fuente aprobada." });
});

export const jurisprudenceQuerySchema = z.object({
  id: z.string().uuid(), mode: z.enum(["search", "quick_read", "question", "compare", "applicability"]), text: z.string().min(10).max(5000), jurisdiction: z.string().min(2), specialty: z.string().nullable(), matter: z.string().nullable(), documentIds: z.array(z.string().min(1)), userCaseSummary: z.string().max(5000).nullable(), privacyConsent: z.boolean(),
});

const responseSegmentSchema = z.object({ origin: z.enum(["official_content", "system_summary", "legal_inference", "applicability_assessment", "limitation"]), title: z.string().min(2), content: z.array(z.string().min(2)), citationIds: z.array(z.string().min(1)), verified: z.boolean() });
export const jurisprudenceAssistantResponseSchema = z.object({
  queryId: z.string().uuid(), status: z.enum(["not_executed", "insufficient_sources", "ready_for_review", "verified"]), officialContent: z.array(responseSegmentSchema), systemSummary: z.array(responseSegmentSchema), legalInference: z.array(responseSegmentSchema), applicabilityAssessment: z.array(responseSegmentSchema), limitations: z.array(responseSegmentSchema).min(1), citations: z.array(jurisprudenceCitationSchema), confidence: z.enum(["insufficient", "low", "medium", "high"]),
}).superRefine((response, context) => {
  const citations = new Map(response.citations.map((citation) => [citation.id, citation]));
  const segments = [...response.officialContent, ...response.systemSummary, ...response.legalInference, ...response.applicabilityAssessment];
  segments.forEach((segment, index) => {
    if (segment.verified && segment.citationIds.length === 0) context.addIssue({ code: "custom", path: ["segments", index], message: "Todo contenido verificado requiere cita." });
    segment.citationIds.forEach((id) => { if (!citations.get(id)?.verified) context.addIssue({ code: "custom", path: ["segments", index, "citationIds"], message: "La respuesta solo puede citar referencias verificadas." }); });
  });
});

export const jurisprudenceEditorialStatusSchema = z.enum(["draft", "under_review", "verified", "rejected", "archived"]);
export const jurisprudencePublicationStatusSchema = z.enum(["private", "editorial_preview", "published", "unpublished", "withdrawn"]);
export const jurisprudenceVerificationStatusSchema = z.enum(["unverified", "source_located", "partially_verified", "verified", "disputed"]);
export const jurisprudenceDocumentAvailabilitySchema = z.enum(["metadata_only", "excerpt_available", "full_text_available", "official_file_available", "unavailable"]);
export const jurisprudenceRecordSourceTypeSchema = z.enum(["official_judiciary", "constitutional_court", "government_platform", "official_gazette", "editorial_upload", "other_official_source"]);
export const jurisprudenceLegalAuthoritySchema = z.enum(["ordinary", "persuasive", "binding_precedent", "plenary_decision", "constitutional_precedent", "unknown"]);
export const jurisprudenceResolutionCategorySchema = z.enum(["ordinary_decision", "cassation", "plenary_cassation", "plenary_agreement", "constitutional_judgment", "other"]);
export const jurisprudenceValidityStatusSchema = z.enum(["current", "modified", "superseded", "contradicted", "unknown"]);
export const jurisprudenceOriginFormatSchema = z.enum(["pdf", "html", "docx", "txt", "xml", "json", "other"]);
export const jurisprudenceSearchSortSchema = z.enum(["relevance", "date_desc", "date_asc", "editorial_relevance"]);
export const jurisprudenceSearchDataStatusSchema = z.enum(["unavailable", "empty", "available", "partial"]);

const canonicalInstitutionSchema = z.object({
  id: z.string().trim().min(1).max(160),
  name: z.string().trim().min(2).max(300),
  shortName: z.string().trim().min(2).max(160),
  country: z.string().trim().min(2).max(120),
  kind: z.enum(["judiciary", "constitutional_court", "international_court", "legal_information_system", "other_official"]),
  officialHomepage: z.string().url().nullable(),
}).strict();

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i, "El checksum debe ser un SHA-256 hexadecimal.");
const nullableText = (minimum = 1, maximum = 5_000) => z.string().trim().min(minimum).max(maximum).nullable();

const officialContentSchema = z.object({
  officialSummary: nullableText(3, 10_000),
  officialFullText: nullableText(3, 2_000_000),
  fullTextAvailable: z.boolean(),
  publicationAllowed: z.boolean(),
  documentAvailability: jurisprudenceDocumentAvailabilitySchema,
  originFormat: jurisprudenceOriginFormatSchema,
  language: z.string().trim().min(2).max(35),
  pageCount: z.number().int().positive().nullable(),
}).strict().superRefine((content, context) => {
  if (content.fullTextAvailable && content.officialFullText === null) context.addIssue({ code: "custom", path: ["officialFullText"], message: "La disponibilidad de texto completo requiere texto oficial." });
  if (content.documentAvailability === "full_text_available" && !content.fullTextAvailable) context.addIssue({ code: "custom", path: ["documentAvailability"], message: "El estado de texto completo requiere disponibilidad confirmada." });
  if (!content.publicationAllowed && content.officialFullText !== null) context.addIssue({ code: "custom", path: ["publicationAllowed"], message: "El texto oficial no autorizado no debe incorporarse al registro publicable." });
});

const editorialContentSchema = z.object({
  editorialTitle: z.string().trim().min(5).max(500),
  editorialSummary: nullableText(3, 10_000),
  publicExcerpt: nullableText(3, 5_000),
  legalIssue: nullableText(5, 5_000),
  mainCriterion: nullableText(5, 10_000),
  relevantGrounds: z.array(z.string().trim().min(3).max(5_000)).max(100),
  decision: nullableText(3, 10_000),
  citedNorms: z.array(z.string().trim().min(2).max(500)).max(200),
  citedPrecedentIds: z.array(z.string().trim().min(1).max(160)).max(200),
  relatedRecordIds: z.array(z.string().trim().min(1).max(160)).max(200),
  keywords: z.array(z.string().trim().min(2).max(120)).max(100),
}).strict();

const generatedContentSchema = z.object({
  internalDraft: nullableText(3, 100_000),
  reviewed: z.boolean(),
  supportedBySource: z.boolean(),
}).strict().superRefine((content, context) => {
  if (content.reviewed && content.internalDraft === null) context.addIssue({ code: "custom", path: ["reviewed"], message: "No puede revisarse contenido generado inexistente." });
});

const canonicalSourceSchema = z.object({
  type: jurisprudenceRecordSourceTypeSchema,
  name: z.string().trim().min(2).max(300),
  url: z.string().url().nullable(),
  documentId: nullableText(1, 300),
  publishedAt: z.string().datetime().nullable(),
  retrievedAt: z.string().datetime().nullable(),
  checksum: sha256Schema.nullable(),
  verificationStatus: jurisprudenceVerificationStatusSchema,
  verifiedAt: z.string().datetime().nullable(),
  verifiedBy: nullableText(1, 200),
  verificationNotes: nullableText(1, 5_000),
  evidenceReference: nullableText(1, 500),
}).strict().superRefine((source, context) => {
  if (source.verificationStatus === "verified") {
    if (!source.url && !source.documentId && !source.evidenceReference) context.addIssue({ code: "custom", path: ["evidenceReference"], message: "Una fuente verificada requiere evidencia identificable." });
    if (!source.verifiedAt) context.addIssue({ code: "custom", path: ["verifiedAt"], message: "Una fuente verificada requiere fecha de verificación." });
  }
});

const safeInternalLocationSchema = z.string().trim().min(1).max(1_000).refine(
  (location) => !/^[a-z]:[\\/]/i.test(location) && !location.startsWith("/") && !/(^|\/)public(\/|$)/i.test(location) && !/^https?:\/\//i.test(location),
  "La ubicación futura debe ser privada y relativa.",
);

const canonicalFileSchema = z.object({
  available: z.boolean(),
  originalName: nullableText(1, 500),
  mimeType: nullableText(3, 160),
  byteSize: z.number().int().positive().nullable(),
  checksum: sha256Schema.nullable(),
  internalLocation: safeInternalLocationSchema.nullable(),
  publicAccessAllowed: z.boolean(),
  publicAccessAuthorizedAt: z.string().datetime().nullable(),
}).strict().superRefine((file, context) => {
  const hasMetadata = file.originalName !== null && file.mimeType !== null && file.byteSize !== null && file.checksum !== null;
  if (file.available && !hasMetadata) context.addIssue({ code: "custom", path: ["available"], message: "Un archivo disponible requiere metadatos verificables." });
  if (!file.available && (hasMetadata || file.internalLocation !== null || file.publicAccessAllowed)) context.addIssue({ code: "custom", path: ["available"], message: "Un archivo no disponible no puede conservar metadatos, ubicación ni acceso." });
  if (file.publicAccessAllowed && (!file.available || !file.publicAccessAuthorizedAt)) context.addIssue({ code: "custom", path: ["publicAccessAllowed"], message: "El acceso público requiere archivo real y autorización fechada." });
});

const authoritySchema = z.object({
  resolutionCategory: jurisprudenceResolutionCategorySchema,
  legalAuthority: jurisprudenceLegalAuthoritySchema,
  authorityEvidence: nullableText(1, 1_000),
  authorityVerifiedAt: z.string().datetime().nullable(),
  validityStatus: jurisprudenceValidityStatusSchema,
  validityEvidence: nullableText(1, 1_000),
}).strict().superRefine((authority, context) => {
  if (authority.legalAuthority !== "unknown" && (!authority.authorityEvidence || !authority.authorityVerifiedAt)) context.addIssue({ code: "custom", path: ["authorityEvidence"], message: "La autoridad jurídica declarada requiere evidencia y verificación." });
  if (authority.validityStatus !== "unknown" && !authority.validityEvidence) context.addIssue({ code: "custom", path: ["validityEvidence"], message: "La vigencia declarada requiere evidencia." });
});

const searchClassificationSchema = z.object({
  normalizedSearchText: z.string().trim().min(1).max(100_000),
  normalizedMatters: z.array(z.string().trim().min(2).max(160)).max(100),
  normalizedBodies: z.array(z.string().trim().min(2).max(300)).max(100),
  jurisdiction: z.string().trim().min(2).max(160),
  tags: z.array(z.string().trim().min(2).max(120)).max(100),
  editorialRelevance: z.number().int().min(0).max(100),
}).strict();

const internalControlSchema = z.object({
  editorialNotes: z.array(z.string().trim().min(1).max(5_000)).max(100),
  contradictions: z.array(z.object({ code: z.string().trim().min(1).max(100), message: z.string().trim().min(3).max(2_000), severity: z.enum(["warning", "critical"]) }).strict()).max(100),
  generatedContentOnly: z.boolean(),
}).strict();

export const jurisprudenceRecordSchema = z.object({
  id: z.string().trim().min(1).max(160),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).nullable(),
  recordVersion: z.number().int().positive(),
  editorialStatus: jurisprudenceEditorialStatusSchema,
  publicationStatus: jurisprudencePublicationStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  caseNumber: z.string().trim().min(1).max(200),
  resolutionNumber: z.string().trim().min(1).max(200),
  resolutionType: z.string().trim().min(2).max(160),
  institution: canonicalInstitutionSchema,
  issuingBody: z.string().trim().min(2).max(500),
  instanceLevel: z.string().trim().min(2).max(160),
  specialty: z.string().trim().min(2).max(160),
  matter: z.string().trim().min(2).max(200),
  submatter: nullableText(2, 200),
  judicialDistrict: nullableText(2, 200),
  chamberOrCourt: z.string().trim().min(2).max(500),
  rapporteur: nullableText(2, 300),
  issuedAt: z.string().date(),
  officiallyPublishedAt: z.string().date().nullable(),
  officialContent: officialContentSchema,
  editorialContent: editorialContentSchema,
  generatedContent: generatedContentSchema,
  authority: authoritySchema,
  source: canonicalSourceSchema,
  officialFile: canonicalFileSchema.nullable(),
  search: searchClassificationSchema,
  internal: internalControlSchema,
}).strict().superRefine((record, context) => {
  if (new Date(record.updatedAt).getTime() < new Date(record.createdAt).getTime()) context.addIssue({ code: "custom", path: ["updatedAt"], message: "La actualización no puede preceder a la creación." });
  if (record.officialContent.documentAvailability === "official_file_available" && !record.officialFile?.available) context.addIssue({ code: "custom", path: ["officialFile"], message: "La disponibilidad de archivo oficial requiere un archivo verificado." });
  if (record.internal.generatedContentOnly && record.generatedContent.internalDraft === null) context.addIssue({ code: "custom", path: ["internal", "generatedContentOnly"], message: "El indicador de contenido generado requiere un borrador interno identificable." });
});

const normalizeOptionalSearchText = (maximum: number) => z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length === 0 ? undefined : normalized;
}, z.string().min(1).max(maximum).optional());

export const jurisprudenceSearchInputSchema = z.object({
  q: normalizeOptionalSearchText(500),
  expediente: normalizeOptionalSearchText(200),
  resolucion: normalizeOptionalSearchText(200),
  materia: normalizeOptionalSearchText(200),
  submateria: normalizeOptionalSearchText(200),
  organo: normalizeOptionalSearchText(500),
  instancia: normalizeOptionalSearchText(160),
  distritoJudicial: normalizeOptionalSearchText(200),
  tipoResolucion: normalizeOptionalSearchText(160),
  fechaDesde: normalizeOptionalSearchText(10).pipe(z.string().date().optional()),
  fechaHasta: normalizeOptionalSearchText(10).pipe(z.string().date().optional()),
  authority: jurisprudenceLegalAuthoritySchema.optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
  sort: jurisprudenceSearchSortSchema.default("relevance"),
}).strict().superRefine((input, context) => {
  if (input.fechaDesde && input.fechaHasta && input.fechaDesde > input.fechaHasta) context.addIssue({ code: "custom", path: ["fechaHasta"], message: "La fecha final no puede preceder a la inicial." });
});

const publicSourceSchema = z.object({
  name: z.string().min(2),
  url: z.string().url().nullable(),
  documentId: z.string().min(1).nullable(),
  publishedAt: z.string().datetime().nullable(),
}).strict();

export const jurisprudenceSearchItemSchema = z.object({
  id: z.string().min(1),
  slug: z.string().nullable(),
  title: z.string().min(5),
  caseNumber: z.string().min(1),
  resolutionNumber: z.string().min(1),
  resolutionType: z.string().min(2),
  issuingBody: z.string().min(2),
  matter: z.string().min(2),
  issuedAt: z.string().date(),
  summary: z.string().nullable(),
  authority: jurisprudenceLegalAuthoritySchema,
  authorityVerified: z.boolean(),
  documentAvailability: jurisprudenceDocumentAvailabilitySchema,
  source: publicSourceSchema,
  verificationStatus: z.literal("verified"),
}).strict();

export const jurisprudenceDetailSchema = jurisprudenceSearchItemSchema.extend({
  institution: canonicalInstitutionSchema.omit({ officialHomepage: true }),
  instanceLevel: z.string().min(2),
  specialty: z.string().min(2),
  submatter: z.string().nullable(),
  judicialDistrict: z.string().nullable(),
  chamberOrCourt: z.string().min(2),
  rapporteur: z.string().nullable(),
  officiallyPublishedAt: z.string().date().nullable(),
  officialSummary: z.string().nullable(),
  officialFullText: z.string().nullable(),
  editorialSummary: z.string().nullable(),
  publicExcerpt: z.string().nullable(),
  legalIssue: z.string().nullable(),
  mainCriterion: z.string().nullable(),
  relevantGrounds: z.array(z.string()),
  decision: z.string().nullable(),
  citedNorms: z.array(z.string()),
  relatedRecordIds: z.array(z.string()),
  keywords: z.array(z.string()),
  pageCount: z.number().int().positive().nullable(),
  validityStatus: jurisprudenceValidityStatusSchema,
}).strict();

export const jurisprudenceSearchResultSchema = z.object({
  items: z.array(jurisprudenceSearchItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(50),
  totalPages: z.number().int().nonnegative(),
  appliedFilters: jurisprudenceSearchInputSchema.omit({ page: true, pageSize: true, sort: true }),
  sort: jurisprudenceSearchSortSchema,
  dataStatus: jurisprudenceSearchDataStatusSchema,
  generatedAt: z.string().datetime(),
}).strict().superRefine((result, context) => {
  if (result.totalPages !== (result.total === 0 ? 0 : Math.ceil(result.total / result.pageSize))) context.addIssue({ code: "custom", path: ["totalPages"], message: "El total de páginas debe corresponder al total y al tamaño de página." });
});
