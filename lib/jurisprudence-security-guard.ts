import {
  hasJurisprudencePermission,
  isJurisprudencePrincipalExpired,
} from "@/lib/jurisprudence-authorization-policy";
import { JurisprudenceHttpError } from "@/lib/jurisprudence-http-error";
import {
  DEFAULT_JURISPRUDENCE_HTTP_BODY_LIMIT,
  assertJurisprudenceJsonContentType,
  readLimitedJurisprudenceJson,
  resolveJurisprudenceHttpRequestId,
} from "@/lib/jurisprudence-http-request";
import {
  jurisprudenceHttpCreateBodySchema,
  jurisprudenceHttpUpdateBodySchema,
} from "@/lib/schemas/jurisprudence-http";
import { jurisprudencePrincipalSchema } from "@/lib/schemas/jurisprudence-security";
import type {
  JurisprudenceAuthenticationResult,
  JurisprudenceAuthorizationDecision,
  JurisprudencePrincipal,
  JurisprudenceSecurityGuardDependencies,
  JurisprudenceSecurityLogEvent,
  JurisprudenceSecurityLogger,
  JurisprudenceSecurityOperation,
  JurisprudenceSecurityPublicErrorCode,
} from "@/types/jurisprudence-security";
import { JURISPRUDENCE_SECURITY_POLICY_VERSION } from "@/types/jurisprudence-security";

const nullSecurityLogger: JurisprudenceSecurityLogger = { log: () => undefined };

interface AuthorizedRequest {
  readonly authorized: true;
  readonly request: Request;
  readonly principal: JurisprudencePrincipal;
  readonly decision: JurisprudenceAuthorizationDecision;
}

interface RejectedRequest {
  readonly authorized: false;
  readonly response: Response;
}

type AuthorizationOutcome = AuthorizedRequest | RejectedRequest;

interface AuthenticatedRequest {
  readonly authorized: true;
  readonly request: Request;
  readonly principal: JurisprudencePrincipal;
  readonly authentication: Extract<JurisprudenceAuthenticationResult, { status: "authenticated" | "anonymous" }>;
}

type AuthenticationOutcome = AuthenticatedRequest | RejectedRequest;

function securityJsonError(input: {
  status: 400 | 401 | 403 | 413 | 415 | 503;
  code: JurisprudenceSecurityPublicErrorCode;
  message: string;
  requestId: string;
  generatedAt: string;
}): Response {
  return new Response(JSON.stringify({
    ok: false,
    error: { code: input.code, message: input.message },
    meta: { requestId: input.requestId, generatedAt: input.generatedAt },
  }), {
    status: input.status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-request-id": input.requestId,
    },
  });
}

function securityJsonSuccess(input: { requestId: string; generatedAt: string }): Response {
  return new Response(JSON.stringify({
    ok: true,
    data: { closed: true },
    meta: { requestId: input.requestId, generatedAt: input.generatedAt },
  }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-request-id": input.requestId,
    },
  });
}

export class JurisprudenceSecurityGuard {
  readonly #dependencies: JurisprudenceSecurityGuardDependencies;
  readonly #logger: JurisprudenceSecurityLogger;
  readonly #maxBodyBytes: number;
  #disposed = false;

  constructor(dependencies: JurisprudenceSecurityGuardDependencies) {
    this.#dependencies = dependencies;
    this.#logger = dependencies.logger ?? nullSecurityLogger;
    this.#maxBodyBytes = dependencies.configuration.maxBodyBytes ?? DEFAULT_JURISPRUDENCE_HTTP_BODY_LIMIT;
    if (!Number.isInteger(this.#maxBodyBytes) || this.#maxBodyBytes < 1_024 || this.#maxBodyBytes > 1_048_576) {
      throw new Error("La configuración del límite de seguridad no es válida.");
    }
  }

  #emit(event: JurisprudenceSecurityLogEvent): void {
    try { this.#logger.log(structuredClone(event)); } catch { /* el logging no controla la autorización */ }
  }

  #requestWithCorrelationId(request: Request, requestId: string): Request {
    const forwarded = request.clone();
    forwarded.headers.set("x-request-id", requestId);
    return forwarded;
  }

  #deny(input: {
    requestId: string;
    operation: JurisprudenceSecurityOperation;
    status: 401 | 403 | 503;
    code: "UNAUTHORIZED" | "FORBIDDEN" | "SERVICE_UNAVAILABLE";
    message: string;
    result: JurisprudenceAuthenticationResult;
    phase: Extract<JurisprudenceSecurityLogEvent["phase"], "authentication_rejected" | "authorization_denied" | "authorization_error">;
    resultCode: JurisprudenceSecurityLogEvent["resultCode"];
  }): RejectedRequest {
    const principalKind = input.result.status === "authenticated" || input.result.status === "anonymous"
      ? input.result.principal.kind
      : "anonymous";
    this.#emit({
      requestId: input.requestId,
      operation: input.operation,
      phase: input.phase,
      principalKind,
      resultCode: input.resultCode,
      policyVersion: JURISPRUDENCE_SECURITY_POLICY_VERSION,
      status: input.status,
    });
    return {
      authorized: false,
      response: securityJsonError({
        status: input.status,
        code: input.code,
        message: input.message,
        requestId: input.requestId,
        generatedAt: new Date(this.#dependencies.now()).toISOString(),
      }),
    };
  }

  async #authenticate(request: Request, operation: JurisprudenceSecurityOperation): Promise<AuthenticationOutcome> {
    const requestId = resolveJurisprudenceHttpRequestId(request.headers, this.#dependencies.requestIdGenerator);
    const forwarded = this.#requestWithCorrelationId(request, requestId);
    if (this.#disposed) {
      return this.#deny({
        requestId,
        operation,
        status: 503,
        code: "SERVICE_UNAVAILABLE",
        message: "El servicio interno no está disponible.",
        result: { status: "unavailable", reason: "infrastructure_error" },
        phase: "authorization_error",
        resultCode: "AUTHENTICATOR_UNAVAILABLE",
      });
    }
    let authentication: JurisprudenceAuthenticationResult;
    try {
      authentication = await this.#dependencies.authenticator.authenticate(forwarded.clone());
    } catch {
      authentication = { status: "unavailable", reason: "infrastructure_error" };
    }
    if (authentication.status === "unavailable") {
      return this.#deny({
        requestId,
        operation,
        status: 503,
        code: "SERVICE_UNAVAILABLE",
        message: "La autenticación no está disponible.",
        result: authentication,
        phase: "authorization_error",
        resultCode: "AUTHENTICATOR_UNAVAILABLE",
      });
    }
    if (authentication.status === "rejected") {
      return this.#deny({
        requestId,
        operation,
        status: 401,
        code: "UNAUTHORIZED",
        message: "No fue posible autenticar la solicitud.",
        result: authentication,
        phase: "authentication_rejected",
        resultCode: "INVALID_CREDENTIALS",
      });
    }
    const parsedPrincipal = jurisprudencePrincipalSchema.safeParse(authentication.principal);
    const authenticationKindMismatch = parsedPrincipal.success && (
      (authentication.status === "anonymous" && parsedPrincipal.data.kind !== "anonymous")
      || (authentication.status === "authenticated" && parsedPrincipal.data.kind === "anonymous")
    );
    if (!parsedPrincipal.success || authenticationKindMismatch) {
      return this.#deny({
        requestId,
        operation,
        status: 401,
        code: "UNAUTHORIZED",
        message: "La identidad no es válida.",
        result: { status: "rejected", reason: "invalid_principal" },
        phase: "authentication_rejected",
        resultCode: "INVALID_PRINCIPAL",
      });
    }
    const principal: JurisprudencePrincipal = Object.freeze({
      kind: parsedPrincipal.data.kind,
      subjectId: parsedPrincipal.data.subjectId,
      roles: Object.freeze([...parsedPrincipal.data.roles]),
      authenticationLevel: parsedPrincipal.data.authenticationLevel,
      issuedAt: parsedPrincipal.data.issuedAt,
      ...(parsedPrincipal.data.expiresAt === undefined ? {} : { expiresAt: parsedPrincipal.data.expiresAt }),
      ...(parsedPrincipal.data.provider === undefined ? {} : { provider: parsedPrincipal.data.provider }),
    });
    if (principal.authenticationLevel === "test_only" && !this.#dependencies.configuration.allowTestPrincipals) {
      return this.#deny({
        requestId,
        operation,
        status: 401,
        code: "UNAUTHORIZED",
        message: "La identidad no es válida.",
        result: authentication,
        phase: "authentication_rejected",
        resultCode: "INVALID_PRINCIPAL",
      });
    }
    if (isJurisprudencePrincipalExpired(principal, this.#dependencies.now())) {
      return this.#deny({
        requestId,
        operation,
        status: 401,
        code: "UNAUTHORIZED",
        message: "La identidad no es válida.",
        result: authentication,
        phase: "authentication_rejected",
        resultCode: "EXPIRED_PRINCIPAL",
      });
    }
    this.#emit({
      requestId,
      operation,
      phase: "authentication_resolved",
      principalKind: principal.kind,
      resultCode: principal.kind === "anonymous" ? "ANONYMOUS" : "AUTHENTICATED",
      policyVersion: JURISPRUDENCE_SECURITY_POLICY_VERSION,
      status: 200,
    });
    return { authorized: true, request: forwarded, principal, authentication };
  }

  #authorizeAuthenticated(
    authenticated: AuthenticatedRequest,
    operation: JurisprudenceSecurityOperation,
  ): AuthorizationOutcome {
    const requestId = authenticated.request.headers.get("x-request-id") ?? this.#dependencies.requestIdGenerator();
    let decision: JurisprudenceAuthorizationDecision;
    try {
      decision = this.#dependencies.authorizationPolicy.authorize({
        principal: authenticated.principal,
        operation,
        evaluatedAt: this.#dependencies.now(),
        allowTestPrincipals: this.#dependencies.configuration.allowTestPrincipals,
      });
    } catch {
      return this.#deny({
        requestId,
        operation,
        status: 503,
        code: "SERVICE_UNAVAILABLE",
        message: "La autorización no está disponible.",
        result: authenticated.authentication,
        phase: "authorization_error",
        resultCode: "POLICY_ERROR",
      });
    }
    if (!decision.allowed) {
      const requiresAuthentication = decision.reasonCode === "AUTHENTICATION_REQUIRED"
        || decision.reasonCode === "INVALID_PRINCIPAL"
        || decision.reasonCode === "EXPIRED_PRINCIPAL";
      return this.#deny({
        requestId,
        operation,
        status: requiresAuthentication ? 401 : 403,
        code: requiresAuthentication ? "UNAUTHORIZED" : "FORBIDDEN",
        message: requiresAuthentication ? "Se requiere una identidad válida." : "La operación no está permitida.",
        result: authenticated.authentication,
        phase: "authorization_denied",
        resultCode: decision.reasonCode,
      });
    }
    this.#emit({
      requestId,
      operation,
      phase: "authorization_allowed",
      principalKind: authenticated.principal.kind,
      resultCode: decision.reasonCode,
      policyVersion: decision.policyVersion,
      status: 200,
    });
    return {
      authorized: true,
      request: authenticated.request,
      principal: authenticated.principal,
      decision,
    };
  }

  async #authorize(request: Request, operation: JurisprudenceSecurityOperation): Promise<AuthorizationOutcome> {
    const authentication = await this.#authenticate(request, operation);
    return authentication.authorized === false
      ? authentication
      : this.#authorizeAuthenticated(authentication, operation);
  }

  async #run(
    request: Request,
    operation: JurisprudenceSecurityOperation,
    handler: (authorizedRequest: Request) => Promise<Response>,
  ): Promise<Response> {
    const outcome = await this.#authorize(request, operation);
    return outcome.authorized ? handler(outcome.request) : outcome.response;
  }

  search(request: Request): Promise<Response> {
    return this.#run(request, "search_public", (authorized) => this.#dependencies.handlers.public.search(authorized));
  }

  detail(request: Request, params: { slug: string }): Promise<Response> {
    return this.#run(request, "get_public_detail", (authorized) => this.#dependencies.handlers.public.detail(authorized, params));
  }

  async create(request: Request): Promise<Response> {
    const authentication = await this.#authenticate(request, "create_record");
    if (!authentication.authorized) return authentication.response;
    if (request.method === "POST") {
      try {
        assertJurisprudenceJsonContentType(authentication.request);
        const body = await readLimitedJurisprudenceJson(authentication.request.clone(), this.#maxBodyBytes);
        const parsed = jurisprudenceHttpCreateBodySchema.parse(body);
        if (parsed.record.publicationStatus === "published") {
          const requestId = authentication.request.headers.get("x-request-id") ?? this.#dependencies.requestIdGenerator();
          return this.#deny({
            requestId,
            operation: "create_record",
            status: 403,
            code: "FORBIDDEN",
            message: "La operación no está permitida.",
            result: authentication.authentication,
            phase: "authorization_denied",
            resultCode: "MISSING_PERMISSION",
          }).response;
        }
      } catch {
        // El controlador de 11.D conserva la respuesta de validación de transporte.
      }
    }
    const authorization = this.#authorizeAuthenticated(authentication, "create_record");
    return authorization.authorized
      ? this.#dependencies.handlers.internal.create(authorization.request)
      : authorization.response;
  }

  getInternal(request: Request, params: { id: string }): Promise<Response> {
    return this.#run(request, "get_internal", (authorized) => this.#dependencies.handlers.internal.getInternal(authorized, params));
  }

  listInternal(request: Request): Promise<Response> {
    return this.#run(request, "list_internal", (authorized) => this.#dependencies.handlers.internal.listInternal(authorized));
  }

  history(request: Request, params: { id: string }): Promise<Response> {
    return this.#run(request, "get_history", (authorized) => this.#dependencies.handlers.internal.history(authorized, params));
  }

  evaluatePublication(request: Request, params: { id: string }): Promise<Response> {
    return this.#run(request, "evaluate_publication", (authorized) => this.#dependencies.handlers.internal.evaluatePublication(authorized, params));
  }

  async update(request: Request, params: { id: string }): Promise<Response> {
    const authentication = await this.#authenticate(request, "update_editorial");
    if (authentication.authorized === false) return authentication.response;
    const correlated = authentication.request;
    const requestId = correlated.headers.get("x-request-id") ?? this.#dependencies.requestIdGenerator();
    const canAttemptUpdate = hasJurisprudencePermission(
      authentication.principal,
      "jurisprudence.internal.update_editorial",
    ) || hasJurisprudencePermission(
      authentication.principal,
      "jurisprudence.internal.update_source",
    );
    if (!canAttemptUpdate) {
      const denied = this.#authorizeAuthenticated(authentication, "update_editorial");
      if (!denied.authorized) return denied.response;
    }
    if (request.method !== "PUT") {
      const authorization = this.#authorizeAuthenticated(authentication, "update_editorial");
      return authorization.authorized
        ? this.#dependencies.handlers.internal.update(authorization.request, params)
        : authorization.response;
    }
    let changeKind: "editorial_update" | "source_update";
    try {
      assertJurisprudenceJsonContentType(correlated);
      const body = await readLimitedJurisprudenceJson(correlated.clone(), this.#maxBodyBytes);
      changeKind = jurisprudenceHttpUpdateBodySchema.parse(body).changeKind;
    } catch (error) {
      const status = error instanceof JurisprudenceHttpError && (error.status === 413 || error.status === 415)
        ? error.status
        : 400;
      return securityJsonError({
        status,
        code: status === 413
          ? "PAYLOAD_TOO_LARGE"
          : status === 415
            ? "UNSUPPORTED_MEDIA_TYPE"
            : "BAD_REQUEST",
        message: status === 413
          ? "El cuerpo supera el límite permitido."
          : status === 415
            ? "El cuerpo debe utilizar application/json."
          : "La actualización no contiene un changeKind válido.",
        requestId,
        generatedAt: new Date(this.#dependencies.now()).toISOString(),
      });
    }
    const operation = changeKind === "source_update" ? "update_source" : "update_editorial";
    const authorization = this.#authorizeAuthenticated(authentication, operation);
    return authorization.authorized
      ? this.#dependencies.handlers.internal.update(authorization.request, params)
      : authorization.response;
  }

  async closeService(request: Request): Promise<Response> {
    const outcome = await this.#authorize(request, "close");
    if (!outcome.authorized) return outcome.response;
    await this.dispose();
    return securityJsonSuccess({
      requestId: outcome.request.headers.get("x-request-id") ?? this.#dependencies.requestIdGenerator(),
      generatedAt: new Date(this.#dependencies.now()).toISOString(),
    });
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    await this.#dependencies.handlers.close();
  }
}
