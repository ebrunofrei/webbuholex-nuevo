import "server-only";
import { z } from "zod";
import { getWorkspaceSession } from "@/lib/auth/session";
import { resolveTrustedAdminPrincipal, type ResolveTrustedAdminPrincipalResult } from "@/lib/authorization/authorization-resolver";
import { getAuthorizationDatabase } from "@/database/client";
import { createAuthorizationRepository } from "@/database/repositories/authorization.repository";
import { submitProviderResponseRuntime, resumeComplaintReviewRuntime, closeComplaintRuntime, type ProviderResponseRuntimeInput, type ProviderResponseRuntimeResult, type TrustedAdminPrincipal, type ResumeComplaintReviewRuntimeInput, type ResumeComplaintReviewRuntimeResult, type CloseComplaintRuntimeInput, type CloseComplaintRuntimeResult } from "./complaints-admin-runtime";

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

export const ResumeComplaintReviewHttpSchema = z.object({
  expectedCurrentStatus: z.literal("awaiting_information"),
  returnNote: z.string().trim().min(1).max(2000),
}).strict();

export type ResumeComplaintReviewHttpPayload = z.infer<typeof ResumeComplaintReviewHttpSchema>;

export async function authorizeAdminComplaintResumeReview(): Promise<ResolveTrustedAdminPrincipalResult> {
  const session = await getWorkspaceSession();
  const db = getAuthorizationDatabase();
  const repository = createAuthorizationRepository(db);

  return resolveTrustedAdminPrincipal(session, "complaints:review", repository);
}

export async function executeAdminComplaintResumeReview(
  complaintId: string,
  payload: ResumeComplaintReviewHttpPayload,
  principal: TrustedAdminPrincipal
): Promise<ResumeComplaintReviewRuntimeResult> {
  const runtimeInput: ResumeComplaintReviewRuntimeInput = {
    complaintId,
    expectedCurrentStatus: payload.expectedCurrentStatus,
    returnNote: payload.returnNote,
  };

  return resumeComplaintReviewRuntime(runtimeInput, principal);
}

export const CloseComplaintHttpSchema = z.object({
  expectedCurrentStatus: z.literal("answered"),
}).strict();

export type CloseComplaintHttpPayload = z.infer<typeof CloseComplaintHttpSchema>;

export async function authorizeAdminComplaintClose(): Promise<ResolveTrustedAdminPrincipalResult> {
  const session = await getWorkspaceSession();
  const db = getAuthorizationDatabase();
  const repository = createAuthorizationRepository(db);

  return resolveTrustedAdminPrincipal(session, "complaints:review", repository);
}

export async function executeAdminComplaintClose(
  complaintId: string,
  payload: CloseComplaintHttpPayload,
  principal: TrustedAdminPrincipal
): Promise<CloseComplaintRuntimeResult> {
  const runtimeInput: CloseComplaintRuntimeInput = {
    complaintId,
    expectedCurrentStatus: payload.expectedCurrentStatus,
  };

  return closeComplaintRuntime(runtimeInput, principal);
}
