export interface JurisprudenceInterpretationSource {
  readonly recordId: string;
  readonly recordVersion: number;
  readonly caseNumber: string;
  readonly resolutionNumber: string | null;
  readonly institutionName: string;
  readonly issuingBody: string;
  readonly issuedAt: string;
  readonly fullText: string;
}

export interface JurisprudenceInterpretationSourcePort {
  findById(id: string): Promise<JurisprudenceInterpretationSource | null>;
}
