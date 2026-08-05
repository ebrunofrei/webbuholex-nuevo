import { projectReadModelToPublicItem } from "@/lib/jurisprudence-public-search-projection";
import type {
  JurisprudenceExposureAuditInput,
  JurisprudenceExposureAuditResult,
} from "@/types/jurisprudence-exposure-audit";
import type { JurisprudencePublicReadModel } from "@/types/jurisprudence-public-exposure";

const EXCLUDED_FIELDS = [
  "publicRecordId",
  "projectionId",
  "recordId",
  "recordVersion",
  "searchDocumentId",
  "score",
  "matchedBy",
  "normalizedText",
  "normalizedTokens",
  "institutionKey",
  "issuingBodyKey",
  "matterKey",
  "resolutionTypeKey",
  "publicRevision",
  "requestId",
  "actorReference",
  "publicStatus",
  "preparedAt",
  "exposedAt",
  "withdrawnAt",
  "supersededAt",
  "exposedPublicly",
  "indexed",
  "deployed",
  "SQL",
  "stack traces",
  "rutas locales",
  "timestamps internos no autorizados",
  "identificadores de gobernanza o firmas internas"
];

export function createJurisprudenceExposureAuditPreview(
  input: JurisprudenceExposureAuditInput
): JurisprudenceExposureAuditResult {
  const warnings: string[] = [];
  const blockers: string[] = [];

  if (!input || !input.readModel) {
    return Object.freeze({
      status: "invalid_fixture",
      simulated: true,
      publicProjection: null,
      includedFields: [],
      excludedFields: [],
      blockers: Object.freeze(["invalid_fixture"]),
      readiness: Object.freeze({
        isReady: false,
        checkedAt: input?.checkedAt || "1970-01-01T00:00:00.000Z",
      }),
      warnings: Object.freeze(["El fixture es inválido o está ausente."]),
    });
  }

  const model = input.readModel;

  if (!model.slug || !model.title || !model.caseNumber || !model.institutionName) {
    blockers.push("dossier incompleto");
  }

  if (model.publicStatus === "rejected") {
    blockers.push("estado editorial no elegible");
  }

  if (model.publicStatus === "withdrawn" || input.originalBlockers?.includes("internal_projection_withdrawn")) {
    blockers.push("resolución retirada");
  }

  if (model.publicStatus === "superseded" || input.originalBlockers?.includes("internal_projection_superseded")) {
    blockers.push("resolución supersedida");
  }

  if (input.activationAuthorized === false) {
    blockers.push("exposición pública desactivada");
  }

  if (input.originalBlockers) {
    if (input.originalBlockers.includes("authorization_missing")) {
      blockers.push("autorización institucional ausente");
    }
    if (input.originalBlockers.includes("slug_invalid")) {
      blockers.push("slug público inválido");
    }
    if (input.originalBlockers.includes("source_not_publicly_permitted")) {
      blockers.push("fuente documental ausente");
    }
    if (input.originalBlockers.includes("rights_not_cleared") || input.originalBlockers.includes("privacy_not_cleared")) {
      blockers.push("datos sensibles pendientes de revisión");
    }
  }

  let publicProjection = null;
  let includedFields: string[] = [];
  let excludedFields: string[] = [];

  try {
    const fakeModel: JurisprudencePublicReadModel = {
      slug: model.slug || "",
      title: model.title || "",
      caseNumber: model.caseNumber || "",
      resolutionNumber: model.resolutionNumber || "",
      resolutionType: model.resolutionType || "",
      institutionName: model.institutionName || "",
      issuingBody: model.issuingBody || "",
      matter: model.matter || "",
      issuedAt: model.issuedAt || "",
      summary: model.summary || "",
      sourceName: model.sourceName || "",
      sourceDocumentId: model.sourceDocumentId || null,
      ...model
    } as JurisprudencePublicReadModel;

    publicProjection = projectReadModelToPublicItem(fakeModel);

    if (publicProjection) {
      includedFields = Object.keys(publicProjection);
      const modelKeys = Object.keys(model);
      excludedFields = EXCLUDED_FIELDS.filter(f => modelKeys.includes(f));
    } else {
      blockers.push("proyección pública inexistente");
    }
  } catch (error) {
    blockers.push("proyección pública inexistente");
    warnings.push(error instanceof Error ? error.message : "Error de proyección");
  }

  const status = blockers.length > 0 ? "blocked" : "ready_for_human_review";

  return Object.freeze({
    status,
    simulated: true,
    publicProjection: publicProjection ? Object.freeze(publicProjection) : null,
    includedFields: Object.freeze(includedFields),
    excludedFields: Object.freeze(excludedFields),
    blockers: Object.freeze(blockers),
    readiness: Object.freeze({
      isReady: status === "ready_for_human_review",
      checkedAt: input.checkedAt || "1970-01-01T00:00:00.000Z",
    }),
    warnings: Object.freeze(warnings),
  });
}
