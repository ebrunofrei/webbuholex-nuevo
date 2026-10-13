/**
 * Hermes Control Database Repositories
 * Governing: docs/hermes/HERMES-PROD-A3.1-CONTROLS-DESIGN.md
 */

export {
  PostgresHermesSubjectRepository,
  type HermesSubjectRepository,
  type HermesSubjectIdentityInput,
  type HermesSubjectResolutionResult,
  type PostgresHermesSubjectRepositoryDependencies,
  type HermesControlRoleRunner,
  type HermesSubjectResolutionHandler,
  HermesSubjectIdentityValidationError,
  validateHermesSubjectIdentityInput,
  extractHermesSubjectIdentity,
} from "@/lib/hermes/control/hermes-subject-repository";

export {
  PostgresHermesEntitlementRepository,
  type HermesEntitlementRepository,
  type HermesEntitlementRecord,
  type HermesEntitlementLookupResult,
  type PostgresHermesEntitlementRepositoryDependencies,
  type HermesEntitlementLookupHandler,
} from "@/lib/hermes/control/hermes-entitlement-repository";

export {
  HermesControlPersistenceError,
} from "@/lib/hermes/control/hermes-control-errors";
