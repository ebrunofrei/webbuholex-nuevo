import { ComplaintStatus } from "./complaint.types";
import { COMPLAINT_RESPONSE_CHANNELS } from "./complaint.constants";

export type ProviderResponseChannel = (typeof COMPLAINT_RESPONSE_CHANNELS)[number];

export interface ProviderResponseIssueInput {
  complaintId: string;
  currentStatus: ComplaintStatus;
  operatorId: string;
  responseChannel: ProviderResponseChannel;
  responderName: string;
  responderRole: string;
  responseText?: string;
  actionsTaken?: string;
}

export interface NormalizedProviderResponseInput {
  complaintId: string;
  currentStatus: ComplaintStatus;
  operatorId: string;
  responseChannel: ProviderResponseChannel;
  responderName: string;
  responderRole: string;
  responseText: string | undefined;
  actionsTaken: string | undefined;
}

export type ProviderResponseErrorCode =
  | "complaint_response_invalid_status"
  | "complaint_response_text_required"
  | "complaint_response_text_too_long"
  | "complaint_response_channel_invalid"
  | "complaint_response_responder_required"
  | "complaint_response_actions_too_long";

export interface ProviderResponseDomainError {
  code: ProviderResponseErrorCode;
  message: string;
}

export interface ProviderResponseInsertIntent {
  complaintId: string;
  responseText: string;
  actionsTaken: string | null;
  responseChannel: ProviderResponseChannel;
  responderName: string;
  responderRole: string;
  respondedAt: string;
  isInitialResponse: true;
}

export interface ProviderResponseStatusTransitionIntent {
  complaintId: string;
  fromStatus: ComplaintStatus;
  toStatus: "answered";
  changedAt: string;
}

export interface ProviderResponseStatusHistoryIntent {
  complaintId: string;
  fromStatus: ComplaintStatus;
  toStatus: "answered";
  changedAt: string;
  changedBy: string;
}

export interface ProviderResponseAuditIntent {
  complaintId: string;
  eventType: "response_created";
  metadata: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
}

export interface ProviderResponseOutboxIntent {
  complaintId: string;
  eventType: "complaint_response_delivery_requested";
  payload: Record<string, unknown>;
}

export interface ProviderResponseIssuePlan {
  responseInsert: ProviderResponseInsertIntent;
  statusTransition: ProviderResponseStatusTransitionIntent;
  statusHistory: ProviderResponseStatusHistoryIntent;
  auditEvent: ProviderResponseAuditIntent;
  outboxEvent: ProviderResponseOutboxIntent;
}

export type BuildProviderResponseResult =
  | { ok: true; plan: ProviderResponseIssuePlan }
  | { ok: false; error: ProviderResponseDomainError };
