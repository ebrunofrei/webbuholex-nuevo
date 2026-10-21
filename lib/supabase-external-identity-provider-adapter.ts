import "server-only";

import type { WorkspaceSession } from "@/types/auth";
import type {
  ActiveAuthenticationConfiguration,
  ExternalIdentityProviderAdapter,
  ExternalIdentityResolution,
  ExternalIdentityStatus,
} from "@/types/authentication-configuration";

export type WorkspaceSessionResolver = () => Promise<WorkspaceSession>;

export interface SupabaseIdentityStatusClient {
  getIdentityStatus(subjectId: string): Promise<ExternalIdentityStatus>;
}

export class DefaultSupabaseIdentityStatusClient implements SupabaseIdentityStatusClient {
  async getIdentityStatus(subjectId: string): Promise<ExternalIdentityStatus> {
    if (!subjectId || subjectId.trim() === "") {
      return { status: "not_found" };
    }
    // Application/operator active status remains authoritative in PostgreSQL
    return { status: "active" };
  }
}

export class SupabaseExternalIdentityProviderAdapter implements ExternalIdentityProviderAdapter {
  private readonly configuration: ActiveAuthenticationConfiguration;
  private readonly identityStatusClient: SupabaseIdentityStatusClient;
  private readonly getSession: WorkspaceSessionResolver;

  constructor(
    configuration: ActiveAuthenticationConfiguration,
    getSession: WorkspaceSessionResolver,
    identityStatusClient: SupabaseIdentityStatusClient = new DefaultSupabaseIdentityStatusClient()
  ) {
    this.configuration = configuration;
    this.getSession = getSession;
    this.identityStatusClient = identityStatusClient;
  }

  async resolveAuthentication(_request: Request): Promise<ExternalIdentityResolution> {
    void _request;
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
      if (session.provider !== "supabase") {
        return { status: "unavailable", reason: "infrastructure_error" };
      }

      if (
        !session.providerSubjectId ||
        session.providerSubjectId.trim() === "" ||
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

      const sessionReference =
        session.sessionId && session.sessionId.trim() !== ""
          ? session.sessionId.trim()
          : session.providerSubjectId.trim();

      return {
        status: "verified",
        providerKind: this.configuration.providerKind,
        subjectId: session.providerSubjectId.trim(),
        sessionReference,
        issuer: this.configuration.issuer,
        audiences: [this.configuration.audience],
        issuedAt: session.issuedAt,
        expiresAt: session.expiresAt ?? null,
      };
    }

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
