import type {
  ExternalIdentityProviderAdapter,
  ExternalIdentityResolution,
  ExternalIdentityStatus,
  JurisprudenceRoleAssignmentRepository,
  SessionRevocationResult,
} from "@/types/authentication-configuration";
import type { JurisprudenceRole } from "@/types/jurisprudence-security";

export class TestExternalIdentityProviderAdapter implements ExternalIdentityProviderAdapter {
  resolution: ExternalIdentityResolution;
  identityStatus: ExternalIdentityStatus = { status: "active" };
  readonly revokedSessions: string[] = [];
  readonly revokedSubjects: string[] = [];
  closed = false;

  constructor(resolution: ExternalIdentityResolution) {
    this.resolution = resolution;
  }

  async resolveAuthentication(): Promise<ExternalIdentityResolution> {
    if (this.closed) return { status: "unavailable", reason: "infrastructure_error" };
    return structuredClone(this.resolution);
  }

  async revokeSession(sessionReference: string): Promise<SessionRevocationResult> {
    this.revokedSessions.push(sessionReference);
    return { status: "revoked" };
  }

  async revokeAllSessions(subjectId: string): Promise<SessionRevocationResult> {
    this.revokedSubjects.push(subjectId);
    return { status: "revoked" };
  }

  async getIdentityStatus(): Promise<ExternalIdentityStatus> {
    return structuredClone(this.identityStatus);
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

export class TestJurisprudenceRoleAssignmentRepository implements JurisprudenceRoleAssignmentRepository {
  roles: readonly JurisprudenceRole[];
  active = true;
  version = 1;

  constructor(roles: readonly JurisprudenceRole[]) {
    this.roles = roles;
  }

  async getRolesForSubject(): Promise<readonly JurisprudenceRole[]> {
    return [...this.roles];
  }

  async isSubjectActive(): Promise<boolean> {
    return this.active;
  }

  async getRoleAssignmentVersion(): Promise<number> {
    return this.version;
  }
}
