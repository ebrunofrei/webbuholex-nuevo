import { jurisprudenceRecordSchema, jurisprudenceSearchInputSchema } from "@/lib/schemas/jurisprudence";
import type {
  JurisprudenceDetail,
  JurisprudencePublicationBlocker,
  JurisprudenceRecord,
  JurisprudenceSearchInput,
  JurisprudenceSearchItem,
} from "@/types/jurisprudence";

function hasIdentifiableSource(record: JurisprudenceRecord): boolean {
  return Boolean(record.source.url || record.source.documentId || record.source.evidenceReference);
}

function hasMinimumLegalIdentification(record: JurisprudenceRecord): boolean {
  return [
    record.caseNumber,
    record.resolutionNumber,
    record.resolutionType,
    record.institution.name,
    record.issuingBody,
    record.chamberOrCourt,
    record.specialty,
    record.matter,
    record.issuedAt,
  ].every((value) => value.trim().length > 0);
}

export function getJurisprudencePublicationBlockers(record: JurisprudenceRecord): readonly JurisprudencePublicationBlocker[] {
  const blockers: JurisprudencePublicationBlocker[] = [];
  const add = (blocker: JurisprudencePublicationBlocker) => blockers.push(blocker);

  if (!hasIdentifiableSource(record)) add({ code: "SOURCE_NOT_IDENTIFIABLE", path: "source", message: "El registro requiere una fuente identificable." });
  if (record.source.verificationStatus !== "verified" || record.source.verifiedAt === null) add({ code: "SOURCE_NOT_VERIFIED", path: "source.verificationStatus", message: "La fuente debe estar verificada antes de publicar." });
  if (record.publicationStatus !== "published") add({ code: "PUBLICATION_STATUS_NOT_PUBLISHED", path: "publicationStatus", message: "El estado de publicación debe ser published." });
  if (record.editorialStatus !== "verified") add({ code: "EDITORIAL_STATUS_NOT_VERIFIED", path: "editorialStatus", message: "El registro requiere verificación editorial." });
  if (!hasMinimumLegalIdentification(record)) add({ code: "LEGAL_IDENTIFICATION_INCOMPLETE", path: "caseNumber", message: "La identificación jurídica mínima está incompleta." });
  if (record.internal.contradictions.some((contradiction) => contradiction.severity === "critical")) add({ code: "CRITICAL_CONTRADICTION", path: "internal.contradictions", message: "El registro conserva contradicciones críticas sin resolver." });

  const generatedWithoutSupport = record.internal.generatedContentOnly
    || (record.generatedContent.internalDraft !== null && (!record.generatedContent.reviewed || !record.generatedContent.supportedBySource));
  if (generatedWithoutSupport) add({ code: "GENERATED_CONTENT_WITHOUT_SUPPORT", path: "generatedContent", message: "El contenido generado no puede sustituir una fuente oficial ni una revisión editorial." });

  if (record.officialFile?.available && !record.officialFile.publicAccessAllowed) add({ code: "OFFICIAL_FILE_NOT_AUTHORIZED", path: "officialFile.publicAccessAllowed", message: "Un archivo oficial sin autorización pública impide publicar el registro." });

  return blockers;
}

export function isJurisprudenceRecordPublic(record: JurisprudenceRecord): boolean {
  return jurisprudenceRecordSchema.safeParse(record).success && getJurisprudencePublicationBlockers(record).length === 0;
}

function toPublicSource(record: JurisprudenceRecord) {
  return {
    name: record.source.name,
    url: record.source.url,
    documentId: record.source.documentId,
    publishedAt: record.source.publishedAt,
  };
}

export function toPublicJurisprudenceSearchItem(record: JurisprudenceRecord): JurisprudenceSearchItem | null {
  if (!isJurisprudenceRecordPublic(record)) return null;
  const authorityVerified = record.authority.authorityEvidence !== null && record.authority.authorityVerifiedAt !== null;

  return {
    id: record.id,
    slug: record.slug,
    title: record.editorialContent.editorialTitle,
    caseNumber: record.caseNumber,
    resolutionNumber: record.resolutionNumber,
    resolutionType: record.resolutionType,
    issuingBody: record.issuingBody,
    matter: record.matter,
    issuedAt: record.issuedAt,
    summary: record.editorialContent.publicExcerpt ?? record.editorialContent.editorialSummary ?? record.officialContent.officialSummary,
    authority: authorityVerified ? record.authority.legalAuthority : "unknown",
    authorityVerified,
    documentAvailability: record.officialContent.documentAvailability,
    source: toPublicSource(record),
    verificationStatus: "verified",
  };
}

export function toPublicJurisprudenceDetail(record: JurisprudenceRecord): JurisprudenceDetail | null {
  const item = toPublicJurisprudenceSearchItem(record);
  if (!item) return null;

  return {
    ...item,
    institution: {
      id: record.institution.id,
      name: record.institution.name,
      shortName: record.institution.shortName,
      country: record.institution.country,
      kind: record.institution.kind,
    },
    instanceLevel: record.instanceLevel,
    specialty: record.specialty,
    submatter: record.submatter,
    judicialDistrict: record.judicialDistrict,
    chamberOrCourt: record.chamberOrCourt,
    rapporteur: record.rapporteur,
    officiallyPublishedAt: record.officiallyPublishedAt,
    officialSummary: record.officialContent.officialSummary,
    officialFullText: record.officialContent.publicationAllowed ? record.officialContent.officialFullText : null,
    editorialSummary: record.editorialContent.editorialSummary,
    publicExcerpt: record.editorialContent.publicExcerpt,
    legalIssue: record.editorialContent.legalIssue,
    mainCriterion: record.editorialContent.mainCriterion,
    relevantGrounds: record.editorialContent.relevantGrounds,
    decision: record.editorialContent.decision,
    citedNorms: record.editorialContent.citedNorms,
    relatedRecordIds: record.editorialContent.relatedRecordIds,
    keywords: record.editorialContent.keywords,
    pageCount: record.officialContent.pageCount,
    validityStatus: record.authority.validityStatus,
  };
}

export function normalizeJurisprudenceSearchInput(input: unknown): JurisprudenceSearchInput {
  const parsed = jurisprudenceSearchInputSchema.parse(input);
  return {
    q: parsed.q,
    expediente: parsed.expediente,
    resolucion: parsed.resolucion,
    materia: parsed.materia,
    submateria: parsed.submateria,
    organo: parsed.organo,
    instancia: parsed.instancia,
    distritoJudicial: parsed.distritoJudicial,
    tipoResolucion: parsed.tipoResolucion,
    fechaDesde: parsed.fechaDesde,
    fechaHasta: parsed.fechaHasta,
    authority: parsed.authority,
    page: parsed.page,
    pageSize: parsed.pageSize,
    sort: parsed.sort,
  };
}
