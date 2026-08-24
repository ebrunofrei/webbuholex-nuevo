export interface JurisprudencePublicProjectionRecord {
  readonly id: string;
  readonly recordVersion: number;
  readonly slug: string | null;
  readonly title: string;
  readonly caseTitle: string;
  readonly caseNumber: string;
  readonly resolutionNumber: string | null;
  readonly resolutionType: string;
  readonly institutionName: string;
  readonly issuingBody: string;
  readonly matter: string;
  readonly issuedAt: string;
  readonly summary: string | null;
  readonly sourceName: string;
  readonly officialHtmlUrl: string | null;
  readonly officialPdfUrl: string | null;
}

export type PublicProjectionMutationResult = "APPLIED" | "IDEMPOTENT" | "STALE";

export interface JurisprudencePublicProjectionWriter {
  upsert(record: JurisprudencePublicProjectionRecord, executionVersion: number): Promise<PublicProjectionMutationResult>;
  removeById(recordId: string, recordVersion: number, executionVersion: number): Promise<PublicProjectionMutationResult>;
}
