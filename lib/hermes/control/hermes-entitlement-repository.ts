/**
 * Hermes Entitlement Repository (Read-Only)
 * Governing: docs/hermes/HERMES-PROD-A3.1-CONTROLS-DESIGN.md
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/database/schema";
import { subjectEntitlements } from "@/database/schema/hermes-control";
import { withHermesControlRole, type HermesControlTransaction } from "@/database/roles";
import {
  HERMES_ENTITLEMENT_STATUSES,
  type HermesEntitlementStatus,
} from "./hermes-control-contracts";
import {
  HermesControlPersistenceError,
} from "./hermes-control-errors";
import type { HermesControlRoleRunner } from "./hermes-subject-repository";

/**
 * Authoritative commercial entitlement record mapped from subject_entitlements.
 */
export interface HermesEntitlementRecord {
  readonly subjectId: string;
  readonly planTier: string;
  readonly status: HermesEntitlementStatus;
  readonly monthlyQuota: number;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

/**
 * Discriminated result of an entitlement lookup.
 */
export type HermesEntitlementLookupResult =
  | {
      readonly kind: "found";
      readonly entitlement: HermesEntitlementRecord;
    }
  | {
      readonly kind: "absent";
    }
  | {
      readonly kind: "unavailable";
      readonly reason: "usage_control_unavailable";
    };

/**
 * Read-only repository interface for Hermes subject entitlements.
 * Administrative authority only: runtime must NEVER insert, update, or delete entitlements.
 */
export interface HermesEntitlementRepository {
  getEntitlement(subjectId: string): Promise<HermesEntitlementLookupResult>;
}

export type HermesEntitlementLookupHandler = (
  subjectId: string
) => Promise<HermesEntitlementLookupResult>;

export interface PostgresHermesEntitlementRepositoryDependencies {
  readonly db?: PostgresJsDatabase<typeof schema>;
  readonly roleRunner?: HermesControlRoleRunner;
  readonly handler?: HermesEntitlementLookupHandler;
}

const approvedEntitlementStatuses: readonly string[] = HERMES_ENTITLEMENT_STATUSES;

function isHermesEntitlementStatus(val: string): val is HermesEntitlementStatus {
  return approvedEntitlementStatuses.includes(val);
}

/**
 * PostgreSQL implementation of HermesEntitlementRepository.
 * Strictly executes read-only SELECT queries under hermes_control_runtime role.
 */
export class PostgresHermesEntitlementRepository implements HermesEntitlementRepository {
  readonly #deps: PostgresHermesEntitlementRepositoryDependencies;

  constructor(deps?: PostgresHermesEntitlementRepositoryDependencies) {
    this.#deps = deps ?? {};
  }

  async getEntitlement(subjectId: string): Promise<HermesEntitlementLookupResult> {
    if (typeof subjectId !== "string" || subjectId.trim() === "") {
      return { kind: "absent" };
    }

    const trimmedSubjectId = subjectId.trim();

    if (this.#deps.handler) {
      try {
        return await this.#deps.handler(trimmedSubjectId);
      } catch {
        return {
          kind: "unavailable",
          reason: "usage_control_unavailable",
        };
      }
    }

    try {
      const runner = this.#resolveRunner();

      return await runner(async (tx) => {
        const rows = await tx
          .select({
            subjectId: subjectEntitlements.subjectId,
            planTier: subjectEntitlements.planTier,
            status: subjectEntitlements.status,
            monthlyQuota: subjectEntitlements.monthlyQuota,
            periodStart: subjectEntitlements.periodStart,
            periodEnd: subjectEntitlements.periodEnd,
            createdAt: subjectEntitlements.createdAt,
            updatedAt: subjectEntitlements.updatedAt,
          })
          .from(subjectEntitlements)
          .where(eq(subjectEntitlements.subjectId, trimmedSubjectId))
          .limit(1);

        const row = rows[0];
        if (!row) {
          return { kind: "absent" };
        }

        if (!isHermesEntitlementStatus(row.status)) {
          // Fail-closed against corrupted status values
          return {
            kind: "unavailable",
            reason: "usage_control_unavailable",
          };
        }

        return {
          kind: "found",
          entitlement: {
            subjectId: row.subjectId,
            planTier: row.planTier,
            status: row.status,
            monthlyQuota: row.monthlyQuota,
            periodStart: row.periodStart,
            periodEnd: row.periodEnd,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          },
        };
      });
    } catch {
      return {
        kind: "unavailable",
        reason: "usage_control_unavailable",
      };
    }
  }

  #resolveRunner(): HermesControlRoleRunner {
    if (this.#deps.roleRunner) {
      return this.#deps.roleRunner;
    }
    if (this.#deps.db) {
      const db = this.#deps.db;
      return async <T>(callback: (tx: HermesControlTransaction) => Promise<T>) =>
        withHermesControlRole(db, callback);
    }
    throw new HermesControlPersistenceError(
      "usage_control_unavailable"
    );
  }
}
