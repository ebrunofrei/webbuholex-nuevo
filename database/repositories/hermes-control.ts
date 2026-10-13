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

export {
  PostgresHermesQuotaCoordinator,
  type HermesQuotaCoordinator,
  type HermesOperationReservationInput,
  type HermesOperationReservationResult,
  type HermesFinalizationResult,
  type HermesExpiredReservationRecord,
  type HermesExpiredReservationScanResult,
  type PostgresHermesQuotaCoordinatorDependencies,
  type HermesQuotaCoordinatorHandler,
  type HermesAtomicQuotaUpsertFn,
  HermesOperationReservationValidationError,
  validateOperationReservationInput,
} from "@/lib/hermes/control/hermes-quota-coordinator";
