import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createJurisprudenceAuthenticationRuntime } from "@/lib/jurisprudence/jurisprudence-authentication-runtime";
import {
  hasJurisprudencePermission,
  validateJurisprudencePrincipal,
  isJurisprudencePrincipalExpired,
} from "@/lib/jurisprudence-authorization-policy";
import { JurisprudencePublicationAuthorizationError } from "@/lib/jurisprudence-publication-authorization-repository";
import { createJurisprudencePublicationAuthorizationRuntime } from "@/lib/jurisprudence/jurisprudence-publication-authorization-runtime";
import { readLimitedJurisprudenceJson } from "@/lib/jurisprudence-http-request";
import {
  evaluateJurisprudencePublicationAuthorizationCommandSchema,
  authorizeJurisprudencePublicationCommandSchema,
  rejectJurisprudencePublicationAuthorizationCommandSchema,
  deferJurisprudencePublicationAuthorizationCommandSchema,
  revokeJurisprudencePublicationAuthorizationCommandSchema,
  supersedeJurisprudencePublicationAuthorizationCommandSchema,
} from "@/lib/schemas/jurisprudence-publication-authorization";

const MAX_BODY_BYTES = 65536;

const requestSchema = z.object({
  action: z.enum(["evaluate", "authorize", "reject", "defer", "revoke", "supersede"]),
  payload: z.unknown(),
}).strict();

function mapError(error: unknown) {
  if (error instanceof JurisprudencePublicationAuthorizationError) {
    if (error.code === "VALIDATION_ERROR") {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", reason: error.message } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", reason: error.message } }, { status: 404, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }
    if (error.code === "IDEMPOTENCY_CONFLICT" || error.code === "VERSION_CONFLICT" || error.code === "EXISTING_ACTIVE_AUTHORIZATION" || error.code === "AUTHORIZATION_NOT_CURRENT" || error.code === "DOSSIER_INCOMPLETE") {
      return NextResponse.json({ success: false, error: { code: "CONFLICT", reason: error.code } }, { status: 409, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }
    return NextResponse.json({ success: false, error: { code: "UNPROCESSABLE_ENTITY", reason: error.code } }, { status: 422, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }
  return NextResponse.json({ success: false, error: { code: "INTERNAL_SERVER_ERROR" } }, { status: 500, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
}

export async function handleJurisprudencePublicationAuthorizationCommandsPost(request: Request): Promise<NextResponse> {
  let authRuntimeInit;
  try {
    authRuntimeInit = createJurisprudenceAuthenticationRuntime();
  } catch {
    return NextResponse.json({ success: false, error: { code: "SERVICE_UNAVAILABLE" } }, { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
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
    } catch {}
  }

  const evaluatedAt = new Date().toISOString();
  if (!validateJurisprudencePrincipal(principal) || isJurisprudencePrincipalExpired(principal, evaluatedAt)) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  if (principal.kind !== "human" || !principal.subjectId) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  if (!hasJurisprudencePermission(principal, "jurisprudence.internal.evaluate_publication")) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ success: false, error: { code: "UNSUPPORTED_MEDIA_TYPE" } }, { status: 415, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  let body;
  try {
    body = await readLimitedJurisprudenceJson(request.clone(), MAX_BODY_BYTES);
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "status" in err && (err as { status?: unknown }).status === 413) {
      return NextResponse.json({ success: false, error: { code: "PAYLOAD_TOO_LARGE" } }, { status: 413, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  const parsedBody = requestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  const context = {
    requestId: randomUUID(),
    actorReference: principal.subjectId,
    requestedAt: evaluatedAt,
  };

  const payloadWithContext = typeof parsedBody.data.payload === "object" && parsedBody.data.payload !== null
    ? { ...parsedBody.data.payload, context }
    : { context };

  let runtime: ReturnType<typeof createJurisprudencePublicationAuthorizationRuntime> | undefined;

  try {
    runtime = createJurisprudencePublicationAuthorizationRuntime();

    if (parsedBody.data.action === "evaluate") {
      const parsed = evaluateJurisprudencePublicationAuthorizationCommandSchema.safeParse(payloadWithContext);
      if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("VALIDATION_ERROR", "Invalid payload");
      const result = await runtime.service.evaluateAuthorization(parsed.data);
      return NextResponse.json({ success: true, data: result }, { status: 200, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }

    if (parsedBody.data.action === "authorize") {
      const parsed = authorizeJurisprudencePublicationCommandSchema.safeParse(payloadWithContext);
      if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("VALIDATION_ERROR", "Invalid payload");
      const result = await runtime.service.authorizePublication(parsed.data);
      return NextResponse.json({ success: true, data: result }, { status: 201, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }

    if (parsedBody.data.action === "reject") {
      const parsed = rejectJurisprudencePublicationAuthorizationCommandSchema.safeParse(payloadWithContext);
      if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("VALIDATION_ERROR", "Invalid payload");
      const result = await runtime.service.rejectAuthorization(parsed.data);
      return NextResponse.json({ success: true, data: result }, { status: 201, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }

    if (parsedBody.data.action === "defer") {
      const parsed = deferJurisprudencePublicationAuthorizationCommandSchema.safeParse(payloadWithContext);
      if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("VALIDATION_ERROR", "Invalid payload");
      const result = await runtime.service.deferAuthorization(parsed.data);
      return NextResponse.json({ success: true, data: result }, { status: 201, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }

    if (parsedBody.data.action === "revoke") {
      const parsed = revokeJurisprudencePublicationAuthorizationCommandSchema.safeParse(payloadWithContext);
      if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("VALIDATION_ERROR", "Invalid payload");
      const result = await runtime.service.revokeAuthorization(parsed.data);
      return NextResponse.json({ success: true, data: result }, { status: 201, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }

    if (parsedBody.data.action === "supersede") {
      const parsed = supersedeJurisprudencePublicationAuthorizationCommandSchema.safeParse(payloadWithContext);
      if (!parsed.success) throw new JurisprudencePublicationAuthorizationError("VALIDATION_ERROR", "Invalid payload");
      const result = await runtime.service.supersedeAuthorizationForNewVersion(parsed.data);
      return NextResponse.json({ success: true, data: result }, { status: 201, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }

    throw new JurisprudencePublicationAuthorizationError("VALIDATION_ERROR", "Unknown action");
  } catch (error) {
    return mapError(error);
  } finally {
    if (runtime) {
      try {
        await runtime.close();
      } catch {}
    }
  }
}
