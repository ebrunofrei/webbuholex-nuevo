import "server-only";
import { eq, and } from "drizzle-orm";
import type { JurisprudenceRole } from "@/types/jurisprudence-security";
import type { JurisprudenceExternalIdentityKey, JurisprudenceRoleAssignmentRepository } from "@/types/authentication-configuration";
import { getJurisprudenceAuthorizationDatabase } from "@/database/client";
import { withJurisprudenceAuthorizationRole } from "@/database/roles";
import { jurisprudenceRoleSchema } from "@/lib/schemas/jurisprudence-security";
import { operators, externalIdentityBindings, operatorJurisprudenceRoles, operatorJurisprudenceRoleSets } from "@/database/schema/authorization";

export function mapProviderToDatabaseIdentifier(providerKind: string): "auth0" {
  if (providerKind === "auth0_oidc") {
    return "auth0";
  }
  throw new Error(`unsupported_provider_kind: ${providerKind}`);
}

export class PostgresJurisprudenceRoleAssignmentRepository implements JurisprudenceRoleAssignmentRepository {

  async getRolesForSubject(identity: JurisprudenceExternalIdentityKey): Promise<readonly JurisprudenceRole[]> {
    const db = getJurisprudenceAuthorizationDatabase();
    return await withJurisprudenceAuthorizationRole(db, async (tx) => {
      const provider = mapProviderToDatabaseIdentifier(identity.providerKind);

      const bindingRows = await tx.select({ operatorId: externalIdentityBindings.operatorId })
        .from(externalIdentityBindings)
        .where(
          and(
            eq(externalIdentityBindings.provider, provider),
            eq(externalIdentityBindings.externalSubjectId, identity.subjectId)
          )
        )
        .limit(1);

      if (bindingRows.length === 0) {
        return [];
      }
      const operatorId = bindingRows[0]!.operatorId;

      const roleRows = await tx.select({ role: operatorJurisprudenceRoles.role })
        .from(operatorJurisprudenceRoles)
        .where(eq(operatorJurisprudenceRoles.operatorId, operatorId));

      return roleRows
        .map(r => r.role)
        .flatMap(role => {
          const parsed = jurisprudenceRoleSchema.safeParse(role);
          return parsed.success ? [parsed.data] : [];
        });
    });
  }

  async isSubjectActive(identity: JurisprudenceExternalIdentityKey): Promise<boolean> {
    const db = getJurisprudenceAuthorizationDatabase();
    return await withJurisprudenceAuthorizationRole(db, async (tx) => {
      const provider = mapProviderToDatabaseIdentifier(identity.providerKind);

      const rows = await tx.select({ status: operators.status })
        .from(externalIdentityBindings)
        .innerJoin(operators, eq(externalIdentityBindings.operatorId, operators.id))
        .where(
          and(
            eq(externalIdentityBindings.provider, provider),
            eq(externalIdentityBindings.externalSubjectId, identity.subjectId)
          )
        )
        .limit(1);

      if (rows.length === 0) {
        return false;
      }
      return rows[0]!.status === "active";
    });
  }

  async getRoleAssignmentVersion(identity: JurisprudenceExternalIdentityKey): Promise<number> {
    const db = getJurisprudenceAuthorizationDatabase();
    return await withJurisprudenceAuthorizationRole(db, async (tx) => {
      const provider = mapProviderToDatabaseIdentifier(identity.providerKind);

      const bindingRows = await tx.select({ operatorId: externalIdentityBindings.operatorId })
        .from(externalIdentityBindings)
        .where(
          and(
            eq(externalIdentityBindings.provider, provider),
            eq(externalIdentityBindings.externalSubjectId, identity.subjectId)
          )
        )
        .limit(1);

      if (bindingRows.length === 0) {
        return 0; // Unknown external identity: 0
      }
      const operatorId = bindingRows[0]!.operatorId;

      const setRows = await tx.select({ version: operatorJurisprudenceRoleSets.version })
        .from(operatorJurisprudenceRoleSets)
        .where(eq(operatorJurisprudenceRoleSets.operatorId, operatorId))
        .limit(1);

      if (setRows.length === 0) {
        return 1; // Known operator with no role_sets row is logically version 1
      }

      const version = setRows[0]!.version;
      if (typeof version !== "number" || version < 1) {
        throw new Error("infrastructure_error: invalid_persisted_version");
      }

      return version;
    });
  }
}
