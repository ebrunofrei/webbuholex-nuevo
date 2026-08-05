import type { JurisprudenceRouteHandlers } from "@/types/jurisprudence-http";

export const JURISPRUDENCE_SECURITY_POLICY_VERSION = "11.E.1" as const;

export type JurisprudencePrincipalKind = "anonymous" | "service" | "human";
export type JurisprudenceAuthenticationLevel =
  | "anonymous"
  | "test_only"
  | "authenticated"
  | "strong_authenticated";

export type JurisprudenceRole =
  | "jurisprudence_reader"
  | "jurisprudence_editor"
  | "jurisprudence_reviewer"
  | "jurisprudence_publisher"
  | "jurisprudence_auditor"
  | "jurisprudence_admin"
  | "system_service";

export type JurisprudencePermission =
  | "jurisprudence.public.search"
  | "jurisprudence.public.read_detail"
  | "jurisprudence.internal.list"
  | "jurisprudence.internal.read"
  | "jurisprudence.internal.read_history"
  | "jurisprudence.internal.evaluate_publication"
  | "jurisprudence.internal.create"
  | "jurisprudence.internal.update_editorial"
  | "jurisprudence.internal.update_source"
  | "jurisprudence.internal.publish"
  | "jurisprudence.internal.unpublish"
  | "jurisprudence.internal.audit"
  | "jurisprudence.internal.close_service";

export type JurisprudenceSecurityOperation =
  | "search_public"
  | "get_public_detail"
  | "list_internal"
  | "get_internal"
  | "create_record"
  | "update_editorial"
  | "update_source"
  | "evaluate_publication"
  | "get_history"
  | "close";

export interface JurisprudencePrincipal {
  readonly kind: JurisprudencePrincipalKind;
  readonly subjectId: string | null;
  readonly roles: readonly JurisprudenceRole[];
  readonly authenticationLevel: JurisprudenceAuthenticationLevel;
  readonly issuedAt: string;
  readonly expiresAt?: string;
  readonly provider?: "test_harness" | "future_identity_provider";
}

export type JurisprudenceAuthenticationResult =
  | { readonly status: "authenticated"; readonly principal: JurisprudencePrincipal }
  | { readonly status: "anonymous"; readonly principal: JurisprudencePrincipal }
  | { readonly status: "rejected"; readonly reason: "invalid_credentials" | "invalid_principal" }
  | { readonly status: "unavailable"; readonly reason: "not_configured" | "infrastructure_error" };

export interface JurisprudenceAuthenticator {
  authenticate(request: Request): Promise<JurisprudenceAuthenticationResult>;
}

export type JurisprudenceAuthorizationReasonCode =
  | "ALLOWED"
  | "ANONYMOUS_ALLOWED"
  | "AUTHENTICATION_REQUIRED"
  | "INVALID_PRINCIPAL"
  | "MISSING_PERMISSION"
  | "EXPIRED_PRINCIPAL"
  | "AUTHENTICATION_UNAVAILABLE"
  | "POLICY_ERROR";

export interface JurisprudenceAuthorizationDecision {
  readonly allowed: boolean;
  readonly reasonCode: JurisprudenceAuthorizationReasonCode;
  readonly requiredPermission: JurisprudencePermission;
  readonly principalKind: JurisprudencePrincipalKind;
  readonly evaluatedAt: string;
  readonly policyVersion: typeof JURISPRUDENCE_SECURITY_POLICY_VERSION;
}

export interface JurisprudenceAuthorizationPolicyInput {
  readonly principal: JurisprudencePrincipal;
  readonly operation: JurisprudenceSecurityOperation;
  readonly evaluatedAt: string;
  readonly allowTestPrincipals: boolean;
}

export interface JurisprudenceAuthorizationPolicy {
  authorize(input: JurisprudenceAuthorizationPolicyInput): JurisprudenceAuthorizationDecision;
}

export type JurisprudenceSecurityPublicErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "SERVICE_UNAVAILABLE"
  | "BAD_REQUEST"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE";

export interface JurisprudenceSecurityLogEvent {
  readonly requestId: string;
  readonly operation: JurisprudenceSecurityOperation;
  readonly phase:
    | "authentication_resolved"
    | "authentication_rejected"
    | "authorization_allowed"
    | "authorization_denied"
    | "authorization_error";
  readonly principalKind: JurisprudencePrincipalKind;
  readonly resultCode:
    | JurisprudenceAuthorizationReasonCode
    | "AUTHENTICATED"
    | "ANONYMOUS"
    | "INVALID_CREDENTIALS"
    | "AUTHENTICATOR_UNAVAILABLE";
  readonly policyVersion: typeof JURISPRUDENCE_SECURITY_POLICY_VERSION;
  readonly status: number;
}

export interface JurisprudenceSecurityLogger {
  log(event: JurisprudenceSecurityLogEvent): void;
}

export interface JurisprudenceSecurityGuardConfiguration {
  readonly allowTestPrincipals: boolean;
  readonly maxBodyBytes?: number;
}

export interface JurisprudenceSecurityGuardDependencies {
  readonly handlers: JurisprudenceRouteHandlers;
  readonly authenticator: JurisprudenceAuthenticator;
  readonly authorizationPolicy: JurisprudenceAuthorizationPolicy;
  readonly now: () => string;
  readonly requestIdGenerator: () => string;
  readonly configuration: JurisprudenceSecurityGuardConfiguration;
  readonly logger?: JurisprudenceSecurityLogger;
}

export interface SecuredPublicJurisprudenceHttpHandlers {
  search(request: Request): Promise<Response>;
  detail(request: Request, params: { slug: string }): Promise<Response>;
}

export interface SecuredInternalJurisprudenceHttpHandlers {
  create(request: Request): Promise<Response>;
  update(request: Request, params: { id: string }): Promise<Response>;
  getInternal(request: Request, params: { id: string }): Promise<Response>;
  listInternal(request: Request): Promise<Response>;
  history(request: Request, params: { id: string }): Promise<Response>;
  evaluatePublication(request: Request, params: { id: string }): Promise<Response>;
  closeService(request: Request): Promise<Response>;
}

export interface SecuredJurisprudenceRouteHandlers {
  readonly public: SecuredPublicJurisprudenceHttpHandlers;
  readonly internal: SecuredInternalJurisprudenceHttpHandlers;
  close(): Promise<void>;
}

export interface SecuredPublicOnlyJurisprudenceRouteHandlers {
  readonly public: SecuredPublicJurisprudenceHttpHandlers;
  close(): Promise<void>;
}

export type JurisprudenceRouteReadinessBlocker =
  | "authentication_provider_missing"
  | "session_or_token_strategy_missing"
  | "secret_management_missing"
  | "authorization_policy_missing"
  | "csrf_policy_missing_for_cookie_auth"
  | "cors_policy_missing"
  | "rate_limiting_missing"
  | "production_database_missing"
  | "persistence_lifecycle_missing"
  | "privacy_policy_missing"
  | "audit_retention_missing"
  | "deployment_environment_missing"
  | "route_ownership_missing"
  | "incident_response_missing"
  | "public_source_data_missing"
  | "availability_policy_missing";

export interface JurisprudenceRouteReadinessRequirement {
  readonly id: JurisprudenceRouteReadinessBlocker;
  readonly status: "satisfied" | "blocked" | "not_applicable";
  readonly scope: "public" | "internal" | "both";
}

export interface JurisprudenceRouteReadinessAssessment {
  readonly evaluatedAt: string;
  readonly policyContractsReady: true;
  readonly authorizationEngineReady: true;
  readonly securedHandlersReadyForTesting: true;
  readonly publicRoutesReadyToMount: false;
  readonly internalRoutesReadyToMount: false;
  readonly authenticationReal: false;
  readonly endpointsMounted: false;
  readonly requirements: readonly JurisprudenceRouteReadinessRequirement[];
  readonly publicBlockers: readonly JurisprudenceRouteReadinessBlocker[];
  readonly internalBlockers: readonly JurisprudenceRouteReadinessBlocker[];
}
