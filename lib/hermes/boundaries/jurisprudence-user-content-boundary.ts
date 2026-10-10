import type { HermesUserMessage } from "../contracts/hermes-messages";
import type { JurisprudenceInterpretationSource } from "../../domain/repositories/jurisprudence-interpretation-source-port";

export function buildJurisprudenceUserMessage(source: JurisprudenceInterpretationSource): HermesUserMessage {
  const envelope = {
    trustedJurisprudenceMetadata: {
      recordId: source.recordId,
      recordVersion: source.recordVersion,
      caseNumber: source.caseNumber,
      resolutionNumber: source.resolutionNumber,
      institutionName: source.institutionName,
      issuingBody: source.issuingBody,
      issuedAt: source.issuedAt
    },
    untrustedSourceDocument: {
      text: source.fullText
    }
  };

  return {
    role: "user",
    content: JSON.stringify(envelope, null, 2),
    classification: "USER_PROVIDED_LEGAL_TEXT"
  };
}
