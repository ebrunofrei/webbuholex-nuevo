import { jurisprudencePrincipalSchema } from "@/lib/schemas/jurisprudence-security";
import type {
  JurisprudenceAuthorizationDecision,
  JurisprudenceAuthorizationPolicy,
  JurisprudenceAuthorizationPolicyInput,
  JurisprudencePermission,
  JurisprudencePrincipal,
  JurisprudenceRole,
  JurisprudenceSecurityOperation,
} from "@/types/jurisprudence-security";
import { JURISPRUDENCE_SECURITY_POLICY_VERSION } from "@/types/jurisprudence-security";

const publicPermissions = [
  "jurisprudence.public.search",
  "jurisprudence.public.read_detail",
] as const satisfies readonly JurisprudencePermission[];
const publicPermissionSet: ReadonlySet<JurisprudencePermission> = new Set<JurisprudencePermission>(publicPermissions);

export const JURISPRUDENCE_ROLE_PERMISSIONS = Object.freeze({
  jurisprudence_reader: Object.freeze([
    ...publicPermissions,
    "jurisprudence.internal.list",
    "jurisprudence.internal.read",
  ]),
  jurisprudence_editor: Object.freeze([
    ...publicPermissions,
    "jurisprudence.internal.list",
    "jurisprudence.internal.read",
    "jurisprudence.internal.create",
    "jurisprudence.internal.update_editorial",
  ]),
  jurisprudence_reviewer: Object.freeze([
    ...publicPermissions,
    "jurisprudence.internal.list",
    "jurisprudence.internal.read",
    "jurisprudence.internal.read_history",
    "jurisprudence.internal.evaluate_publication",
  ]),
  jurisprudence_publisher: Object.freeze([
    ...publicPermissions,
    "jurisprudence.internal.list",
    "jurisprudence.internal.read",
    "jurisprudence.internal.read_history",
    "jurisprudence.internal.evaluate_publication",
    "jurisprudence.internal.publish",
    "jurisprudence.internal.unpublish",
  ]),
  jurisprudence_auditor: Object.freeze([
    "jurisprudence.internal.list",
    "jurisprudence.internal.read",
    "jurisprudence.internal.read_history",
    "jurisprudence.internal.audit",
  ]),
  jurisprudence_admin: Object.freeze([
    ...publicPermissions,
    "jurisprudence.internal.list",
    "jurisprudence.internal.read",
    "jurisprudence.internal.read_history",
    "jurisprudence.internal.evaluate_publication",
    "jurisprudence.internal.create",
    "jurisprudence.internal.update_editorial",
    "jurisprudence.internal.update_source",
    "jurisprudence.internal.publish",
    "jurisprudence.internal.unpublish",
    "jurisprudence.internal.audit",
    "jurisprudence.internal.close_service",
  ]),
  system_service: Object.freeze([
    "jurisprudence.internal.list",
    "jurisprudence.internal.read",
    "jurisprudence.internal.close_service",
  ]),
} as const satisfies Readonly<Record<JurisprudenceRole, readonly JurisprudencePermission[]>>);

export const JURISPRUDENCE_OPERATION_PERMISSIONS = Object.freeze({
  search_public: "jurisprudence.public.search",
  get_public_detail: "jurisprudence.public.read_detail",
  list_internal: "jurisprudence.internal.list",
  get_internal: "jurisprudence.internal.read",
  create_record: "jurisprudence.internal.create",
  update_editorial: "jurisprudence.internal.update_editorial",
  update_source: "jurisprudence.internal.update_source",
  evaluate_publication: "jurisprudence.internal.evaluate_publication",
  get_history: "jurisprudence.internal.read_history",
  close: "jurisprudence.internal.close_service",
} as const satisfies Readonly<Record<JurisprudenceSecurityOperation, JurisprudencePermission>>);

export function validateJurisprudencePrincipal(principal: JurisprudencePrincipal): boolean {
  return jurisprudencePrincipalSchema.safeParse(principal).success;
}

export function isJurisprudencePrincipalExpired(principal: JurisprudencePrincipal, evaluatedAt: string): boolean {
  return principal.expiresAt !== undefined && Date.parse(principal.expiresAt) <= Date.parse(evaluatedAt);
}

export function getPermissionsForJurisprudenceRoles(roles: readonly JurisprudenceRole[]): ReadonlySet<JurisprudencePermission> {
  const permissions = new Set<JurisprudencePermission>();
  for (const role of roles) for (const permission of JURISPRUDENCE_ROLE_PERMISSIONS[role]) permissions.add(permission);
  return permissions;
}

export function hasJurisprudencePermission(
  principal: JurisprudencePrincipal,
  permission: JurisprudencePermission,
): boolean {
  if (principal.kind === "anonymous") return publicPermissionSet.has(permission);
  return getPermissionsForJurisprudenceRoles(principal.roles).has(permission);
}

export function authorizeJurisprudenceOperation(
  input: JurisprudenceAuthorizationPolicyInput,
): JurisprudenceAuthorizationDecision {
  const requiredPermission = JURISPRUDENCE_OPERATION_PERMISSIONS[input.operation];
  const base = {
    requiredPermission,
    principalKind: input.principal.kind,
    evaluatedAt: new Date(input.evaluatedAt).toISOString(),
    policyVersion: JURISPRUDENCE_SECURITY_POLICY_VERSION,
  } as const;
  if (!validateJurisprudencePrincipal(input.principal)) return { ...base, allowed: false, reasonCode: "INVALID_PRINCIPAL" };
  if (input.principal.authenticationLevel === "test_only" && !input.allowTestPrincipals) {
    return { ...base, allowed: false, reasonCode: "INVALID_PRINCIPAL" };
  }
  if (isJurisprudencePrincipalExpired(input.principal, base.evaluatedAt)) {
    return { ...base, allowed: false, reasonCode: "EXPIRED_PRINCIPAL" };
  }
  if (input.principal.kind === "anonymous") {
    return hasJurisprudencePermission(input.principal, requiredPermission)
      ? { ...base, allowed: true, reasonCode: "ANONYMOUS_ALLOWED" }
      : { ...base, allowed: false, reasonCode: "AUTHENTICATION_REQUIRED" };
  }
  return hasJurisprudencePermission(input.principal, requiredPermission)
    ? { ...base, allowed: true, reasonCode: "ALLOWED" }
    : { ...base, allowed: false, reasonCode: "MISSING_PERMISSION" };
}

export const defaultJurisprudenceAuthorizationPolicy: JurisprudenceAuthorizationPolicy = Object.freeze({
  authorize: authorizeJurisprudenceOperation,
});
