import type { JurisprudenceProjectionSourceRecord } from "@/types/jurisprudence-publication-execution";

export interface JurisprudencePublicationSourceReaderQuery {
  readonly recordId: string;
  readonly recordVersion: number;
}

export interface JurisprudencePublicationSourceReader {
  getPublicationSource(query: JurisprudencePublicationSourceReaderQuery): Promise<JurisprudenceProjectionSourceRecord | null>;
}
