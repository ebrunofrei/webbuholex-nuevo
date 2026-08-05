export type ProfessionalAttentionType =
  | "legal_orientation"
  | "document_review"
  | "drafting"
  | "case_file_analysis"
  | "video_consultation"
  | "representation_or_defense";

export interface ProfessionalConsultationInput {
  name: string;
  email: string;
  phoneOrWhatsApp: string;
  matter: string;
  jurisdiction: string;
  attentionType: ProfessionalAttentionType;
  urgency: "standard" | "urgent";
  description: string;
  hasDeadline: boolean;
  deadlineDescription: string | null;
  privacyAccepted: boolean;
  contactAuthorized: boolean;
}

export interface ProfessionalConsultation extends ProfessionalConsultationInput {
  id: string;
  status: "requested" | "reviewing" | "scheduled" | "closed";
  createdAt: string;
}
