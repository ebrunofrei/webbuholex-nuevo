import type { JurisprudenceAuthenticationLevel, JurisprudenceRole } from "@/types/jurisprudence-security";

export type AuthenticationProviderKind = "auth0_oidc";
export type AuthenticationEnvironment = "test" | "development" | "staging" | "production";
export type AuthenticationSessionStrategy = "stateful";
export type AuthenticationRoleSource = "internal_repository";
export type AuthenticationSameSite = "lax" | "strict";

export interface AuthenticationSecretReference {
  readonly kind: "environment" | "managed_secret_store";
  readonly key: string;
}

export interface AuthenticationCookiePolicy {
  readonly name: string;
  readonly httpOnly: true;
  readonly secure: boolean;
  readonly sameSite: AuthenticationSameSite;
  readonly path: "/";
}

export interface ConfiguredAuthenticationSettings {
  readonly providerKind: AuthenticationProviderKind;
  readonly issuer: string;
  readonly clientId: string;
  readonly audience: string;
  readonly sessionStrategy: AuthenticationSessionStrategy;
  readonly cookie: AuthenticationCookiePolicy;
  readonly absoluteTtlSeconds: number;
  readonly idleTtlSeconds: number;
  readonly allowedOrigins: readonly string[];
  readonly environment: AuthenticationEnvironment;
  readonly roleSource: AuthenticationRoleSource;
  readonly clientSecretReference: AuthenticationSecretReference;
  readonly sessionSecretReference: AuthenticationSecretReference;
}

export type AuthenticationConfiguration =
  | { readonly status: "not_configured" }
  | ({ readonly status: "configured_for_test" } & ConfiguredAuthenticationSettings)
  | ({ readonly status: "configured" } & ConfiguredAuthenticationSettings)
  | { readonly status: "invalid"; readonly reason: "missing_field" | "invalid_value" }
  | { readonly status: "unavailable"; readonly reason: "secret_provider_unavailable" | "identity_provider_unavailable" };

export type ActiveAuthenticationConfiguration = Extract<
  AuthenticationConfiguration,
  { readonly status: "configured" | "configured_for_test" }
>;

export type ExternalIdentityResolution =
  | { readonly status: "anonymous" }
  | { readonly status: "rejected"; readonly reason: "invalid_credentials" | "invalid_claims" | "expired" | "revoked" }
  | { readonly status: "unavailable"; readonly reason: "not_configured" | "infrastructure_error" }
  | {
      readonly status: "verified";
      readonly providerKind: AuthenticationProviderKind;
      readonly subjectId: string;
      readonly sessionReference: string;
      readonly issuer: string;
      readonly audiences: readonly string[];
      readonly issuedAt: string;
      readonly expiresAt: string;
      readonly authenticationLevel: Exclude<JurisprudenceAuthenticationLevel, "anonymous" | "test_only">;
      readonly roleAssignmentVersion: number;
      readonly signatureVerified: true;
      readonly claimsValidated: true;
    };

export type ExternalIdentityStatus =
  | { readonly status: "active" }
  | { readonly status: "suspended" }
  | { readonly status: "revoked" }
  | { readonly status: "not_found" }
  | { readonly status: "unavailable" };

export type SessionRevocationResult =
  | { readonly status: "revoked" }
  | { readonly status: "not_found" }
  | { readonly status: "unavailable" };

export interface ExternalIdentityProviderAdapter {
  resolveAuthentication(request: Request): Promise<ExternalIdentityResolution>;
  revokeSession(sessionReference: string): Promise<SessionRevocationResult>;
  revokeAllSessions(subjectId: string): Promise<SessionRevocationResult>;
  getIdentityStatus(subjectId: string): Promise<ExternalIdentityStatus>;
  close(): Promise<void>;
}

export interface JurisprudenceRoleAssignmentRepository {
  getRolesForSubject(subjectId: string): Promise<readonly JurisprudenceRole[]>;
  isSubjectActive(subjectId: string): Promise<boolean>;
  getRoleAssignmentVersion(subjectId: string): Promise<number>;
}

export type AuthenticationSecretResolution =
  | { readonly status: "resolved"; readonly value: Uint8Array }
  | { readonly status: "not_found" }
  | { readonly status: "unavailable" };

export interface AuthenticationSecretProvider {
  resolve(reference: AuthenticationSecretReference): Promise<AuthenticationSecretResolution>;
}

export type AuthenticationAuditEventName =
  | "sign_in_succeeded"
  | "sign_in_failed"
  | "session_created"
  | "session_rotated"
  | "session_revoked"
  | "all_sessions_revoked"
  | "sign_out"
  | "identity_disabled"
  | "role_assignment_changed"
  | "provider_unavailable";

export interface AuthenticationAuditEvent {
  readonly eventId: string;
  readonly occurredAt: string;
  readonly event: AuthenticationAuditEventName;
  readonly actorReference?: string;
  readonly sessionReference?: string;
  readonly providerKind: AuthenticationProviderKind;
  readonly resultCode: string;
  readonly requestId: string;
  readonly environment: AuthenticationEnvironment;
}

export interface AuthenticationAuditLogger {
  log(event: AuthenticationAuditEvent): void;
}

export interface AuthenticationActorReferenceFactory {
  create(subjectId: string): string;
}
