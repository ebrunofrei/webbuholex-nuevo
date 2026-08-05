import "server-only";
import { JurisprudenceLocalRecord } from "@/types/jurisprudence-local-catalog";

export function isJurisprudenceRecordPubliclyEligible(record: JurisprudenceLocalRecord): boolean {
  return (
    record.isPublic === true &&
    record.approvedForPublication === true &&
    record.privacyReviewStatus === "approved"
  );
}
