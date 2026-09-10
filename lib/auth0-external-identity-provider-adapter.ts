import "server-only";

import type { WorkspaceSession } from "@/types/auth";
import type {
  ActiveAuthenticationConfiguration,
  ExternalIdentityProviderAdapter,
  ExternalIdentityResolution,
  ExternalIdentityStatus,
} from "@/types/authentication-configuration";

export interface IdentityStatusClient {
  getIdentityStatus(subjectId: string): Promise<ExternalIdentityStatus>;
}

export type WorkspaceSessionResolver = () => Promise<WorkspaceSession>;

export class Auth0ExternalIdentityProviderAdapter implements ExternalIdentityProviderAdapter {
  private readonly configuration: ActiveAuthenticationConfiguration;
  private readonly identityStatusClient: IdentityStatusClient;
  private readonly getSession: WorkspaceSessionResolver;

  constructor(
    configuration: ActiveAuthenticationConfiguration,
    identityStatusClient: IdentityStatusClient,
    getSession: WorkspaceSessionResolver
  ) {
    this.configuration = configuration;
    this.identityStatusClient = identityStatusClient;
    this.getSession = getSession;
  }

  async resolveAuthentication(_request: Request): Promise<ExternalIdentityResolution> {
    let session: WorkspaceSession;
    try {
      session = await this.getSession();
    } catch {
      return { status: "unavailable", reason: "infrastructure_error" };
    }

    if (session.status === "not_configured") {
      return { status: "unavailable", reason: "infrastructure_error" };
    }

    if (session.status === "unauthenticated") {
      return { status: "anonymous" };
    }

    if (session.status === "loading") {
      return { status: "unavailable", reason: "infrastructure_error" };
    }

    if (session.status === "authenticated") {
      if (session.provider !== "auth0") {
        return { status: "unavailable", reason: "infrastructure_error" };
      }

      if (
        !session.providerSubjectId ||
        session.providerSubjectId.trim() === "" ||
        !session.sessionId ||
        session.sessionId.trim() === "" ||
        !session.issuedAt ||
        session.issuedAt.trim() === "" ||
        Number.isNaN(Date.parse(session.issuedAt))
      ) {
        return { status: "unavailable", reason: "infrastructure_error" };
      }

      if (session.expiresAt !== null) {
        if (session.expiresAt.trim() === "" || Number.isNaN(Date.parse(session.expiresAt))) {
          return { status: "unavailable", reason: "infrastructure_error" };
        }
      }

      return {
        status: "verified",
        providerKind: this.configuration.providerKind,
        subjectId: session.providerSubjectId,
        sessionReference: session.sessionId,
        issuer: this.configuration.issuer,
        audiences: [this.configuration.audience],
        issuedAt: session.issuedAt,
        expiresAt: session.expiresAt ?? null,
      };
    }

    // Fallback for any unknown status
    return { status: "unavailable", reason: "infrastructure_error" };
  }

  async getIdentityStatus(subjectId: string): Promise<ExternalIdentityStatus> {
    try {
      return await this.identityStatusClient.getIdentityStatus(subjectId);
    } catch {
      return { status: "unavailable" };
    }
  }

  async close(): Promise<void> {
    return;
  }
}
