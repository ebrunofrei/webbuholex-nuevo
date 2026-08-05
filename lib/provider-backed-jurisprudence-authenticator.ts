import { externalIdentityResolutionSchema } from "@/lib/schemas/external-identity";
import { jurisprudencePrincipalSchema } from "@/lib/schemas/jurisprudence-security";
import type {
  ActiveAuthenticationConfiguration,
  ExternalIdentityProviderAdapter,
  JurisprudenceRoleAssignmentRepository,
} from "@/types/authentication-configuration";
import type {
  JurisprudenceAuthenticationResult,
  JurisprudenceAuthenticator,
  JurisprudencePrincipal,
} from "@/types/jurisprudence-security";

export interface ProviderBackedJurisprudenceAuthenticatorDependencies {
  readonly configuration: ActiveAuthenticationConfiguration;
  readonly provider: ExternalIdentityProviderAdapter;
  readonly roles: JurisprudenceRoleAssignmentRepository;
  readonly now: () => string;
  readonly clockSkewSeconds?: number;
}

function anonymousPrincipal(now: string): JurisprudencePrincipal {
  return Object.freeze({
    kind: "anonymous",
    subjectId: null,
    roles: Object.freeze([]),
    authenticationLevel: "anonymous",
    issuedAt: new Date(now).toISOString(),
  });
}

export class ProviderBackedJurisprudenceAuthenticator implements JurisprudenceAuthenticator {
  readonly #dependencies: ProviderBackedJurisprudenceAuthenticatorDependencies;
  readonly #clockSkewMilliseconds: number;
  #closed = false;

  constructor(dependencies: ProviderBackedJurisprudenceAuthenticatorDependencies) {
    this.#dependencies = dependencies;
    const skew = dependencies.clockSkewSeconds ?? 60;
    if (!Number.isInteger(skew) || skew < 0 || skew > 300) {
      throw new Error("El margen de reloj de autenticación no es válido.");
    }
    this.#clockSkewMilliseconds = skew * 1_000;
  }

  async authenticate(request: Request): Promise<JurisprudenceAuthenticationResult> {
    if (this.#closed) return { status: "unavailable", reason: "infrastructure_error" };
    try {
      const parsed = externalIdentityResolutionSchema.safeParse(
        await this.#dependencies.provider.resolveAuthentication(request),
      );
      if (!parsed.success) return { status: "rejected", reason: "invalid_principal" };
      const identity = parsed.data;
      if (identity.status === "anonymous") {
        return { status: "anonymous", principal: anonymousPrincipal(this.#dependencies.now()) };
      }
      if (identity.status === "unavailable") {
        return { status: "unavailable", reason: identity.reason };
      }
      if (identity.status === "rejected") {
        return {
          status: "rejected",
          reason: identity.reason === "invalid_credentials" ? "invalid_credentials" : "invalid_principal",
        };
      }

      const now = Date.parse(this.#dependencies.now());
      const issuedAt = Date.parse(identity.issuedAt);
      const expiresAt = Date.parse(identity.expiresAt);
      const validProviderClaims = identity.providerKind === this.#dependencies.configuration.providerKind
        && identity.issuer === this.#dependencies.configuration.issuer
        && identity.audiences.includes(this.#dependencies.configuration.audience)
        && issuedAt <= now + this.#clockSkewMilliseconds
        && expiresAt > now - this.#clockSkewMilliseconds;
      if (!validProviderClaims) return { status: "rejected", reason: "invalid_principal" };

      const status = await this.#dependencies.provider.getIdentityStatus(identity.subjectId);
      if (status.status === "unavailable") return { status: "unavailable", reason: "infrastructure_error" };
      if (status.status !== "active" || !await this.#dependencies.roles.isSubjectActive(identity.subjectId)) {
        return { status: "rejected", reason: "invalid_principal" };
      }

      const [roles, roleAssignmentVersion] = await Promise.all([
        this.#dependencies.roles.getRolesForSubject(identity.subjectId),
        this.#dependencies.roles.getRoleAssignmentVersion(identity.subjectId),
      ]);
      if (roleAssignmentVersion !== identity.roleAssignmentVersion) {
        return { status: "rejected", reason: "invalid_principal" };
      }
      const principal = jurisprudencePrincipalSchema.safeParse({
        kind: "human",
        subjectId: identity.subjectId,
        roles: [...roles],
        authenticationLevel: identity.authenticationLevel,
        issuedAt: identity.issuedAt,
        expiresAt: identity.expiresAt,
        provider: "future_identity_provider",
      });
      if (!principal.success) return { status: "rejected", reason: "invalid_principal" };
      const validatedPrincipal = principal.data;
      return {
        status: "authenticated",
        principal: Object.freeze({
          kind: validatedPrincipal.kind,
          subjectId: validatedPrincipal.subjectId,
          roles: Object.freeze([...validatedPrincipal.roles]),
          authenticationLevel: validatedPrincipal.authenticationLevel,
          issuedAt: validatedPrincipal.issuedAt,
          ...(validatedPrincipal.expiresAt === undefined
            ? {}
            : { expiresAt: validatedPrincipal.expiresAt }),
          ...(validatedPrincipal.provider === undefined
            ? {}
            : { provider: validatedPrincipal.provider }),
        }),
      };
    } catch {
      return { status: "unavailable", reason: "infrastructure_error" };
    }
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    await this.#dependencies.provider.close();
  }
}
