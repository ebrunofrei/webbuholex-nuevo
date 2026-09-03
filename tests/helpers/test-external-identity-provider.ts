import type {
  ExternalIdentityProviderAdapter,
  ExternalIdentityResolution,
  ExternalIdentityStatus,
  JurisprudenceRoleAssignmentRepository,
  SessionRevocationResult,
  JurisprudenceExternalIdentityKey,
} from "@/types/authentication-configuration";
import type { JurisprudenceRole } from "@/types/jurisprudence-security";

export class TestExternalIdentityProviderAdapter implements ExternalIdentityProviderAdapter {
  resolution: ExternalIdentityResolution;
  identityStatus: ExternalIdentityStatus = { status: "active" };
  closed = false;

  constructor(resolution: ExternalIdentityResolution) {
    this.resolution = resolution;
  }

  async resolveAuthentication(): Promise<ExternalIdentityResolution> {
    if (this.closed) return { status: "unavailable", reason: "infrastructure_error" };
    return structuredClone(this.resolution);
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

  async getRolesForSubject(identity: JurisprudenceExternalIdentityKey): Promise<readonly JurisprudenceRole[]> {
    return [...this.roles];
  }

  async isSubjectActive(identity: JurisprudenceExternalIdentityKey): Promise<boolean> {
    return this.active;
  }

  async getRoleAssignmentVersion(identity: JurisprudenceExternalIdentityKey): Promise<number> {
    return this.version;
  }
}
