import {
  ProviderResponseIssueInput,
  NormalizedProviderResponseInput,
  BuildProviderResponseResult,
  ProviderResponseDomainError
} from "./provider-response";
import { normalizeComplaintText, normalizePersonName } from "./complaint.normalization";
import { COMPLAINT_RESPONSE_CHANNELS, COMPLAINT_LIMITS } from "./complaint.constants";

export function normalizeProviderResponseInput(input: ProviderResponseIssueInput): NormalizedProviderResponseInput {
  return {
    complaintId: input.complaintId,
    currentStatus: input.currentStatus,
    operatorId: input.operatorId,
    responseChannel: input.responseChannel,
    responderName: normalizePersonName(input.responderName),
    responderRole: normalizeComplaintText(input.responderRole),
    responseText: input.responseText ? normalizeComplaintText(input.responseText) : undefined,
    actionsTaken: input.actionsTaken ? normalizeComplaintText(input.actionsTaken) : undefined,
  };
}

export function validateProviderResponseInput(input: NormalizedProviderResponseInput): ProviderResponseDomainError | null {
  if (input.currentStatus !== "under_review" && input.currentStatus !== "awaiting_information") {
    return { code: "complaint_response_invalid_status", message: "La queja debe estar en revisión o esperando información para ser respondida" };
  }

  if (!COMPLAINT_RESPONSE_CHANNELS.includes(input.responseChannel as "email")) {
    return { code: "complaint_response_channel_invalid", message: "Canal de respuesta inválido" };
  }

  if (!input.responderName) {
    return { code: "complaint_response_responder_required", message: "El nombre del responsable es requerido" };
  }

  if (!input.responderRole) {
    return { code: "complaint_response_responder_required", message: "El rol del responsable es requerido" };
  }

  const hasText = input.responseText && input.responseText.length > 0;
  const hasActions = input.actionsTaken && input.actionsTaken.length > 0;

  if (!hasText) {
    return { code: "complaint_response_text_required", message: "Debe ingresar el texto de respuesta" };
  }

  if (hasText && input.responseText!.length > COMPLAINT_LIMITS.facts) {
    return { code: "complaint_response_text_too_long", message: "El texto de respuesta excede el límite permitido" };
  }

  if (hasActions && input.actionsTaken!.length > COMPLAINT_LIMITS.facts) {
    return { code: "complaint_response_actions_too_long", message: "El texto de acciones excede el límite permitido" };
  }

  return null;
}

export function buildProviderResponsePlan(input: ProviderResponseIssueInput, now: Date = new Date()): BuildProviderResponseResult {
  const normalized = normalizeProviderResponseInput(input);
  const error = validateProviderResponseInput(normalized);

  if (error) {
    return { ok: false, error };
  }

  const timestamp = now.toISOString();

  return {
    ok: true,
    plan: {
      responseInsert: {
        complaintId: normalized.complaintId,
        responseText: normalized.responseText as string,
        actionsTaken: normalized.actionsTaken || null,
        responseChannel: normalized.responseChannel,
        responderName: normalized.responderName,
        responderRole: normalized.responderRole,
        respondedAt: timestamp,
        isInitialResponse: true,
      },
      statusTransition: {
        complaintId: normalized.complaintId,
        fromStatus: normalized.currentStatus,
        toStatus: "answered",
        changedAt: timestamp,
      },
      statusHistory: {
        complaintId: normalized.complaintId,
        fromStatus: normalized.currentStatus,
        toStatus: "answered",
        changedAt: timestamp,
        changedBy: normalized.operatorId,
      },
      auditEvent: {
        complaintId: normalized.complaintId,
        eventType: "response_created",
        metadata: {
          responseChannel: normalized.responseChannel,
          isInitialResponse: true,
        },
        createdAt: timestamp,
        createdBy: normalized.operatorId,
      },
      outboxEvent: {
        complaintId: normalized.complaintId,
        eventType: "complaint_response_delivery_requested",
        payload: {
          complaintId: normalized.complaintId,
        },
      }
    }
  };
}
