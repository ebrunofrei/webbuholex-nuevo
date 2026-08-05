import type { AssistantCitation, AssistantConfidenceLevel, AssistantSource } from "@/types/assistant";

export interface JurisprudenceDocumentIdentity {
  court: string;
  caseNumber: string;
  decisionDate: string;
  matter: string;
  jurisdiction: string;
}

export interface JurisprudenceOpinion {
  signedBy: string | null;
  type: "majority" | "concurring" | "dissenting";
  summary: string;
}

export interface JurisprudenceAnalysisRequest {
  id: string;
  inputKind: "text" | "document_reference";
  text: string | null;
  documentRef: string | null;
  userCaseSummary: string | null;
  privacyConsent: boolean;
}

export interface JurisprudenceAnalysisResult {
  requestId: string;
  identity: JurisprudenceDocumentIdentity;
  background: readonly string[];
  legalIssue: string;
  grounds: readonly string[];
  ratioDecidendi: readonly string[];
  obiterDicta: readonly string[];
  applicableRules: readonly string[];
  opinions: readonly JurisprudenceOpinion[];
  comparisonWithUserCase: readonly string[];
  applicabilityLimits: readonly string[];
  sources: readonly AssistantSource[];
  citations: readonly AssistantCitation[];
  confidence: AssistantConfidenceLevel;
  unresolvedFields: readonly string[];
}
