import { jurisprudenceExternalIdentitySchema } from "@/lib/schemas/jurisprudence-repository";
import type { JurisprudenceRecord } from "@/types/jurisprudence";
import type {
  JurisprudenceExternalIdentity,
  JurisprudenceIdentityComparison,
  NormalizedJurisprudenceExternalIdentity,
} from "@/types/jurisprudence-repository";

function normalizeIdentityText(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleUpperCase("es-PE");
}

export function getJurisprudenceExternalIdentity(record: JurisprudenceRecord): JurisprudenceExternalIdentity {
  return {
    sourceType: record.source.type,
    sourceDocumentId: record.source.documentId,
    caseNumber: record.caseNumber,
    resolutionNumber: record.resolutionNumber,
    institutionId: record.institution.id,
    issuedAt: record.issuedAt,
  };
}

export function normalizeJurisprudenceExternalIdentity(identity: JurisprudenceExternalIdentity): NormalizedJurisprudenceExternalIdentity {
  const parsed = jurisprudenceExternalIdentitySchema.parse(identity);
  return {
    sourceType: parsed.sourceType,
    sourceDocumentId: parsed.sourceDocumentId === null ? null : normalizeIdentityText(parsed.sourceDocumentId),
    caseNumber: normalizeIdentityText(parsed.caseNumber),
    resolutionNumber: normalizeIdentityText(parsed.resolutionNumber),
    institutionId: normalizeIdentityText(parsed.institutionId),
    issuedAt: parsed.issuedAt,
  };
}

function explainablePart(label: string, value: string | null): string {
  return `${label}=${encodeURIComponent(value ?? "-")}`;
}

export function buildJurisprudenceDeduplicationKey(identity: JurisprudenceExternalIdentity): string {
  const normalized = normalizeJurisprudenceExternalIdentity(identity);
  return [
    explainablePart("source", normalized.sourceType),
    explainablePart("document", normalized.sourceDocumentId),
    explainablePart("institution", normalized.institutionId),
    explainablePart("case", normalized.caseNumber),
    explainablePart("resolution", normalized.resolutionNumber),
    explainablePart("issued", normalized.issuedAt),
  ].join("|");
}

export function compareJurisprudenceIdentity(left: JurisprudenceExternalIdentity, right: JurisprudenceExternalIdentity): JurisprudenceIdentityComparison {
  const normalizedLeft = normalizeJurisprudenceExternalIdentity(left);
  const normalizedRight = normalizeJurisprudenceExternalIdentity(right);
  if (buildJurisprudenceDeduplicationKey(left) === buildJurisprudenceDeduplicationKey(right)) return { relation: "exact", reasons: ["Las identidades externas normalizadas coinciden en todos sus componentes."] };

  const sameOfficialDocument = normalizedLeft.sourceType === normalizedRight.sourceType
    && normalizedLeft.sourceDocumentId !== null
    && normalizedLeft.sourceDocumentId === normalizedRight.sourceDocumentId;
  const sameLegalNumbers = normalizedLeft.institutionId === normalizedRight.institutionId
    && normalizedLeft.caseNumber === normalizedRight.caseNumber
    && normalizedLeft.resolutionNumber === normalizedRight.resolutionNumber;

  if (sameOfficialDocument || sameLegalNumbers) {
    const reasons = [
      ...(sameOfficialDocument ? ["Coincide el identificador documental dentro del mismo tipo de fuente."] : []),
      ...(sameLegalNumbers ? ["Coinciden institución, expediente y resolución, pero existe otra diferencia verificable."] : []),
    ];
    return { relation: "possible_collision", reasons };
  }
  return { relation: "different", reasons: ["La identidad externa verificable no coincide."] };
}
