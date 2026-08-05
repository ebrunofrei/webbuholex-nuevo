import type {
  JurisprudenceAuthorizationDecision,
  JurisprudencePermission,
  JurisprudencePrincipal,
  JurisprudenceRole,
  JurisprudenceSecurityOperation,
  JurisprudenceAuthenticationLevel,
  JurisprudenceAuthorizationReasonCode,
} from "@/types/jurisprudence-security";
import { JURISPRUDENCE_SECURITY_POLICY_VERSION } from "@/types/jurisprudence-security";

// Mapeo exhaustivo de las 10 operaciones a sus permisos requeridos
export const OPERATION_TO_PERMISSION_MAP: Record<JurisprudenceSecurityOperation, JurisprudencePermission> = {
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
};

// Roles de autorización y sus permisos asociados
export const ROLE_PERMISSIONS: Record<JurisprudenceRole, readonly JurisprudencePermission[]> = {
  jurisprudence_reader: [
    "jurisprudence.public.search",
    "jurisprudence.public.read_detail",
    "jurisprudence.internal.list",
    "jurisprudence.internal.read",
    "jurisprudence.internal.read_history",
  ],
  jurisprudence_editor: [
    "jurisprudence.public.search",
    "jurisprudence.public.read_detail",
    "jurisprudence.internal.list",
    "jurisprudence.internal.read",
    "jurisprudence.internal.read_history",
    "jurisprudence.internal.create",
    "jurisprudence.internal.update_editorial",
    "jurisprudence.internal.update_source",
  ],
  jurisprudence_reviewer: [
    "jurisprudence.public.search",
    "jurisprudence.public.read_detail",
    "jurisprudence.internal.list",
    "jurisprudence.internal.read",
    "jurisprudence.internal.read_history",
    "jurisprudence.internal.evaluate_publication",
  ],
  jurisprudence_publisher: [
    "jurisprudence.public.search",
    "jurisprudence.public.read_detail",
    "jurisprudence.internal.list",
    "jurisprudence.internal.read",
    "jurisprudence.internal.read_history",
    "jurisprudence.internal.publish",
    "jurisprudence.internal.unpublish",
  ],
  jurisprudence_auditor: [
    "jurisprudence.public.search",
    "jurisprudence.public.read_detail",
    "jurisprudence.internal.list",
    "jurisprudence.internal.read",
    "jurisprudence.internal.read_history",
    "jurisprudence.internal.audit",
  ],
  jurisprudence_admin: [
    "jurisprudence.public.search",
    "jurisprudence.public.read_detail",
    "jurisprudence.internal.list",
    "jurisprudence.internal.read",
    "jurisprudence.internal.read_history",
    "jurisprudence.internal.create",
    "jurisprudence.internal.update_editorial",
    "jurisprudence.internal.update_source",
    "jurisprudence.internal.evaluate_publication",
    "jurisprudence.internal.publish",
    "jurisprudence.internal.unpublish",
    "jurisprudence.internal.audit",
    "jurisprudence.internal.close_service",
  ],
  system_service: [
    "jurisprudence.public.search",
    "jurisprudence.public.read_detail",
    "jurisprudence.internal.list",
    "jurisprudence.internal.read",
    "jurisprudence.internal.create",
    "jurisprudence.internal.update_editorial",
    "jurisprudence.internal.update_source",
  ],
};

const PUBLIC_PERMISSIONS: ReadonlySet<JurisprudencePermission> = new Set([
  "jurisprudence.public.search",
  "jurisprudence.public.read_detail",
]);

/**
 * Deriva de forma pura los permisos efectivos que posee un principal en base a sus roles
 */
export function deriveEffectiveJurisprudencePermissions(
  principal: JurisprudencePrincipal
): ReadonlySet<JurisprudencePermission> {
  const permissions = new Set<JurisprudencePermission>();
  for (const role of principal.roles) {
    const rolePerms = ROLE_PERMISSIONS[role];
    if (rolePerms) {
      for (const perm of rolePerms) {
        permissions.add(perm);
      }
    }
  }
  return permissions;
}

/**
 * Comprueba si un principal tiene asignado un permiso efectivo
 */
export function hasEffectiveJurisprudencePermission(
  principal: JurisprudencePrincipal,
  permission: JurisprudencePermission
): boolean {
  if (!principal || !principal.roles) return false;
  const effectivePermissions = deriveEffectiveJurisprudencePermissions(principal);
  return effectivePermissions.has(permission);
}

const AUTHENTICATION_LEVELS: Record<JurisprudenceAuthenticationLevel, number> = {
  anonymous: 0,
  test_only: 1,
  authenticated: 2,
  strong_authenticated: 3,
};

function hasRequiredAuthenticationLevel(
  actualLevel: JurisprudenceAuthenticationLevel,
  requiredLevel: JurisprudenceAuthenticationLevel
): boolean {
  return AUTHENTICATION_LEVELS[actualLevel] >= AUTHENTICATION_LEVELS[requiredLevel];
}

/**
 * Type guard puro para estrechar un input desconocido a JurisprudenceSecurityOperation
 */
function isKnownOperation(operation: unknown): operation is JurisprudenceSecurityOperation {
  return typeof operation === "string" && operation in OPERATION_TO_PERMISSION_MAP;
}

/**
 * Núcleo puro de evaluación de políticas de autorización
 */
export function evaluateJurisprudenceAuthorization(
  input: unknown
): JurisprudenceAuthorizationDecision {
  if (!input || typeof input !== "object") {
    return createDenyDecision("POLICY_ERROR", "jurisprudence.public.search", "anonymous", new Date().toISOString());
  }

  const typedInput = input as Record<string, unknown>;
  const principal = typedInput.principal as JurisprudencePrincipal | undefined;
  const operation = typedInput.operation;
  const evaluatedAt = typeof typedInput.evaluatedAt === "string" ? typedInput.evaluatedAt : new Date().toISOString();
  const allowTestPrincipals = typedInput.allowTestPrincipals === true;

  // 1. Default deny por operación desconocida o inconsistente
  if (!isKnownOperation(operation)) {
    return createDenyDecision("POLICY_ERROR", "jurisprudence.public.search", principal?.kind ?? "anonymous", evaluatedAt);
  }

  const requiredPermission = OPERATION_TO_PERMISSION_MAP[operation];

  // 2. Validación estructural de principal
  if (!principal || !principal.kind || !principal.authenticationLevel || !Array.isArray(principal.roles)) {
    return createDenyDecision("INVALID_PRINCIPAL", requiredPermission, "anonymous", evaluatedAt);
  }

  // 3. Test principals evaluation
  if (principal.authenticationLevel === "test_only" && !allowTestPrincipals) {
    return createDenyDecision("INVALID_PRINCIPAL", requiredPermission, principal.kind, evaluatedAt);
  }

  // 4. Determinar nivel requerido. Operaciones públicas requieren anonymous, internas authenticated, close requires strong.
  let minimumRequiredLevel: JurisprudenceAuthenticationLevel = "authenticated";
  if (PUBLIC_PERMISSIONS.has(requiredPermission)) {
    minimumRequiredLevel = "anonymous";
  } else if (operation === "close") {
    minimumRequiredLevel = "strong_authenticated";
  }

  // 5. Validar nivel de autenticación
  if (!hasRequiredAuthenticationLevel(principal.authenticationLevel, minimumRequiredLevel)) {
    if (minimumRequiredLevel === "anonymous" || principal.authenticationLevel === "anonymous") {
      return createDenyDecision("AUTHENTICATION_REQUIRED", requiredPermission, principal.kind, evaluatedAt);
    }
    return createDenyDecision("MISSING_PERMISSION", requiredPermission, principal.kind, evaluatedAt);
  }

  // 6. Principales anónimos
  if (principal.authenticationLevel === "anonymous") {
    if (PUBLIC_PERMISSIONS.has(requiredPermission)) {
      return createAllowDecision("ANONYMOUS_ALLOWED", requiredPermission, principal.kind, evaluatedAt);
    }
    return createDenyDecision("AUTHENTICATION_REQUIRED", requiredPermission, principal.kind, evaluatedAt);
  }

  // 7. Derivar permisos y validar requerimiento
  if (hasEffectiveJurisprudencePermission(principal, requiredPermission)) {
    return createAllowDecision("ALLOWED", requiredPermission, principal.kind, evaluatedAt);
  }

  // 8. Default deny final
  return createDenyDecision("MISSING_PERMISSION", requiredPermission, principal.kind, evaluatedAt);
}

// Helpers para crear la estructura inmutable de decisión

function createAllowDecision(
  reasonCode: JurisprudenceAuthorizationReasonCode,
  requiredPermission: JurisprudencePermission,
  principalKind: "anonymous" | "service" | "human",
  evaluatedAt: string
): JurisprudenceAuthorizationDecision {
  return {
    allowed: true,
    reasonCode,
    requiredPermission,
    principalKind,
    evaluatedAt,
    policyVersion: JURISPRUDENCE_SECURITY_POLICY_VERSION,
  };
}

function createDenyDecision(
  reasonCode: JurisprudenceAuthorizationReasonCode,
  requiredPermission: JurisprudencePermission,
  principalKind: "anonymous" | "service" | "human",
  evaluatedAt: string
): JurisprudenceAuthorizationDecision {
  return {
    allowed: false,
    reasonCode,
    requiredPermission,
    principalKind,
    evaluatedAt,
    policyVersion: JURISPRUDENCE_SECURITY_POLICY_VERSION,
  };
}
