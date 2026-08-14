import "server-only";
import { z } from "zod";
import { getWorkspaceSession } from "@/lib/auth/session";
import { resolveTrustedAdminPrincipal, type ResolveTrustedAdminPrincipalResult } from "@/lib/authorization/authorization-resolver";
import { getAuthorizationDatabase } from "@/database/client";
import { createAuthorizationRepository } from "@/database/repositories/authorization.repository";
import { submitProviderResponseRuntime, type ProviderResponseRuntimeInput, type ProviderResponseRuntimeResult, type TrustedAdminPrincipal } from "./complaints-admin-runtime";
import { COMPLAINT_RESPONSE_CHANNELS, COMPLAINT_LIMITS } from "./complaint.constants";

const trimmedString = (max: number) => z.string().trim().min(1).max(max);

export const ProviderResponseHttpSchema = z.object({
  expectedCurrentStatus: z.enum(["under_review", "awaiting_information"]),
  responseChannel: z.enum(COMPLAINT_RESPONSE_CHANNELS),
  responderName: trimmedString(COMPLAINT_LIMITS.firstNames),
  responderRole: trimmedString(COMPLAINT_LIMITS.representativeRole),
  responseText: trimmedString(COMPLAINT_LIMITS.facts).optional(),
  actionsTaken: trimmedString(COMPLAINT_LIMITS.facts).optional(),
}).strict();

export type ProviderResponseHttpPayload = z.infer<typeof ProviderResponseHttpSchema>;

export async function authorizeAdminComplaintResponse(): Promise<ResolveTrustedAdminPrincipalResult> {
  const session = await getWorkspaceSession();
  const db = getAuthorizationDatabase();
  const repository = createAuthorizationRepository(db);

  return resolveTrustedAdminPrincipal(session, "complaints:respond", repository);
}

export async function executeAdminComplaintResponse(
  complaintId: string,
  payload: ProviderResponseHttpPayload,
  principal: TrustedAdminPrincipal
): Promise<ProviderResponseRuntimeResult> {
  const runtimeInput: ProviderResponseRuntimeInput = {
    complaintId,
    expectedCurrentStatus: payload.expectedCurrentStatus,
    responseChannel: payload.responseChannel,
    responderName: payload.responderName,
    responderRole: payload.responderRole,
    ...(payload.responseText !== undefined && {
      responseText: payload.responseText,
    }),
    ...(payload.actionsTaken !== undefined && {
      actionsTaken: payload.actionsTaken,
    }),
  };

  return submitProviderResponseRuntime(runtimeInput, principal);
}

export const StartComplaintReviewHttpSchema = z.object({
  expectedCurrentStatus: z.literal("received")
}).strict();

export type StartComplaintReviewHttpPayload = z.infer<typeof StartComplaintReviewHttpSchema>;

export async function authorizeAdminComplaintReview(): Promise<ResolveTrustedAdminPrincipalResult> {
  const session = await getWorkspaceSession();
  const db = getAuthorizationDatabase();
  const repository = createAuthorizationRepository(db);

  return resolveTrustedAdminPrincipal(session, "complaints:review", repository);
}
