import "server-only";
import { getComplaintsAdminDatabase } from "@/database/client";
import { createComplaintsAdminPersistenceAdapter } from "@/database/adapters/complaints-postgres.adapter";
import { createComplaintsAdminRepository } from "@/database/repositories/complaints.repository";
import { buildProviderResponsePlan } from "./provider-response.builder";
import {
  ComplaintPersistenceError,
  SanitizedDatabaseConstraintError,
} from "@/database/repositories/complaints.errors";
import { ComplaintsServiceUnavailableError } from "./complaints-errors";
import type { ProviderResponseErrorCode } from "./provider-response";

/**
 * Alias exportado del tipo de error de dominio.
 * B5C importará desde aquí — no necesita conocer provider-response.ts directamente.
 */
export type ProviderResponseDomainErrorCode = ProviderResponseErrorCode;

/**
 * Boundary de confianza administrativo.
 *
 * Este tipo es un TRUST BOUNDARY arquitectónico, no una garantía runtime
 * de autenticidad. B5A lo define como contrato. B5B será responsable de
 * producir instancias de este tipo desde una identidad verificada.
 *
 * "authenticated_session": sesión administrativa verificada por B5B (mecanismo por definir).
 * "service_context": contexto controlado interno — scripts, tests, integraciones.
 *
 * GARANTÍA ESTRUCTURAL:
 * ProviderResponseRuntimeInput NO tiene operatorId.
 * El único camino hacia el runtime es TrustedAdminPrincipal.
 */
export interface TrustedAdminPrincipal {
  readonly operatorId: string;
  readonly identitySource: "authenticated_session" | "service_context";
}

/**
 * Input del runtime de respuesta administrativa.
 *
 * operatorId está AUSENTE de este tipo de forma intencional y estructural.
 * Proviene exclusivamente de TrustedAdminPrincipal.
 */
export interface ProviderResponseRuntimeInput {
  readonly complaintId: string;
  readonly expectedCurrentStatus: "under_review" | "awaiting_information";
  readonly responseChannel: "email";
  readonly responderName: string;
  readonly responderRole: string;
  readonly responseText?: string;
  readonly actionsTaken?: string;
}

export type ProviderResponseRuntimeResult =
  | { readonly kind: "success" }
  | { readonly kind: "complaint_not_found" }
  | { readonly kind: "complaint_stale_status" }
  | { readonly kind: "complaint_initial_response_already_exists" }
  | { readonly kind: "complaint_domain_error"; readonly code: ProviderResponseDomainErrorCode };

export async function submitProviderResponseRuntime(
  input: ProviderResponseRuntimeInput,
  principal: TrustedAdminPrincipal,
): Promise<ProviderResponseRuntimeResult> {

  // Reloj único por invocación:
  // - buildProviderResponsePlan usa now para respondedAt (ISO string)
  // - repository clock usa now para updatedAt de la complaint
  // Misma referencia temporal lógica para coherencia.
  const now = new Date();

  const planInput = {
    complaintId: input.complaintId,
    currentStatus: input.expectedCurrentStatus,
    operatorId: principal.operatorId,
    responseChannel: input.responseChannel,
    responderName: input.responderName,
    responderRole: input.responderRole,
    ...(input.responseText !== undefined && { responseText: input.responseText }),
    ...(input.actionsTaken !== undefined && { actionsTaken: input.actionsTaken }),
  };

  // 1. Validar y normalizar a través del dominio
  const planResult = buildProviderResponsePlan(planInput, now);

  if (!planResult.ok) {
    // Preservar el código semántico del error de dominio.
    // El campo message del error de dominio no sale del runtime.
    return { kind: "complaint_domain_error", code: planResult.error.code };
  }

  // 2. Instanciar cadena de persistencia.
  // getComplaintsAdminDatabase() puede lanzar si DATABASE_ADMIN_URL es inválida.
  // Ese error NO se captura aquí: es un fallo de configuración de servidor
  // que debe propagarse como error de arranque — no como ServiceUnavailable.
  // Patrón idéntico a submitComplaintRuntime (complaints-runtime.ts:31-33).
  const db = getComplaintsAdminDatabase();
  const adapter = createComplaintsAdminPersistenceAdapter(db);
  const repo = createComplaintsAdminRepository(adapter, { now: () => now });

  // 3. Persistir — solo errores de persistencia se convierten a ServiceUnavailable.
  try {
    const result = await repo.issueInitialProviderResponse({
      complaintId: input.complaintId,
      expectedCurrentStatus: input.expectedCurrentStatus,
      responseText: planResult.plan.responseInsert.responseText,
      actionsTaken: planResult.plan.responseInsert.actionsTaken,
      respondedAt: new Date(planResult.plan.responseInsert.respondedAt),
      responseChannel: planResult.plan.responseInsert.responseChannel,
      responderName: planResult.plan.responseInsert.responderName,
      responderRole: planResult.plan.responseInsert.responderRole,
      operatorId: principal.operatorId,
    });

    // Guard defensivo: el repo retorna complaint_response_invalid_status si
    // expectedCurrentStatus no es under_review/awaiting_information. Esto
    // no puede ocurrir si el builder ya lo validó, pero el tipo lo permite.
    if (result.kind === "complaint_response_invalid_status") {
      return { kind: "complaint_domain_error", code: "complaint_response_invalid_status" };
    }

    return result;
  } catch (error) {
    if (
      error instanceof ComplaintPersistenceError ||
      error instanceof SanitizedDatabaseConstraintError
    ) {
      throw new ComplaintsServiceUnavailableError("complaints_admin_persistence_failed");
    }
    throw error;
  }
}

export interface StartComplaintReviewRuntimeInput {
  readonly complaintId: string;
  readonly expectedCurrentStatus: "received";
}

export type StartComplaintReviewRuntimeResult =
  | { readonly kind: "success" }
  | { readonly kind: "complaint_not_found" }
  | { readonly kind: "complaint_stale_status" };

export async function startComplaintReviewRuntime(
  input: StartComplaintReviewRuntimeInput,
  principal: TrustedAdminPrincipal,
): Promise<StartComplaintReviewRuntimeResult> {
  const db = getComplaintsAdminDatabase();
  const adapter = createComplaintsAdminPersistenceAdapter(db);
  const now = new Date();
  const repo = createComplaintsAdminRepository(adapter, { now: () => now });

  try {
    const result = await repo.startComplaintReview({
      complaintId: input.complaintId,
      expectedCurrentStatus: input.expectedCurrentStatus,
      operatorId: principal.operatorId,
    });
    return result;
  } catch (error) {
    if (
      error instanceof ComplaintPersistenceError ||
      error instanceof SanitizedDatabaseConstraintError
    ) {
      throw new ComplaintsServiceUnavailableError("complaints_admin_persistence_failed");
    }
    throw error;
  }
}

export interface RequestComplaintInformationRuntimeInput {
  readonly complaintId: string;
  readonly expectedCurrentStatus: "under_review";
  readonly requestText: string;
}

export type RequestComplaintInformationRuntimeResult =
  | { readonly kind: "success" }
  | { readonly kind: "complaint_not_found" }
  | { readonly kind: "complaint_stale_status" }
  | { readonly kind: "complaint_open_information_request_exists" }
  | { readonly kind: "complaint_request_information_text_required" }
  | { readonly kind: "complaint_request_information_text_too_long" }
  | { readonly kind: "complaint_information_request_sequence_conflict" };

export async function requestComplaintInformationRuntime(
  input: RequestComplaintInformationRuntimeInput,
  principal: TrustedAdminPrincipal,
): Promise<RequestComplaintInformationRuntimeResult> {
  const requestText = input.requestText.trim();
  if (requestText.length === 0) {
    return { kind: "complaint_request_information_text_required" };
  }
  if (requestText.length > 2000) {
    return { kind: "complaint_request_information_text_too_long" };
  }

  const db = getComplaintsAdminDatabase();
  const adapter = createComplaintsAdminPersistenceAdapter(db);
  const now = new Date();
  const repo = createComplaintsAdminRepository(adapter, { now: () => now });

  try {
    const result = await repo.requestComplaintInformation({
      complaintId: input.complaintId,
      expectedCurrentStatus: input.expectedCurrentStatus,
      requestText: requestText,
      operatorId: principal.operatorId,
    });
    return result;
  } catch (error) {
    if (
      error instanceof ComplaintPersistenceError ||
      error instanceof SanitizedDatabaseConstraintError
    ) {
      throw new ComplaintsServiceUnavailableError("complaints_admin_persistence_failed");
    }
    throw error;
  }
}

export interface ResumeComplaintReviewRuntimeInput {
  readonly complaintId: string;
  readonly expectedCurrentStatus: "awaiting_information";
  readonly returnNote: string;
}

export type ResumeComplaintReviewRuntimeResult =
  | { readonly kind: "success" }
  | { readonly kind: "complaint_not_found" }
  | { readonly kind: "complaint_stale_status" }
  | { readonly kind: "complaint_no_open_information_request" }
  | { readonly kind: "complaint_multiple_open_information_requests" }
  | { readonly kind: "complaint_resume_review_note_required" }
  | { readonly kind: "complaint_resume_review_note_too_long" };

export async function resumeComplaintReviewRuntime(
  input: ResumeComplaintReviewRuntimeInput,
  principal: TrustedAdminPrincipal,
): Promise<ResumeComplaintReviewRuntimeResult> {
  const returnNote = input.returnNote.trim();
  if (returnNote.length === 0) {
    return { kind: "complaint_resume_review_note_required" };
  }
  if (returnNote.length > 2000) {
    return { kind: "complaint_resume_review_note_too_long" };
  }

  const db = getComplaintsAdminDatabase();
  const adapter = createComplaintsAdminPersistenceAdapter(db);
  const now = new Date();
  const repo = createComplaintsAdminRepository(adapter, { now: () => now });

  try {
    const result = await repo.resumeComplaintReview({
      complaintId: input.complaintId,
      expectedCurrentStatus: input.expectedCurrentStatus,
      returnNote: returnNote,
      operatorId: principal.operatorId,
    });
    return result;
  } catch (error) {
    if (
      error instanceof ComplaintPersistenceError ||
      error instanceof SanitizedDatabaseConstraintError
    ) {
      throw new ComplaintsServiceUnavailableError("complaints_admin_persistence_failed");
    }
    throw error;
  }
}
