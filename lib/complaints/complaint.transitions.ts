import { ComplaintStatus } from "./complaint.types";

const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  received: ["under_review"],
  under_review: ["awaiting_information", "answered"],
  awaiting_information: ["under_review", "answered"],
  answered: ["closed"],
  closed: [],
};

export function canTransitionComplaintStatus(from: ComplaintStatus, to: ComplaintStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAllowedTransitions(from: ComplaintStatus): ComplaintStatus[] {
  return ALLOWED_TRANSITIONS[from] || [];
}
