import "server-only";
import { NextResponse } from "next/server";
import { resolveJurisprudenceHttpRequestId } from "@/lib/jurisprudence-http-request";
import { jurisprudenceHttpInterpretRequestBodySchema } from "@/lib/schemas/jurisprudence-http";
import { extractClientIp, hashRateLimitSubject } from "@/lib/security/rate-limit-subject";
import {
  createJurisprudenceInterpretationRuntime,
  type JurisprudenceInterpretationRuntime,
} from "@/lib/jurisprudence/jurisprudence-interpretation-runtime";
import { getWorkspaceSession } from "@/lib/auth/session";
import type { WorkspaceSession } from "@/types/auth";
import {
  resolveJurisprudenceCanonicalRecordBySlug,
  type ResolveCanonicalRecordBySlugResult,
  type JurisprudenceCanonicalRecordReference,
} from "@/lib/jurisprudence/jurisprudence-public-slug-resolver";

export const MAX_BODY_BYTES = 2048;

export interface InterpretHandlerDependencies {
  readonly runtimeFactory?: (() => JurisprudenceInterpretationRuntime) | undefined;
  readonly now?: (() => string) | undefined;
  readonly generateRequestId?: (() => string) | undefined;
  readonly getSession?: (() => Promise<WorkspaceSession | null | undefined>) | undefined;
  readonly resolveCanonicalBySlug?: (
    slug: unknown
  ) => Promise<ResolveCanonicalRecordBySlugResult>;
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  headers: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
        ...headers,
      },
    }
  );
}

function validateOrigin(request: Request): { readonly ok: true } | { readonly ok: false } {
  const originHeader = request.headers.get("origin");
  if (!originHeader) {
    // Direct/server callers with no Origin header are allowed
    return { ok: true };
  }

  const trimmedOrigin = originHeader.trim();
  if (trimmedOrigin.length === 0 || trimmedOrigin === "null") {
    return { ok: false };
  }

  let requestUrl: URL;
  try {
    requestUrl = new URL(request.url);
  } catch {
    return { ok: false };
  }

  let originUrl: URL;
  try {
    originUrl = new URL(trimmedOrigin);
  } catch {
    return { ok: false };
  }

  // Normalized origin comparison
  // Compare protocol and host (which includes port if non-default in URL standard)
  const originNormalized = `${originUrl.protocol.toLowerCase()}//${originUrl.host.toLowerCase()}`;
  const requestNormalized = `${requestUrl.protocol.toLowerCase()}//${requestUrl.host.toLowerCase()}`;

  if (originNormalized === requestNormalized) {
    return { ok: true };
  }

  return { ok: false };
}

async function readBodyWithLimit(
  request: Request,
  maximumBytes: number
): Promise<{ readonly ok: true; readonly json: unknown } | { readonly ok: false; readonly status: number; readonly code: string; readonly message: string }> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isInteger(length) || length < 0) {
      return {
        ok: false,
        status: 400,
        code: "malformed_json",
        message: "Encabezado Content-Length no válido.",
      };
    }
    if (length > maximumBytes) {
      return {
        ok: false,
        status: 413,
        code: "payload_too_large",
        message: "El cuerpo de la solicitud supera el tamaño máximo permitido.",
      };
    }
  }

  if (request.body === null) {
    return {
      ok: false,
      status: 400,
      code: "malformed_json",
      message: "Se requiere un cuerpo JSON en la solicitud.",
    };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) {
        return {
          ok: false,
          status: 413,
          code: "payload_too_large",
          message: "El cuerpo de la solicitud supera el tamaño máximo permitido.",
        };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (size === 0) {
    return {
      ok: false,
      status: 400,
      code: "malformed_json",
      message: "Se requiere un cuerpo JSON en la solicitud.",
    };
  }

  const fullBytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    fullBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder().decode(fullBytes);
    const parsed = JSON.parse(text);
    return { ok: true, json: parsed };
  } catch {
    return {
      ok: false,
      status: 400,
      code: "malformed_json",
      message: "El cuerpo de la solicitud no contiene un JSON válido.",
    };
  }
}

export function createInterpretHandler(deps: InterpretHandlerDependencies = {}) {
  const getSession = deps.getSession ?? getWorkspaceSession;
  const resolveCanonicalBySlug =
    deps.resolveCanonicalBySlug ?? resolveJurisprudenceCanonicalRecordBySlug;

  return async function handleJurisprudenceInterpretPost(request: Request): Promise<NextResponse> {
    try {
      // 0. Method validation
      if (request.method !== "POST") {
        return errorResponse(405, "method_not_allowed", "Método HTTP no permitido.");
      }

      // 1. Request ID (safe opaque correlation)
      let requestId: string;
      try {
        requestId = resolveJurisprudenceHttpRequestId(
          request.headers,
          deps.generateRequestId ?? (() => crypto.randomUUID())
        );
      } catch {
        requestId = crypto.randomUUID();
      }

      // 2. Content-Type check
      const contentTypeHeader = request.headers.get("content-type");
      if (!contentTypeHeader) {
        return errorResponse(
          415,
          "unsupported_media_type",
          "Se requiere Content-Type application/json."
        );
      }

      const mediaType = contentTypeHeader.split(";", 1)[0]?.trim().toLowerCase();
      if (mediaType !== "application/json") {
        return errorResponse(
          415,
          "unsupported_media_type",
          "Tipo de contenido no soportado. Utilice application/json."
        );
      }

      // 3. Auth Session Gate
      let session: WorkspaceSession | null | undefined;
      try {
        session = await getSession();
      } catch {
        return errorResponse(
          500,
          "unexpected_internal_failure",
          "Ocurrió un error inesperado al procesar la solicitud."
        );
      }

      if (!session || session.status !== "authenticated") {
        return errorResponse(
          401,
          "authentication_required",
          "Debes iniciar sesión para utilizar esta función."
        );
      }

      // 4. Body size enforcement & parse
      const bodyResult = await readBodyWithLimit(request, MAX_BODY_BYTES);
      if (!bodyResult.ok) {
        return errorResponse(
          bodyResult.status,
          bodyResult.code,
          bodyResult.message
        );
      }

      // 5. Strict slug schema validation
      const parsedBody = jurisprudenceHttpInterpretRequestBodySchema.safeParse(bodyResult.json);
      if (!parsedBody.success) {
        return errorResponse(
          400,
          "invalid_request_schema",
          "El formato de los parámetros de solicitud es inválido."
        );
      }

      const { slug } = parsedBody.data;

      // 6. Origin Policy Gate
      const originResult = validateOrigin(request);
      if (!originResult.ok) {
        return errorResponse(
          403,
          "origin_not_allowed",
          "Origen de solicitud no autorizado."
        );
      }

      // 7. Public Slug → Canonical Resolution
      let canonicalRef: JurisprudenceCanonicalRecordReference;
      try {
        const resolveResult = await resolveCanonicalBySlug(slug);
        if (!resolveResult.ok) {
          if (resolveResult.code === "not_found") {
            return errorResponse(
              404,
              "jurisprudence_not_found",
              "No se encontró una resolución pública disponible para análisis."
            );
          }
          return errorResponse(
            400,
            "invalid_request_schema",
            "El formato de los parámetros de solicitud es inválido."
          );
        }
        canonicalRef = resolveResult.value;
      } catch {
        return errorResponse(
          500,
          "unexpected_internal_failure",
          "Ocurrió un error inesperado al procesar la solicitud."
        );
      }

      // 8. Runtime creation & Limiter Setup
      let runtimeBundle: JurisprudenceInterpretationRuntime;
      try {
        runtimeBundle = deps.runtimeFactory
          ? deps.runtimeFactory()
          : createJurisprudenceInterpretationRuntime();
      } catch (err: unknown) {
        if (
          err !== null &&
          typeof err === "object" &&
          "name" in err &&
          err.name === "JurisprudenceRateLimitConfigError"
        ) {
          return errorResponse(
            503,
            "limiter_unavailable",
            "El servicio de limitación de tasa no está disponible."
          );
        }
        return errorResponse(
          500,
          "unexpected_internal_failure",
          "Ocurrió un error inesperado al inicializar el servicio."
        );
      }

      const { orchestrator, rateLimiter, rateLimitConfig } = runtimeBundle;

      // 9. Extract Client IP and derive subject HMAC
      const rawIp = extractClientIp(request.headers);
      const subjectHash = hashRateLimitSubject(rateLimitConfig.hmacSecret, rawIp);
      const globalSubjectHash = hashRateLimitSubject(rateLimitConfig.hmacSecret, "global");

      // 10. Consume Subject Limiter
      const subjectOutcome = await rateLimiter.consume({
        scope: "subject",
        subjectHash,
        limit: rateLimitConfig.subjectMax,
        windowSeconds: rateLimitConfig.subjectWindowSeconds,
      });

      if (!subjectOutcome.allowed) {
        if ("retryAfterSeconds" in subjectOutcome) {
          const retryAfter = Math.max(1, subjectOutcome.retryAfterSeconds);
          return errorResponse(
            429,
            "rate_limited",
            "Ha excedido el límite de solicitudes. Intente más tarde.",
            { "Retry-After": retryAfter.toString() }
          );
        }

        return errorResponse(
          503,
          "limiter_unavailable",
          "El servicio de limitación de tasa no está disponible."
        );
      }

      // 11. Consume Global Limiter
      const globalOutcome = await rateLimiter.consume({
        scope: "global",
        subjectHash: globalSubjectHash,
        limit: rateLimitConfig.globalMax,
        windowSeconds: rateLimitConfig.globalWindowSeconds,
      });

      if (!globalOutcome.allowed) {
        if ("retryAfterSeconds" in globalOutcome) {
          const retryAfter = Math.max(1, globalOutcome.retryAfterSeconds);
          return errorResponse(
            429,
            "rate_limited",
            "El servicio ha alcanzado la capacidad temporal máxima. Intente más tarde.",
            { "Retry-After": retryAfter.toString() }
          );
        }

        return errorResponse(
          503,
          "limiter_unavailable",
          "El servicio de limitación de tasa no está disponible."
        );
      }

      // 12. Execute Canonical Orchestration
      const result = await orchestrator.interpret(
        canonicalRef.recordId,
        canonicalRef.recordVersion
      );

      if (!result.ok) {
        switch (result.code) {
          case "record_not_found":
            return errorResponse(
              404,
              "jurisprudence_not_found",
              "No se encontró una resolución pública disponible para análisis."
            );
          case "record_version_mismatch":
            return errorResponse(
              409,
              "record_version_mismatch",
              "La versión del registro solicitada no coincide con la versión canónica actual."
            );
          case "source_too_large":
            return errorResponse(
              422,
              "source_too_large",
              "El texto canónico del registro supera el límite de procesamiento permitido."
            );
          case "provider_failure":
            return errorResponse(
              502,
              "provider_failure",
              "El proveedor de análisis presentó una falla temporal."
            );
          case "invalid_interpretation":
            return errorResponse(
              502,
              "invalid_interpretation",
              "La interpretación obtenida no cumple con la estructura esperada."
            );
          case "grounding_failed":
            return errorResponse(
              422,
              "grounding_failed",
              "La interpretación no pudo ser respaldada con citas exactas del texto canónico."
            );
          default:
            return errorResponse(
              500,
              "unexpected_internal_failure",
              "Ocurrió un error inesperado al procesar la interpretación."
            );
        }
      }

      // 13. Success Response (Public response: slug only, zero canonical identifiers)
      return NextResponse.json(
        {
          ok: true,
          data: {
            slug,
            interpretation: result.interpretation,
          },
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": "application/json",
            "x-request-id": requestId,
          },
        }
      );
    } catch {
      return errorResponse(
        500,
        "unexpected_internal_failure",
        "Ocurrió un error inesperado al procesar la solicitud."
      );
    }
  };
}

export const handleJurisprudenceInterpretPost = createInterpretHandler();
