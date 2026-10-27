import fs from "node:fs";
import crypto from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { z } from "zod";
import * as schema from "@/database/schema";
import { PostgresJurisprudenceRepository } from "@/lib/jurisprudence/postgres-jurisprudence-repository";
import { createJurisprudenceInternalApi } from "@/lib/jurisprudence-application-factory";
import { jurisprudenceNewRecordSchema } from "@/lib/schemas/jurisprudence-repository";
import {
  canonicalInstitutionSchema,
  jurisprudenceLegalAuthoritySchema,
  jurisprudenceResolutionCategorySchema,
  jurisprudenceValidityStatusSchema,
} from "@/lib/schemas/jurisprudence";
import type { JurisprudenceNewRecord } from "@/types/jurisprudence-repository";
import type { JurisprudenceApplicationContext, JurisprudenceInternalApi } from "@/types/jurisprudence-application";
import {
  validateAndExtractPdfSourceDocument,
  type ExtractedSourceDocument,
} from "@/lib/jurisprudence/pdf-text-extractor";

export const JURISPRUDENCE_PRODUCTION_TARGET = Object.freeze({
  projectRef: "znsotcbeawjaigowlzsx",
  host: "aws-0-sa-east-1.pooler.supabase.com",
  port: "6543",
  database: "postgres",
  expectedLoginPrefix: "jurisprudence_internal_write_login",
});

export const JURISPRUDENCE_PRODUCTION_CONFIRM_TOKEN =
  "I_AM_SURE_I_WANT_TO_INGEST_PRODUCTION_JURISPRUDENCE";

export interface ValidatedEnvironment {
  readonly writeUrl: string;
  readonly projectRef: string;
  readonly host: string;
  readonly port: string;
  readonly database: string;
}

export function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateProductionEnvironment(
  env: Record<string, string | undefined>,
  options: { dryRun?: boolean | undefined } = {}
): ValidatedEnvironment {
  if (
    env.JURISPRUDENCE_STAGING_PROJECT_REF !== undefined ||
    env.COMPLAINTS_STAGING_PROJECT_REF !== undefined ||
    env.STAGING_PROJECT_REF !== undefined ||
    (env.DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL !== undefined &&
      env.DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL.includes("eyaxxyacysfawlsallic"))
  ) {
    throw new Error("jurisprudence_production_target_unverified: staging target detected");
  }

  const writeUrl = env.DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL;
  if (!writeUrl) {
    if (options.dryRun) {
      return {
        writeUrl: `postgresql://${JURISPRUDENCE_PRODUCTION_TARGET.expectedLoginPrefix}.${JURISPRUDENCE_PRODUCTION_TARGET.projectRef}:dryrun@${JURISPRUDENCE_PRODUCTION_TARGET.host}:${JURISPRUDENCE_PRODUCTION_TARGET.port}/${JURISPRUDENCE_PRODUCTION_TARGET.database}?sslmode=require&prepare=false`,
        projectRef: JURISPRUDENCE_PRODUCTION_TARGET.projectRef,
        host: JURISPRUDENCE_PRODUCTION_TARGET.host,
        port: JURISPRUDENCE_PRODUCTION_TARGET.port,
        database: JURISPRUDENCE_PRODUCTION_TARGET.database,
      };
    }
    throw new Error("jurisprudence_production_target_unverified: missing DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(writeUrl);
  } catch {
    throw new Error("jurisprudence_production_target_unverified: malformed DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL");
  }

  if (parsedUrl.protocol !== "postgresql:" && parsedUrl.protocol !== "postgres:") {
    throw new Error("jurisprudence_production_target_unverified: invalid protocol, postgresql: required");
  }

  if (parsedUrl.hostname !== JURISPRUDENCE_PRODUCTION_TARGET.host) {
    throw new Error(
      `jurisprudence_production_target_unverified: unexpected host ${parsedUrl.hostname} (expected ${JURISPRUDENCE_PRODUCTION_TARGET.host})`
    );
  }

  const expectedUsername = `${JURISPRUDENCE_PRODUCTION_TARGET.expectedLoginPrefix}.${JURISPRUDENCE_PRODUCTION_TARGET.projectRef}`;
  const user = decodeURIComponent(parsedUrl.username);
  if (user !== expectedUsername) {
    if (!user.startsWith(JURISPRUDENCE_PRODUCTION_TARGET.expectedLoginPrefix)) {
      throw new Error("jurisprudence_production_target_unverified: username does not use internal write login");
    }
    if (!user.endsWith(`.${JURISPRUDENCE_PRODUCTION_TARGET.projectRef}`)) {
      throw new Error("jurisprudence_production_target_unverified: username does not contain production project ref");
    }
    throw new Error(
      `jurisprudence_production_target_unverified: unexpected username ${user} (expected exact match: ${expectedUsername})`
    );
  }

  const port = parsedUrl.port || "default";
  if (port !== JURISPRUDENCE_PRODUCTION_TARGET.port) {
    throw new Error(
      `jurisprudence_production_target_unverified: unexpected port ${port} (expected Transaction Pooler port ${JURISPRUDENCE_PRODUCTION_TARGET.port})`
    );
  }

  const dbName = parsedUrl.pathname.replace(/^\//, "");
  if (dbName !== JURISPRUDENCE_PRODUCTION_TARGET.database) {
    throw new Error("jurisprudence_production_target_unverified: unexpected database name");
  }

  const prepareParam = parsedUrl.searchParams.get("prepare");
  if (prepareParam !== "false") {
    throw new Error("jurisprudence_production_target_unverified: prepare=false required for transaction pooler connection");
  }

  const confirm = env.JURISPRUDENCE_PRODUCTION_CONFIRM;
  if (!options.dryRun && confirm !== JURISPRUDENCE_PRODUCTION_CONFIRM_TOKEN) {
    throw new Error("jurisprudence_production_confirmation_required: missing or invalid JURISPRUDENCE_PRODUCTION_CONFIRM");
  }

  return {
    writeUrl,
    projectRef: JURISPRUDENCE_PRODUCTION_TARGET.projectRef,
    host: JURISPRUDENCE_PRODUCTION_TARGET.host,
    port: JURISPRUDENCE_PRODUCTION_TARGET.port,
    database: JURISPRUDENCE_PRODUCTION_TARGET.database,
  };
}

export interface CanonicalMappingOptions {
  readonly sourceDocument?: ExtractedSourceDocument | undefined;
}

/**
 * Maps incoming record JSON to a strict JurisprudenceNewRecord.
 *
 * Safety Invariants:
 * - editorialStatus is ALWAYS "draft"
 * - publicationStatus is ALWAYS "private"
 * - publicationAllowed is ALWAYS false
 * - No legal authority inference from court name or text heuristics
 * - No resolution category inference from institution.kind
 * - Reconciles sourceDocument SHA-256 and full text if provided, regardless of direct parse
 */
export function mapPilotRecordToCanonicalNewRecord(
  raw: unknown,
  options?: CanonicalMappingOptions | undefined
): JurisprudenceNewRecord {
  if (!isUnknownRecord(raw)) {
    throw new Error("jurisprudence_source_malformed: expected JSON object");
  }

  if ("publicationStatus" in raw && raw.publicationStatus !== "private") {
    throw new Error('jurisprudence_ingest_safety_violation: ingested record must have publicationStatus="private"');
  }

  const directParse = jurisprudenceNewRecordSchema.safeParse(raw);
  if (directParse.success) {
    if (directParse.data.editorialStatus !== "draft" || directParse.data.publicationStatus !== "private") {
      throw new Error('jurisprudence_ingest_safety_violation: ingested record must have editorialStatus="draft" and publicationStatus="private"');
    }

    if (options?.sourceDocument) {
      const sourceDoc = options.sourceDocument;
      if (
        directParse.data.source.checksum &&
        directParse.data.source.checksum.toLowerCase() !== sourceDoc.sha256.toLowerCase()
      ) {
        throw new Error(
          `jurisprudence_source_document_checksum_mismatch: computed SHA-256 (${sourceDoc.sha256}) does not match record source checksum (${directParse.data.source.checksum})`
        );
      }

      const reconciledCandidate: JurisprudenceNewRecord = {
        ...directParse.data,
        editorialStatus: "draft",
        publicationStatus: "private",
        officialContent: {
          ...directParse.data.officialContent,
          officialFullText: sourceDoc.officialFullText,
          fullTextAvailable: true,
          publicationAllowed: false, // Invariant: MUST REMAIN FALSE DURING INGESTION
          documentAvailability: "full_text_available",
          originFormat: "pdf",
          pageCount: sourceDoc.pageCount,
        },
        source: {
          ...directParse.data.source,
          checksum: sourceDoc.sha256,
          documentId: sourceDoc.sha256.toUpperCase(),
        },
      };

      const reParse = jurisprudenceNewRecordSchema.safeParse(reconciledCandidate);
      if (!reParse.success) {
        const issueMessages = reParse.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        throw new Error(`jurisprudence_source_validation_failed: ${issueMessages}`);
      }
      return reParse.data;
    }

    return directParse.data;
  }

  // Mandatory caseNumber
  const rawCaseNumber = raw.caseNumber;
  if (typeof rawCaseNumber !== "string" || rawCaseNumber.trim().length === 0) {
    throw new Error("jurisprudence_source_validation_failed: missing required caseNumber");
  }
  const caseNumber = rawCaseNumber.trim();

  // Mandatory slug
  const rawSlug = raw.slug;
  if (typeof rawSlug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rawSlug.trim())) {
    throw new Error("jurisprudence_source_validation_failed: missing or invalid slug");
  }
  const slug = rawSlug.trim();

  // Mandatory editorialTitle (min 5 chars per schema)
  const rawTitle = raw.editorialTitle;
  if (typeof rawTitle !== "string" || rawTitle.trim().length < 5) {
    throw new Error("jurisprudence_source_validation_failed: missing required editorialTitle (min 5 chars)");
  }
  const editorialTitle = rawTitle.trim();

  // Mandatory processType / resolutionType (NO FABRICATED DEFAULT)
  const rawProcessType =
    typeof raw.processType === "string" && raw.processType.trim().length >= 2
      ? raw.processType.trim()
      : typeof raw.resolutionType === "string" && raw.resolutionType.trim().length >= 2
        ? raw.resolutionType.trim()
        : null;
  if (!rawProcessType) {
    throw new Error("jurisprudence_source_validation_failed: missing required processType/resolutionType");
  }
  const resolutionType = rawProcessType;

  // Mandatory court / institution (NO FABRICATED DEFAULT)
  const rawCourt =
    typeof raw.court === "string" && raw.court.trim().length >= 2
      ? raw.court.trim()
      : isUnknownRecord(raw.institution) &&
          typeof raw.institution.name === "string" &&
          raw.institution.name.trim().length >= 2
        ? raw.institution.name.trim()
        : null;
  if (!rawCourt) {
    throw new Error("jurisprudence_source_validation_failed: missing required court/institution");
  }

  // Mandatory jurisdiction (NO FABRICATED DEFAULT)
  const rawJurisdiction =
    typeof raw.jurisdiction === "string" && raw.jurisdiction.trim().length >= 2
      ? raw.jurisdiction.trim()
      : isUnknownRecord(raw.institution) &&
          typeof raw.institution.country === "string" &&
          raw.institution.country.trim().length >= 2
        ? raw.institution.country.trim()
        : null;
  if (!rawJurisdiction) {
    throw new Error("jurisprudence_source_validation_failed: missing required jurisdiction");
  }

  // Mandatory chamber / issuingBody (NO FABRICATED DEFAULT)
  const rawChamber =
    typeof raw.chamber === "string" && raw.chamber.trim().length >= 2
      ? raw.chamber.trim()
      : typeof raw.issuingBody === "string" && raw.issuingBody.trim().length >= 2
        ? raw.issuingBody.trim()
        : null;
  if (!rawChamber) {
    throw new Error("jurisprudence_source_validation_failed: missing required chamber/issuingBody");
  }
  const issuingBody = rawChamber;
  const chamberOrCourt = rawChamber;

  // Mandatory decisionDate / issuedAt (YYYY-MM-DD)
  const rawDate =
    typeof raw.decisionDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.decisionDate.trim())
      ? raw.decisionDate.trim()
      : typeof raw.issuedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.issuedAt.trim())
        ? raw.issuedAt.trim()
        : null;
  if (!rawDate) {
    throw new Error("jurisprudence_source_validation_failed: missing required decisionDate/issuedAt (YYYY-MM-DD)");
  }
  const issuedAt = rawDate;

  // Optional publicationDate
  const officiallyPublishedAt =
    typeof raw.publicationDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.publicationDate.trim())
      ? raw.publicationDate.trim()
      : typeof raw.officiallyPublishedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.officiallyPublishedAt.trim())
        ? raw.officiallyPublishedAt.trim()
        : null;

  // Mandatory specialty (NO FABRICATED DEFAULT)
  const rawSpecialty =
    typeof raw.specialty === "string" && raw.specialty.trim().length >= 2
      ? raw.specialty.trim()
      : null;
  if (!rawSpecialty) {
    throw new Error("jurisprudence_source_validation_failed: missing required specialty");
  }
  const specialty = rawSpecialty;

  // Mandatory matter (NO FABRICATED DEFAULT)
  let matter: string | null = null;
  let submatter: string | null = null;
  let allMatters: string[] = [];

  if (Array.isArray(raw.matter)) {
    const stringMatters = raw.matter
      .filter((m): m is string => typeof m === "string" && m.trim().length >= 2)
      .map((m) => m.trim());
    if (stringMatters.length === 0) {
      throw new Error("jurisprudence_source_validation_failed: missing required matter");
    }
    matter = stringMatters[0] ?? null;
    submatter = stringMatters.length > 1 ? (stringMatters[1] ?? null) : null;
    allMatters = stringMatters;
  } else if (typeof raw.matter === "string" && raw.matter.trim().length >= 2) {
    matter = raw.matter.trim();
    allMatters = [matter];
    submatter = typeof raw.submatter === "string" && raw.submatter.trim().length >= 2 ? raw.submatter.trim() : null;
  }

  if (!matter) {
    throw new Error("jurisprudence_source_validation_failed: missing required matter");
  }

  // Mandatory explicit canonical institution object (fail closed, no heuristic fallback)
  if (!isUnknownRecord(raw.institution)) {
    throw new Error(
      "jurisprudence_source_validation_failed: missing required explicit canonical institution object (cannot heuristically manufacture institution)"
    );
  }

  const institutionParse = canonicalInstitutionSchema.safeParse(raw.institution);
  if (!institutionParse.success) {
    const issueMessages = institutionParse.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`jurisprudence_source_validation_failed: invalid explicit institution metadata: ${issueMessages}`);
  }
  const institution = institutionParse.data;

  const instanceLevel =
    typeof raw.instanceLevel === "string" && raw.instanceLevel.trim().length >= 2
      ? raw.instanceLevel.trim()
      : rawCourt;

  // Verification provenance: NO FABRICATED DATES
  const rawVerifiedAt =
    typeof raw.sourceVerifiedAt === "string" && raw.sourceVerifiedAt.trim().length > 0
      ? raw.sourceVerifiedAt.trim()
      : isUnknownRecord(raw.source) && typeof raw.source.verifiedAt === "string" && raw.source.verifiedAt.trim().length > 0
        ? raw.source.verifiedAt.trim()
        : null;

  let verifiedAtIso: string | null = null;
  if (rawVerifiedAt) {
    verifiedAtIso = rawVerifiedAt.includes("T") ? rawVerifiedAt : `${rawVerifiedAt}T00:00:00.000Z`;
  }

  const rawVerificationStatus =
    typeof raw.sourceVerificationStatus === "string"
      ? raw.sourceVerificationStatus.trim()
      : isUnknownRecord(raw.source) && typeof raw.source.verificationStatus === "string"
        ? raw.source.verificationStatus.trim()
        : null;

  const isOfficiallyVerified = rawVerificationStatus === "official_source_verified" || rawVerificationStatus === "verified";

  // If source claims to be verified but has no verification date -> FAIL CLOSED
  if (isOfficiallyVerified && !verifiedAtIso) {
    throw new Error("jurisprudence_source_validation_failed: verified source status requires sourceVerifiedAt date");
  }

  const verificationStatus: "verified" | "unverified" = isOfficiallyVerified && verifiedAtIso ? "verified" : "unverified";

  // Reviewer / Verifier: NO HARDCODED FALLBACK
  const rawReviewer =
    typeof raw.reviewer === "string" && raw.reviewer.trim().length > 0
      ? raw.reviewer.trim()
      : isUnknownRecord(raw.source) && typeof raw.source.verifiedBy === "string" && raw.source.verifiedBy.trim().length > 0
        ? raw.source.verifiedBy.trim()
        : null;
  const verifiedBy: string | null = rawReviewer;

  // Source checksum preservation
  const rawChecksum =
    isUnknownRecord(raw.source) && typeof raw.source.checksum === "string" && /^[a-f0-9]{64}$/i.test(raw.source.checksum.trim())
      ? raw.source.checksum.trim().toLowerCase()
      : typeof raw.checksum === "string" && /^[a-f0-9]{64}$/i.test(raw.checksum.trim())
        ? raw.checksum.trim().toLowerCase()
        : typeof raw.sourceDocumentId === "string" && /^[a-f0-9]{64}$/i.test(raw.sourceDocumentId.trim())
          ? raw.sourceDocumentId.trim().toLowerCase()
          : null;

  const officialHtmlUrl = typeof raw.officialHtmlUrl === "string" ? raw.officialHtmlUrl.trim() : null;
  const officialPdfUrl = typeof raw.officialPdfUrl === "string" ? raw.officialPdfUrl.trim() : null;
  const sourceDocumentId = typeof raw.sourceDocumentId === "string" ? raw.sourceDocumentId.trim() : null;

  // Authority and Validity: NO FABRICATED VALIDITY ASSERTIONS
  const rawValidityStatus =
    isUnknownRecord(raw.authority) && typeof raw.authority.validityStatus === "string"
      ? raw.authority.validityStatus.trim()
      : typeof raw.validityStatus === "string"
        ? raw.validityStatus.trim()
        : null;

  const rawValidityEvidence =
    isUnknownRecord(raw.authority) && typeof raw.authority.validityEvidence === "string"
      ? raw.authority.validityEvidence.trim()
      : typeof raw.validityEvidence === "string"
        ? raw.validityEvidence.trim()
        : null;

  let validityStatus: z.infer<typeof jurisprudenceValidityStatusSchema> = "unknown";
  let validityEvidence: string | null = null;

  if (rawValidityStatus) {
    const parsedValidity = jurisprudenceValidityStatusSchema.safeParse(rawValidityStatus);
    if (parsedValidity.success && parsedValidity.data !== "unknown" && rawValidityEvidence) {
      validityStatus = parsedValidity.data;
      validityEvidence = rawValidityEvidence;
    }
  }

  // Legal Authority: ZERO INFERENCE from court name or text heuristics
  let legalAuthority: z.infer<typeof jurisprudenceLegalAuthoritySchema> = "unknown";
  let authorityEvidence: string | null = null;
  let authorityVerifiedAt: string | null = null;

  if (
    isUnknownRecord(raw.authority) &&
    typeof raw.authority.authorityVerifiedAt === "string" &&
    raw.authority.authorityVerifiedAt.trim().length > 0
  ) {
    const rawAuthVerified = raw.authority.authorityVerifiedAt.trim();
    authorityVerifiedAt = rawAuthVerified.includes("T") ? rawAuthVerified : `${rawAuthVerified}T00:00:00.000Z`;
  }

  if (isUnknownRecord(raw.authority) && "legalAuthority" in raw.authority) {
    const parsedLegalAuthority = jurisprudenceLegalAuthoritySchema.safeParse(raw.authority.legalAuthority);
    if (parsedLegalAuthority.success && parsedLegalAuthority.data !== "unknown") {
      const evidence = typeof raw.authority.authorityEvidence === "string" ? raw.authority.authorityEvidence.trim() : "";
      if (evidence.length >= 3) {
        legalAuthority = parsedLegalAuthority.data;
        authorityEvidence = evidence;
        // Provenance Separation: authorityVerifiedAt must be explicit, NEVER falling back to source verifiedAtIso
        if (!authorityVerifiedAt) {
          throw new Error(
            "jurisprudence_source_validation_failed: non-unknown legalAuthority requires explicit authorityVerifiedAt date"
          );
        }
      }
    }
  }

  // Resolution Category: ZERO INFERENCE from institution.kind
  let resolutionCategory: z.infer<typeof jurisprudenceResolutionCategorySchema> = "other";
  if (isUnknownRecord(raw.authority) && "resolutionCategory" in raw.authority) {
    const parsedResolutionCategory = jurisprudenceResolutionCategorySchema.safeParse(raw.authority.resolutionCategory);
    if (parsedResolutionCategory.success) {
      resolutionCategory = parsedResolutionCategory.data;
    }
  }

  const decisiveGrounds = Array.isArray(raw.decisiveGrounds) ? raw.decisiveGrounds : [];
  const relevantGrounds: string[] = decisiveGrounds
    .map((g) => {
      if (typeof g === "string") return g.trim();
      if (isUnknownRecord(g) && typeof g.ground === "string") return g.ground.trim();
      return "";
    })
    .filter((g) => g.length >= 3);

  const interpretedRules = Array.isArray(raw.interpretedRules) ? raw.interpretedRules : [];
  const citedNorms: string[] = interpretedRules
    .map((r) => {
      if (typeof r === "string") return r.trim();
      if (isUnknownRecord(r) && typeof r.article === "string") return r.article.trim();
      return "";
    })
    .filter((n) => n.length >= 2);

  const citedPrecedents = Array.isArray(raw.citedPrecedents) ? raw.citedPrecedents : [];
  const citedPrecedentIds: string[] = citedPrecedents
    .map((p) => {
      if (typeof p === "string") return p.trim();
      if (isUnknownRecord(p) && typeof p.caseNumber === "string") return p.caseNumber.trim();
      return "";
    })
    .filter((p) => p.length >= 1);

  const rawKeywords = Array.isArray(raw.keywords)
    ? raw.keywords.filter((k): k is string => typeof k === "string").map((k) => k.trim())
    : [];

  const candidate: unknown = {
    slug,
    editorialStatus: "draft",
    publicationStatus: "private",
    caseNumber,
    resolutionNumber: null,
    resolutionType,
    institution,
    issuingBody,
    instanceLevel,
    specialty,
    matter,
    submatter,
    judicialDistrict: null,
    chamberOrCourt,
    rapporteur: null,
    issuedAt,
    officiallyPublishedAt,
    officialContent: options?.sourceDocument
      ? {
          officialSummary: null,
          officialFullText: options.sourceDocument.officialFullText,
          fullTextAvailable: true,
          publicationAllowed: false, // Invariant: MUST REMAIN FALSE DURING INGESTION
          documentAvailability: "full_text_available",
          originFormat: "pdf",
          language: "es-PE",
          pageCount: options.sourceDocument.pageCount,
        }
      : {
          officialSummary: null,
          officialFullText: null,
          fullTextAvailable: false,
          publicationAllowed: false,
          documentAvailability: "metadata_only",
          originFormat: "html",
          language: "es-PE",
          pageCount: null,
        },
    editorialContent: {
      editorialTitle,
      editorialSummary: typeof raw.editorialSummary === "string" ? raw.editorialSummary.trim() : null,
      publicExcerpt: typeof raw.publicCaseTitle === "string" ? raw.publicCaseTitle.trim() : null,
      legalIssue: typeof raw.legalIssue === "string" ? raw.legalIssue.trim() : null,
      mainCriterion: typeof raw.caseSpecificRatio === "string" ? raw.caseSpecificRatio.trim() : null,
      relevantGrounds,
      decision: typeof raw.decision === "string" ? raw.decision.trim() : null,
      citedNorms,
      citedPrecedentIds,
      relatedRecordIds: [],
      keywords: rawKeywords,
    },
    generatedContent: {
      internalDraft: null,
      reviewed: false,
      supportedBySource: false,
    },
    authority: {
      resolutionCategory,
      legalAuthority,
      authorityEvidence,
      authorityVerifiedAt,
      validityStatus,
      validityEvidence,
    },
    source: {
      type: institution.kind === "constitutional_court" ? "constitutional_court" : "official_judiciary",
      name: rawCourt,
      url: officialHtmlUrl,
      officialHtmlUrl,
      officialPdfUrl,
      documentId: options?.sourceDocument ? options.sourceDocument.sha256.toUpperCase() : sourceDocumentId,
      publishedAt: officiallyPublishedAt ? `${officiallyPublishedAt}T00:00:00.000Z` : null,
      retrievedAt: verifiedAtIso,
      checksum: options?.sourceDocument ? options.sourceDocument.sha256 : rawChecksum,
      verificationStatus,
      verifiedAt: verifiedAtIso,
      verifiedBy,
      verificationNotes: typeof raw.publicWarning === "string" ? raw.publicWarning.trim() : null,
      evidenceReference:
        officialPdfUrl ??
        officialHtmlUrl ??
        (options?.sourceDocument ? options.sourceDocument.sha256.toUpperCase() : sourceDocumentId) ??
        "Resolución oficial",
    },
    officialFile: null,
    search: {
      normalizedSearchText: `${caseNumber} ${editorialTitle} ${rawCourt} ${allMatters.join(" ")}`.toLowerCase(),
      normalizedMatters: allMatters.map((m) => m.toLowerCase()),
      normalizedBodies: [rawCourt.toLowerCase(), issuingBody.toLowerCase()],
      jurisdiction: rawJurisdiction,
      tags: rawKeywords.map((k) => k.toLowerCase()),
      editorialRelevance: 90,
    },
    internal: {
      editorialNotes: ["Ingestión canónica controlada H2R"],
      contradictions: [],
      generatedContentOnly: false,
    },
  };

  const parseResult = jurisprudenceNewRecordSchema.safeParse(candidate);
  if (!parseResult.success) {
    const issueMessages = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`jurisprudence_source_validation_failed: ${issueMessages}`);
  }

  return parseResult.data;
}

export interface IngestionOptions {
  readonly filePath?: string | undefined;
  readonly sourceDocumentPath?: string | undefined;
  readonly recordInput?: unknown;
  readonly dryRun?: boolean | undefined;
  readonly env?: Record<string, string | undefined> | undefined;
  readonly customApi?: JurisprudenceInternalApi | undefined;
  readonly operatorId?: string | undefined;
  readonly operatorDisplayName?: string | undefined;
  readonly customPdfExtractor?: ((resolvedPath: string) => {
    readonly pageCount: number;
    readonly pages: readonly {
      readonly pageNumber: number;
      readonly text: string;
      readonly charCount?: number | undefined;
    }[];
    readonly engine?: string | undefined;
  }) | undefined;
}

export interface IngestionResult {
  readonly dryRun: boolean;
  readonly recordId?: string | undefined;
  readonly slug?: string | null | undefined;
  readonly recordVersion?: number | undefined;
  readonly editorialStatus: string;
  readonly publicationStatus: string;
  readonly caseNumber: string;
  readonly sourceFileName?: string | undefined;
  readonly pageCount?: number | null | undefined;
  readonly checksumMatch?: boolean | undefined;
  readonly extractedCharacterCount?: number | undefined;
  readonly fullTextAvailable?: boolean | undefined;
}

export async function ingestJurisprudenceProduction(options: IngestionOptions): Promise<IngestionResult> {
  const env = options.env ?? process.env;
  const isDryRun = options.dryRun === true;

  const target = validateProductionEnvironment(env, { dryRun: isDryRun });

  let sourceDoc: ExtractedSourceDocument | undefined;
  if (options.sourceDocumentPath) {
    sourceDoc = validateAndExtractPdfSourceDocument(options.sourceDocumentPath, {
      customExtractor: options.customPdfExtractor,
    });
  }

  let rawData: unknown;
  if (options.recordInput !== undefined) {
    rawData = options.recordInput;
  } else if (options.filePath) {
    if (!fs.existsSync(options.filePath)) {
      throw new Error(`jurisprudence_source_not_found: file does not exist at ${options.filePath}`);
    }
    const content = fs.readFileSync(options.filePath, "utf8");
    try {
      rawData = JSON.parse(content);
    } catch {
      throw new Error("jurisprudence_source_malformed: file contains invalid JSON");
    }
  } else {
    throw new Error("jurisprudence_source_missing: either filePath or recordInput must be provided");
  }

  // Checksum reconciliation when source document is provided (Section 4 & 5: fail closed)
  if (sourceDoc && isUnknownRecord(rawData)) {
    const rawDocId =
      typeof rawData.sourceDocumentId === "string" && rawData.sourceDocumentId.trim().length > 0
        ? rawData.sourceDocumentId.trim().toLowerCase()
        : isUnknownRecord(rawData.source) && typeof rawData.source.documentId === "string" && rawData.source.documentId.trim().length > 0
          ? rawData.source.documentId.trim().toLowerCase()
          : isUnknownRecord(rawData.source) && typeof rawData.source.checksum === "string" && rawData.source.checksum.trim().length > 0
            ? rawData.source.checksum.trim().toLowerCase()
            : null;

    if (!rawDocId) {
      throw new Error("jurisprudence_source_validation_failed: missing required sourceDocumentId or source.checksum in metadata");
    }

    if (rawDocId !== sourceDoc.sha256) {
      throw new Error(
        `jurisprudence_source_document_checksum_mismatch: computed SHA-256 (${sourceDoc.sha256}) does not match metadata sourceDocumentId (${rawDocId})`
      );
    }
  }

  const canonicalRecord = mapPilotRecordToCanonicalNewRecord(rawData, {
    sourceDocument: sourceDoc,
  });

  if (isDryRun) {
    return {
      dryRun: true,
      editorialStatus: canonicalRecord.editorialStatus,
      publicationStatus: canonicalRecord.publicationStatus,
      caseNumber: canonicalRecord.caseNumber,
      slug: canonicalRecord.slug,
      sourceFileName: sourceDoc?.fileName,
      pageCount: canonicalRecord.officialContent.pageCount,
      checksumMatch: sourceDoc ? true : undefined,
      extractedCharacterCount: sourceDoc?.characterCount,
      fullTextAvailable: canonicalRecord.officialContent.fullTextAvailable,
    };
  }

  let api = options.customApi;
  let sqlClient: ReturnType<typeof postgres> | undefined;

  if (!api) {
    sqlClient = postgres(target.writeUrl, {
      max: 1,
      prepare: false,
      ssl: "require",
      connect_timeout: 10,
    });
    const db = drizzle(sqlClient, { schema });
    const repository = new PostgresJurisprudenceRepository({
      getWriteDatabase: () => db,
      now: () => new Date().toISOString(),
      generateId: () => crypto.randomUUID(),
    });
    api = createJurisprudenceInternalApi({ repository });
  }

  try {
    const operatorId =
      options.operatorId?.trim() ||
      env.JURISPRUDENCE_OPERATOR_ID?.trim() ||
      null;

    const actor = operatorId
      ? {
          kind: "editorial_operator" as const,
          id: operatorId,
          displayName:
            options.operatorDisplayName?.trim() ||
            env.JURISPRUDENCE_OPERATOR_NAME?.trim() ||
            operatorId,
        }
      : {
          kind: "system" as const,
          id: "system_production_ingest_operator",
          displayName: "System Production Ingestion Operator",
        };

    const context: JurisprudenceApplicationContext = {
      requestId: `ingest-prod-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      actor,
      operationSource: "internal_api",
      requestedAt: new Date().toISOString(),
    };

    const idempotencyKey = `ingest-${canonicalRecord.caseNumber}-${canonicalRecord.slug ?? "noslug"}`;

    const result = await api.createRecord({
      context,
      idempotencyKey,
      record: canonicalRecord,
    });

    return {
      dryRun: false,
      recordId: result.id,
      slug: result.slug,
      recordVersion: result.recordVersion,
      editorialStatus: result.editorialStatus,
      publicationStatus: result.publicationStatus,
      caseNumber: canonicalRecord.caseNumber,
      sourceFileName: sourceDoc?.fileName,
      pageCount: canonicalRecord.officialContent.pageCount,
      checksumMatch: sourceDoc ? true : undefined,
      extractedCharacterCount: sourceDoc?.characterCount,
      fullTextAvailable: canonicalRecord.officialContent.fullTextAvailable,
    };
  } finally {
    if (sqlClient) {
      await sqlClient.end();
    }
  }
}
