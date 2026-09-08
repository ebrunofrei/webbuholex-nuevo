import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createJurisprudenceAuthenticationRuntime } from "@/lib/jurisprudence/jurisprudence-authentication-runtime";
import {
  hasJurisprudencePermission,
  validateJurisprudencePrincipal,
  isJurisprudencePrincipalExpired
} from "@/lib/jurisprudence-authorization-policy";
import { isJurisprudencePublicationExecutionEnabled } from "@/lib/jurisprudence/jurisprudence-publication-execution-config";
import { createJurisprudencePublicationExecutionRuntime } from "@/lib/jurisprudence/jurisprudence-publication-execution-runtime";
import { JurisprudencePublicationExecutionError } from "@/lib/jurisprudence-publication-execution-repository";
import { loadAuthenticationConfiguration } from "@/lib/authentication-configuration";
import { readLimitedJurisprudenceJson } from "@/lib/jurisprudence-http-request";
import type { JurisprudencePublicationExecutionView } from "@/types/jurisprudence-publication-execution";

const MAX_BODY_BYTES = 65536;

const executePublicationRequestSchema = z.object({
  recordId: z.string().trim().min(1).max(180),
  expectedRecordVersion: z.number().int().min(1),
  editorialCaseId: z.string().trim().min(3).max(180),
  publicationDossierId: z.string().trim().min(3).max(180),
  authorizationCaseId: z.string().trim().min(3).max(180),
  idempotencyKey: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/).min(8).max(200)
}).strict();

export async function handleJurisprudencePublicationExecutionPost(
  request: Request
): Promise<NextResponse> {
  let authRuntimeInit;
  try {
    authRuntimeInit = createJurisprudenceAuthenticationRuntime();
  } catch (error) {
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
  } catch (err) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  } finally {
    try {
      await authRuntimeInit.runtime.close();
    } catch {
      // Swallow to avoid leaking secrets
    }
  }

  const evaluatedAt = new Date().toISOString();
  if (!validateJurisprudencePrincipal(principal) || isJurisprudencePrincipalExpired(principal, evaluatedAt)) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  if (principal.kind !== "human" || !principal.subjectId) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED" } }, { status: 401, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  if (!principal.roles.includes("jurisprudence_publisher")) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  if (!hasJurisprudencePermission(principal, "jurisprudence.internal.publish")) {
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

  try {
    const gateEnabled = isJurisprudencePublicationExecutionEnabled();
    if (!gateEnabled) {
      return NextResponse.json(
        { success: false, error: { code: "SERVICE_UNAVAILABLE" } },
        { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "SERVICE_UNAVAILABLE" } },
      { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
    );
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ success: false, error: { code: "UNSUPPORTED_MEDIA_TYPE" } }, { status: 415, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  let payload;
  try {
    payload = await readLimitedJurisprudenceJson(request.clone(), MAX_BODY_BYTES);
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "status" in err && (err as { status?: unknown }).status === 413) {
      return NextResponse.json({ success: false, error: { code: "PAYLOAD_TOO_LARGE" } }, { status: 413, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  const parsedBody = executePublicationRequestSchema.safeParse(payload);
  if (!parsedBody.success) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  let executionRuntime: ReturnType<typeof createJurisprudencePublicationExecutionRuntime> | undefined;

  try {
    executionRuntime = createJurisprudencePublicationExecutionRuntime();

    const executionContext = {
      requestId: randomUUID(),
      actorReference: principal.subjectId,
      requestedAt: evaluatedAt
    };

    const command = {
      context: executionContext,
      recordId: parsedBody.data.recordId,
      expectedRecordVersion: parsedBody.data.expectedRecordVersion,
      editorialCaseId: parsedBody.data.editorialCaseId,
      publicationDossierId: parsedBody.data.publicationDossierId,
      authorizationCaseId: parsedBody.data.authorizationCaseId,
      idempotencyKey: parsedBody.data.idempotencyKey,
    };

    const view = await executionRuntime.service.executePublication(command);

    return NextResponse.json(
      { success: true, data: view },
      { status: 201, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof JurisprudencePublicationExecutionError) {
      if (error.code === "IDEMPOTENCY_CONFLICT") {
        return NextResponse.json({ success: false, error: { code: "IDEMPOTENCY_CONFLICT" } }, { status: 409, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
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
    if (executionRuntime) {
      try {
        await executionRuntime.close();
      } catch {
      }
    }
  }
}
