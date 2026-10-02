import "server-only";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createJurisprudenceAuthenticationRuntime } from "@/lib/jurisprudence/jurisprudence-authentication-runtime";
import {
  hasJurisprudencePermission,
  validateJurisprudencePrincipal,
  isJurisprudencePrincipalExpired
} from "@/lib/jurisprudence-authorization-policy";
import { createJurisprudenceGovernanceRuntime } from "@/lib/jurisprudence/jurisprudence-governance-runtime";
import { JurisprudencePublicationGovernanceError } from "@/lib/jurisprudence-publication-dossier-repository";
import { loadAuthenticationConfiguration } from "@/lib/authentication-configuration";
import { readLimitedJurisprudenceJson } from "@/lib/jurisprudence-http-request";
import {
  registerJurisprudenceSourceCommandSchema,
  bindJurisprudenceSourceCommandSchema,
  openPublicationDossierCommandSchema,
  assessProvenanceCommandSchema,
  assessIntegrityCommandSchema,
  assessRightsCommandSchema,
  assessPrivacyCommandSchema,
  assessPublicProjectionCommandSchema,
  evaluatePublicationDossierCommandSchema,
  synchronizePublicationDossierCommandSchema,
  closePublicationDossierCommandSchema,
} from "@/lib/schemas/jurisprudence-publication-governance";

const MAX_BODY_BYTES = 65536;

export type JurisprudenceGovernanceHttpDependencies = {
  createAuthenticationRuntime?: typeof createJurisprudenceAuthenticationRuntime;
};

export async function handleJurisprudenceGovernanceSourcesPost(
  request: Request,
  dependencies: JurisprudenceGovernanceHttpDependencies = {}
): Promise<NextResponse> {
  const createAuthenticationRuntime =
    dependencies.createAuthenticationRuntime ??
    createJurisprudenceAuthenticationRuntime;

  let authRuntimeInit;
  try {
    authRuntimeInit = createAuthenticationRuntime();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "SERVICE_UNAVAILABLE" } },
      { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
    );
  }

  if (authRuntimeInit.status !== "configured") {
    return NextResponse.json({ success: false, error: { code: "SERVICE_UNAVAILABLE" } }, { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  let principal;
  try {
    const authResult = await authRuntimeInit.runtime.authenticator.authenticate(request);
    if (authResult.status !== "authenticated") {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }
    principal = authResult.principal;
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  } finally {
    try {
      await authRuntimeInit.runtime.close();
    } catch {
      // Swallow
    }
  }

  const evaluatedAt = new Date().toISOString();
  if (!validateJurisprudencePrincipal(principal) || isJurisprudencePrincipalExpired(principal, evaluatedAt)) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  if (principal.kind !== "human" || !principal.subjectId) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  if (!hasJurisprudencePermission(principal, "jurisprudence.internal.create")) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  const origin = request.headers.get("origin");
  if (!origin || origin === "null") {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }
  try {
    const authConfig = loadAuthenticationConfiguration(process.env);
    if (authConfig.status === "configured" || authConfig.status === "configured_for_test") {
      if (!authConfig.allowedOrigins.includes(origin)) {
        return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
    } else {
      return NextResponse.json({ success: false, error: { code: "SERVICE_UNAVAILABLE" } }, { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }
  } catch {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ success: false, error: { code: "UNSUPPORTED_MEDIA_TYPE" } }, { status: 415, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  let payload;
  try {
    payload = await readLimitedJurisprudenceJson(request.clone(), MAX_BODY_BYTES);
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "status" in err && err.status === 413) {
      return NextResponse.json({ success: false, error: { code: "PAYLOAD_TOO_LARGE" } }, { status: 413, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  const parsedBody = registerJurisprudenceSourceCommandSchema.safeParse(payload);
  if (!parsedBody.success) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  let governanceRuntime: ReturnType<typeof createJurisprudenceGovernanceRuntime> | undefined;

  try {
    governanceRuntime = createJurisprudenceGovernanceRuntime();

    // Reconstruir el comando inyectando el context
    const command = {
      ...parsedBody.data,
      context: {
        requestId: randomUUID(),
        actorReference: principal.subjectId,
        requestedAt: evaluatedAt
      }
    };

    const result = await governanceRuntime.service.registerSource(command);

    return NextResponse.json(
      { success: true, data: result },
      { status: 201, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof JurisprudencePublicationGovernanceError) {
      if (error.code === "IDEMPOTENCY_CONFLICT") {
        return NextResponse.json({ success: false, error: { code: "IDEMPOTENCY_CONFLICT" } }, { status: 409, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
      if (error.code === "VALIDATION_ERROR") {
        return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
      return NextResponse.json(
        { success: false, error: { code: "UNPROCESSABLE_ENTITY", reason: error.code } },
        { status: 422, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR" } },
      { status: 500, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
    );
  } finally {
    if (governanceRuntime) {
      try {
        await governanceRuntime.close();
      } catch {
      }
    }
  }
}

export async function handleJurisprudenceGovernanceSourceBindingsPost(
  request: Request,
  dependencies: JurisprudenceGovernanceHttpDependencies = {}
): Promise<NextResponse> {
  const createAuthenticationRuntime =
    dependencies.createAuthenticationRuntime ??
    createJurisprudenceAuthenticationRuntime;

  let authRuntimeInit;
  try {
    authRuntimeInit = createAuthenticationRuntime();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "SERVICE_UNAVAILABLE" } },
      { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
    );
  }

  if (authRuntimeInit.status !== "configured") {
    return NextResponse.json({ success: false, error: { code: "SERVICE_UNAVAILABLE" } }, { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  let principal;
  try {
    const authResult = await authRuntimeInit.runtime.authenticator.authenticate(request);
    if (authResult.status !== "authenticated") {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }
    principal = authResult.principal;
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  } finally {
    try {
      await authRuntimeInit.runtime.close();
    } catch {
      // Swallow
    }
  }

  const evaluatedAt = new Date().toISOString();
  if (!validateJurisprudencePrincipal(principal) || isJurisprudencePrincipalExpired(principal, evaluatedAt)) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  if (principal.kind !== "human" || !principal.subjectId) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  if (!hasJurisprudencePermission(principal, "jurisprudence.internal.create")) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  const origin = request.headers.get("origin");
  if (!origin || origin === "null") {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }
  try {
    const authConfig = loadAuthenticationConfiguration(process.env);
    if (authConfig.status === "configured" || authConfig.status === "configured_for_test") {
      if (!authConfig.allowedOrigins.includes(origin)) {
        return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
    } else {
      return NextResponse.json({ success: false, error: { code: "SERVICE_UNAVAILABLE" } }, { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }
  } catch {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ success: false, error: { code: "UNSUPPORTED_MEDIA_TYPE" } }, { status: 415, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  let payload;
  try {
    payload = await readLimitedJurisprudenceJson(request.clone(), MAX_BODY_BYTES);
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "status" in err && err.status === 413) {
      return NextResponse.json({ success: false, error: { code: "PAYLOAD_TOO_LARGE" } }, { status: 413, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  const parsedBody = bindJurisprudenceSourceCommandSchema.safeParse(payload);
  if (!parsedBody.success) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  let governanceRuntime: ReturnType<typeof createJurisprudenceGovernanceRuntime> | undefined;

  try {
    governanceRuntime = createJurisprudenceGovernanceRuntime();

    const command = {
      ...parsedBody.data,
      context: {
        requestId: randomUUID(),
        actorReference: principal.subjectId,
        requestedAt: evaluatedAt
      }
    };

    const result = await governanceRuntime.service.bindSource(command);

    return NextResponse.json(
      { success: true, data: result },
      { status: 201, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof JurisprudencePublicationGovernanceError) {
      if (error.code === "IDEMPOTENCY_CONFLICT") {
        return NextResponse.json({ success: false, error: { code: "IDEMPOTENCY_CONFLICT" } }, { status: 409, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
      if (error.code === "VALIDATION_ERROR") {
        return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
      if (error.code === "NOT_FOUND") {
        return NextResponse.json({ success: false, error: { code: "NOT_FOUND" } }, { status: 404, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
      if (error.code === "VERSION_CONFLICT") {
        return NextResponse.json({ success: false, error: { code: "VERSION_CONFLICT" } }, { status: 409, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
      if (error.code === "SOURCE_NOT_ELIGIBLE") {
        return NextResponse.json({ success: false, error: { code: "SOURCE_NOT_ELIGIBLE" } }, { status: 422, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
      return NextResponse.json(
        { success: false, error: { code: "UNPROCESSABLE_ENTITY", reason: error.code } },
        { status: 422, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR" } },
      { status: 500, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
    );
  } finally {
    if (governanceRuntime) {
      try {
        await governanceRuntime.close();
      } catch {
      }
    }
  }
}

export async function handleJurisprudenceGovernanceDossierCommandsPost(
  request: Request,
  dependencies: JurisprudenceGovernanceHttpDependencies = {}
): Promise<NextResponse> {
  const createAuthenticationRuntime =
    dependencies.createAuthenticationRuntime ??
    createJurisprudenceAuthenticationRuntime;

  let authRuntimeInit;
  try {
    authRuntimeInit = createAuthenticationRuntime();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "SERVICE_UNAVAILABLE" } },
      { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
    );
  }

  if (authRuntimeInit.status !== "configured") {
    return NextResponse.json({ success: false, error: { code: "SERVICE_UNAVAILABLE" } }, { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  let principal;
  try {
    const authResult = await authRuntimeInit.runtime.authenticator.authenticate(request);
    if (authResult.status !== "authenticated") {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }
    principal = authResult.principal;
  } catch {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  } finally {
    try {
      await authRuntimeInit.runtime.close();
    } catch {
      // Swallow
    }
  }

  const evaluatedAt = new Date().toISOString();
  if (!validateJurisprudencePrincipal(principal) || isJurisprudencePrincipalExpired(principal, evaluatedAt)) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  if (principal.kind !== "human" || !principal.subjectId) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  if (!hasJurisprudencePermission(principal, "jurisprudence.internal.create")) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  const origin = request.headers.get("origin");
  if (!origin || origin === "null") {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }
  try {
    const authConfig = loadAuthenticationConfiguration(process.env);
    if (authConfig.status === "configured" || authConfig.status === "configured_for_test") {
      if (!authConfig.allowedOrigins.includes(origin)) {
        return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
    } else {
      return NextResponse.json({ success: false, error: { code: "SERVICE_UNAVAILABLE" } }, { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }
  } catch {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ success: false, error: { code: "UNSUPPORTED_MEDIA_TYPE" } }, { status: 415, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  let payload;
  try {
    payload = await readLimitedJurisprudenceJson(request.clone(), MAX_BODY_BYTES);
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "status" in err && err.status === 413) {
      return NextResponse.json({ success: false, error: { code: "PAYLOAD_TOO_LARGE" } }, { status: 413, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  if (typeof payload !== "object" || payload === null || !("action" in payload) || typeof (payload as Record<string, unknown>).action !== "string") {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }
  const action = (payload as Record<string, unknown>).action;

  let governanceRuntime: ReturnType<typeof createJurisprudenceGovernanceRuntime> | undefined;

  try {
    governanceRuntime = createJurisprudenceGovernanceRuntime();
    let result;

    if (action === "open_dossier") {
      const parsedBody = openPublicationDossierCommandSchema.safeParse(payload);
      if (!parsedBody.success) return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      result = await governanceRuntime.service.openDossier({ ...parsedBody.data, context: { requestId: randomUUID(), actorReference: principal.subjectId, requestedAt: evaluatedAt } });
    } else if (action === "assess_provenance") {
      const parsedBody = assessProvenanceCommandSchema.safeParse(payload);
      if (!parsedBody.success) return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      result = await governanceRuntime.service.assessProvenance({ ...parsedBody.data, context: { requestId: randomUUID(), actorReference: principal.subjectId, requestedAt: evaluatedAt } });
    } else if (action === "assess_integrity") {
      const parsedBody = assessIntegrityCommandSchema.safeParse(payload);
      if (!parsedBody.success) return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      result = await governanceRuntime.service.assessIntegrity({ ...parsedBody.data, context: { requestId: randomUUID(), actorReference: principal.subjectId, requestedAt: evaluatedAt } });
    } else if (action === "assess_rights") {
      const parsedBody = assessRightsCommandSchema.safeParse(payload);
      if (!parsedBody.success) return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      result = await governanceRuntime.service.assessRights({ ...parsedBody.data, context: { requestId: randomUUID(), actorReference: principal.subjectId, requestedAt: evaluatedAt } });
    } else if (action === "assess_privacy") {
      const parsedBody = assessPrivacyCommandSchema.safeParse(payload);
      if (!parsedBody.success) return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      result = await governanceRuntime.service.assessPrivacy({ ...parsedBody.data, context: { requestId: randomUUID(), actorReference: principal.subjectId, requestedAt: evaluatedAt } });
    } else if (action === "assess_public_projection") {
      const parsedBody = assessPublicProjectionCommandSchema.safeParse(payload);
      if (!parsedBody.success) return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      result = await governanceRuntime.service.assessPublicProjection({ ...parsedBody.data, context: { requestId: randomUUID(), actorReference: principal.subjectId, requestedAt: evaluatedAt } });
    } else if (action === "evaluate_dossier") {
      const parsedBody = evaluatePublicationDossierCommandSchema.safeParse(payload);
      if (!parsedBody.success) return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      result = await governanceRuntime.service.evaluateDossier({ ...parsedBody.data, context: { requestId: randomUUID(), actorReference: principal.subjectId, requestedAt: evaluatedAt } });
    } else if (action === "synchronize_dossier") {
      const parsedBody = synchronizePublicationDossierCommandSchema.safeParse(payload);
      if (!parsedBody.success) return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      result = await governanceRuntime.service.synchronizeDossier({ ...parsedBody.data, context: { requestId: randomUUID(), actorReference: principal.subjectId, requestedAt: evaluatedAt } });
    } else if (action === "close_dossier") {
      const parsedBody = closePublicationDossierCommandSchema.safeParse(payload);
      if (!parsedBody.success) return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      result = await governanceRuntime.service.closeDossier({ ...parsedBody.data, context: { requestId: randomUUID(), actorReference: principal.subjectId, requestedAt: evaluatedAt } });
    } else {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }

    return NextResponse.json(
      { success: true, data: result },
      { status: 201, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof JurisprudencePublicationGovernanceError) {
      if (error.code === "IDEMPOTENCY_CONFLICT") {
        return NextResponse.json({ success: false, error: { code: "IDEMPOTENCY_CONFLICT" } }, { status: 409, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
      if (error.code === "VALIDATION_ERROR") {
        return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
      if (error.code === "NOT_FOUND") {
        return NextResponse.json({ success: false, error: { code: "NOT_FOUND" } }, { status: 404, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
      if (error.code === "VERSION_CONFLICT") {
        return NextResponse.json({ success: false, error: { code: "VERSION_CONFLICT" } }, { status: 409, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
      if (error.code === "DUPLICATE_ACTIVE_DOSSIER") {
        return NextResponse.json({ success: false, error: { code: "DUPLICATE_ACTIVE_DOSSIER" } }, { status: 409, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
      if (error.code === "DOSSIER_SUPERSEDED") {
        return NextResponse.json({ success: false, error: { code: "DOSSIER_SUPERSEDED" } }, { status: 409, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
      if (error.code === "DOSSIER_CLOSED") {
        return NextResponse.json({ success: false, error: { code: "DOSSIER_CLOSED" } }, { status: 409, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
      if (error.code === "SOURCE_NOT_ELIGIBLE") {
        return NextResponse.json({ success: false, error: { code: "SOURCE_NOT_ELIGIBLE" } }, { status: 422, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
      if (error.code === "REPOSITORY_UNAVAILABLE" || error.code === "RESOURCE_CLOSED") {
        return NextResponse.json({ success: false, error: { code: "SERVICE_UNAVAILABLE" } }, { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
      }
      return NextResponse.json(
        { success: false, error: { code: "UNPROCESSABLE_ENTITY", reason: error.code } },
        { status: 422, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR" } },
      { status: 500, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
    );
  } finally {
    if (governanceRuntime) {
      try {
        await governanceRuntime.close();
      } catch {
      }
    }
  }
}
