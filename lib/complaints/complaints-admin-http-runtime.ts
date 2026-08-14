import "server-only";
import { z } from "zod";
import { getWorkspaceSession } from "@/lib/auth/session";
import { resolveTrustedAdminPrincipal, type ResolveTrustedAdminPrincipalResult } from "@/lib/authorization/authorization-resolver";
import { getAuthorizationDatabase } from "@/database/client";
import { createAuthorizationRepository } from "@/database/repositories/authorization.repository";
import { submitProviderResponseRuntime, type ProviderResponseRuntimeInput, type ProviderResponseRuntimeResult, type TrustedAdminPrincipal } from "./complaints-admin-runtime";

import { ProviderResponseHttpSchema, type ProviderResponseHttpPayload } from "./provider-response.contract";

export { ProviderResponseHttpSchema, type ProviderResponseHttpPayload };

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

export const RequestInformationHttpSchema = z.object({
  expectedCurrentStatus: z.literal("under_review"),
  requestText: z.string().min(1).max(2000),
}).strict();

export type RequestInformationHttpPayload = z.infer<typeof RequestInformationHttpSchema>;

export async function authorizeAdminComplaintRequestInformation(): Promise<ResolveTrustedAdminPrincipalResult> {
  const session = await getWorkspaceSession();
  const db = getAuthorizationDatabase();
  const repository = createAuthorizationRepository(db);

  return resolveTrustedAdminPrincipal(session, "complaints:review", repository);
}
