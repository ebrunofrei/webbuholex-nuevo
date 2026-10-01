import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createJurisprudenceAuthenticationRuntime } from "@/lib/jurisprudence/jurisprudence-authentication-runtime";
import {
  hasJurisprudencePermission,
  validateJurisprudencePrincipal,
  isJurisprudencePrincipalExpired
} from "@/lib/jurisprudence-authorization-policy";
import type { JurisprudencePermission } from "@/types/jurisprudence-security";
import { loadAuthenticationConfiguration } from "@/lib/authentication-configuration";
import { readLimitedJurisprudenceJson } from "@/lib/jurisprudence-http-request";
import { createJurisprudenceEditorialRuntime } from "@/lib/jurisprudence/jurisprudence-editorial-runtime";
import { JurisprudenceEditorialWorkflowError } from "@/lib/jurisprudence-editorial-case-repository";
import {
  openJurisprudenceEditorialCaseCommandSchema,
  assignJurisprudenceEditorialReviewCommandSchema,
  recordJurisprudenceEditorialDecisionCommandSchema,
  evaluateJurisprudenceEditorialPublicationCommandSchema
} from "@/lib/schemas/jurisprudence-editorial-workflow";

const MAX_BODY_BYTES = 65536;

export interface JurisprudenceEditorialHttpDependencies {
  readonly createAuthenticationRuntime?: typeof createJurisprudenceAuthenticationRuntime;
  readonly createEditorialRuntime?: typeof createJurisprudenceEditorialRuntime;
}

function parseJsonOrNull(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export async function handleJurisprudenceEditorialCasesPost(
  request: Request,
  dependencies: JurisprudenceEditorialHttpDependencies = {}
): Promise<NextResponse> {
const createAuthenticationRuntime =
  dependencies.createAuthenticationRuntime ??
  createJurisprudenceAuthenticationRuntime;

const createEditorialRuntime =
  dependencies.createEditorialRuntime ??
  createJurisprudenceEditorialRuntime;

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
    if (typeof err === "object" && err !== null && "status" in err && (err as { status: number }).status === 413) {
      return NextResponse.json({ success: false, error: { code: "PAYLOAD_TOO_LARGE" } }, { status: 413, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    }
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  const envelope = parseJsonOrNull(payload);
  if (!envelope || typeof envelope.action !== "string" || !envelope.command || typeof envelope.command !== "object") {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  const action = envelope.action;
  const rawCommand = envelope.command;

  const commandWithContext = {
    ...rawCommand,
    context: {
      requestId: randomUUID(),
      actorReference: principal.subjectId,
      requestedAt: evaluatedAt
    }
  };

  let requiredPermission: JurisprudencePermission;
  let parsedCommand: unknown;

  if (action === "open_case") {
    const parsed = openJurisprudenceEditorialCaseCommandSchema.safeParse(commandWithContext);
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    parsedCommand = parsed.data;
    requiredPermission = "jurisprudence.internal.update_editorial";
  } else if (action === "assign_review") {
    const parsed = assignJurisprudenceEditorialReviewCommandSchema.safeParse(commandWithContext);
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    parsedCommand = parsed.data;
    requiredPermission = parsed.data.reviewKind === "editorial_review" ? "jurisprudence.internal.update_editorial" : "jurisprudence.internal.update_source";
  } else if (action === "record_decision") {
    const parsed = recordJurisprudenceEditorialDecisionCommandSchema.safeParse(commandWithContext);
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    parsedCommand = parsed.data;
    requiredPermission = ["editorial_approved", "request_changes", "close_without_approval"].includes(parsed.data.decision)
      ? "jurisprudence.internal.update_editorial"
      : "jurisprudence.internal.update_source";
  } else if (action === "evaluate_publication") {
    const parsed = evaluateJurisprudenceEditorialPublicationCommandSchema.safeParse(commandWithContext);
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
    parsedCommand = parsed.data;
    requiredPermission = "jurisprudence.internal.evaluate_publication";
  } else {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST" } }, { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  if (!hasJurisprudencePermission(principal, requiredPermission)) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
  }

  let editorialRuntime: ReturnType<typeof createJurisprudenceEditorialRuntime> | undefined;

  try {
    editorialRuntime = createEditorialRuntime();

    let result;
    let statusCode = 200;

    if (action === "open_case") {
      result = await editorialRuntime.workflow.openCase(parsedCommand);
      statusCode = 201;
    } else if (action === "assign_review") {
      result = await editorialRuntime.workflow.assignReview(parsedCommand);
    } else if (action === "record_decision") {
      result = await editorialRuntime.workflow.recordDecision(parsedCommand);
    } else if (action === "evaluate_publication") {
      result = await editorialRuntime.workflow.evaluatePublication(parsedCommand);
    }

    return NextResponse.json(
      { success: true, action, data: result },
      { status: statusCode, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof JurisprudenceEditorialWorkflowError) {
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
      if (error.code === "DUPLICATE_ACTIVE_CASE" || error.code === "CASE_CLOSED" || error.code === "CASE_EXPIRED" || error.code === "CASE_SUPERSEDED" || error.code === "ASSIGNMENT_REQUIRED" || error.code === "SEPARATION_OF_DUTIES_REQUIRED" || error.code === "OBSERVATION_NOT_FOUND") {
        return NextResponse.json({ success: false, error: { code: "UNPROCESSABLE_ENTITY", reason: error.code } }, { status: 422, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } });
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
    if (editorialRuntime) {
      try {
        await editorialRuntime.close();
      } catch {
      }
    }
  }
}
