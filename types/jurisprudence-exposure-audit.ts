import type { JurisprudencePublicReadModel, JurisprudencePublicExposureBlocker } from "@/types/jurisprudence-public-exposure";
import type { JurisprudencePublicSearchItem } from "@/types/jurisprudence-public-search-gateway";

export type JurisprudenceExposureAuditStatus = "ready_for_human_review" | "blocked" | "invalid_fixture";

export interface JurisprudenceExposureAuditInput {
  readonly readModel?: Partial<JurisprudencePublicReadModel> | null;
  readonly originalBlockers?: readonly JurisprudencePublicExposureBlocker[];
  readonly activationAuthorized?: boolean;
  readonly checkedAt?: string;
}

export interface JurisprudenceExposureAuditResult {
  readonly status: JurisprudenceExposureAuditStatus;
  readonly simulated: true;
  readonly publicProjection: JurisprudencePublicSearchItem | null;
  readonly includedFields: readonly string[];
  readonly excludedFields: readonly string[];
  readonly blockers: readonly string[];
  readonly readiness: {
    readonly isReady: boolean;
    readonly checkedAt: string;
  };
  readonly warnings: readonly string[];
}
