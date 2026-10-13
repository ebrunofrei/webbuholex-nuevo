/**
 * Hermes Subject Identity & Resolution Repository
 * Governing: docs/hermes/HERMES-PROD-A3.1-CONTROLS-DESIGN.md
 */

import { eq, and } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/database/schema";
import { subjectIdentities } from "@/database/schema/hermes-control";
import { withHermesControlRole, type HermesControlTransaction } from "@/database/roles";
import {
  HERMES_IDENTITY_PROVIDERS,
  type HermesIdentityProvider,
} from "./hermes-control-contracts";
import {
  HermesControlPersistenceError,
} from "./hermes-control-errors";
import type { WorkspaceSession } from "@/types/auth";

/**
 * Validation error for subject identity input.
 */
export class HermesSubjectIdentityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HermesSubjectIdentityValidationError";
  }
}

/**
 * Strict server-side Hermes subject identity input.
 */
export interface HermesSubjectIdentityInput {
  readonly provider: HermesIdentityProvider;
  readonly providerSubjectId: string;
}

const approvedProviders: readonly string[] = HERMES_IDENTITY_PROVIDERS;

function isHermesIdentityProvider(val: string): val is HermesIdentityProvider {
  return approvedProviders.includes(val);
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

/**
 * Validates candidate identity input against Hermes control constraints:
 * - provider must be approved (currently "auth0");
 * - providerSubjectId must be a non-empty string of length 1..128;
 * - providerSubjectId must NOT contain leading, trailing, or whitespace-only formatting;
 * - preserves exact string value and casing without normalization or trimming mutation;
 * - sessionId must NOT be used as an identity anchor.
 */
export function validateHermesSubjectIdentityInput(
  input: unknown
): HermesSubjectIdentityInput {
  if (!isRecord(input)) {
    throw new HermesSubjectIdentityValidationError("subject_identity_input_invalid");
  }

  // Reject sessionId as identity anchor
  if ("sessionId" in input && input.sessionId !== undefined && input.sessionId !== null) {
    if (input.sessionId === input.providerSubjectId) {
      throw new HermesSubjectIdentityValidationError("session_id_cannot_be_identity_anchor");
    }
  }

  const provider = input.provider;
  const providerSubjectId = input.providerSubjectId;

  if (typeof provider !== "string") {
    throw new HermesSubjectIdentityValidationError("provider_missing");
  }

  if (!isHermesIdentityProvider(provider)) {
    throw new HermesSubjectIdentityValidationError("unsupported_identity_provider");
  }

  if (typeof providerSubjectId !== "string") {
    throw new HermesSubjectIdentityValidationError("provider_subject_id_must_be_string");
  }

  if (providerSubjectId.length === 0) {
    throw new HermesSubjectIdentityValidationError("provider_subject_id_empty");
  }

  if (providerSubjectId !== providerSubjectId.trim()) {
    throw new HermesSubjectIdentityValidationError("provider_subject_id_has_whitespace");
  }

  if (providerSubjectId.length > 128) {
    throw new HermesSubjectIdentityValidationError("provider_subject_id_too_long");
  }

  return {
    provider,
    providerSubjectId,
  };
}

/**
 * Extracts and validates Hermes subject identity from a WorkspaceSession.
 * Ignores ephemeral sessionId.
 */
export function extractHermesSubjectIdentity(
  session: Pick<WorkspaceSession, "provider" | "providerSubjectId">
): HermesSubjectIdentityInput {
  return validateHermesSubjectIdentityInput({
    provider: session.provider,
    providerSubjectId: session.providerSubjectId,
  });
}

/**
 * Discriminated outcome of resolving or creating a Hermes subject.
 */
export type HermesSubjectResolutionResult =
  | {
      readonly kind: "resolved";
      readonly subjectId: string;
    }
  | {
      readonly kind: "created";
      readonly subjectId: string;
    }
  | {
      readonly kind: "unavailable";
      readonly reason: "usage_control_unavailable";
    };

/**
 * Contract for resolving a third-party identity to the internal Hermes subject UUID.
 */
export interface HermesSubjectRepository {
  resolveOrCreateSubject(
    identity: HermesSubjectIdentityInput
  ): Promise<HermesSubjectResolutionResult>;
}

export type HermesControlRoleRunner = <T>(
  callback: (tx: HermesControlTransaction) => Promise<T>
) => Promise<T>;

export type HermesSubjectResolutionHandler = (
  identity: HermesSubjectIdentityInput
) => Promise<HermesSubjectResolutionResult>;

export interface PostgresHermesSubjectRepositoryDependencies {
  readonly db?: PostgresJsDatabase<typeof schema>;
  readonly roleRunner?: HermesControlRoleRunner;
  readonly handler?: HermesSubjectResolutionHandler;
}

/**
 * PostgreSQL implementation of HermesSubjectRepository.
 *
 * Implements idempotent, race-safe subject registration using:
 * INSERT INTO subject_identities ... ON CONFLICT (provider, provider_subject_id) DO NOTHING RETURNING id
 * with deterministic fallback to SELECT id upon conflict.
 */
export class PostgresHermesSubjectRepository implements HermesSubjectRepository {
  readonly #deps: PostgresHermesSubjectRepositoryDependencies;

  constructor(deps?: PostgresHermesSubjectRepositoryDependencies) {
    this.#deps = deps ?? {};
  }

  async resolveOrCreateSubject(
    identity: HermesSubjectIdentityInput
  ): Promise<HermesSubjectResolutionResult> {
    const validated = validateHermesSubjectIdentityInput(identity);

    if (this.#deps.handler) {
      try {
        return await this.#deps.handler(validated);
      } catch (error) {
        if (error instanceof HermesSubjectIdentityValidationError) {
          throw error;
        }
        return {
          kind: "unavailable",
          reason: "usage_control_unavailable",
        };
      }
    }

    try {
      const runner = this.#resolveRunner();

      return await runner(async (tx) => {
        // Step 1: Race-safe INSERT ON CONFLICT DO NOTHING
        const inserted = await tx
          .insert(subjectIdentities)
          .values({
            provider: validated.provider,
            providerSubjectId: validated.providerSubjectId,
          })
          .onConflictDoNothing({
            target: [subjectIdentities.provider, subjectIdentities.providerSubjectId],
          })
          .returning({ id: subjectIdentities.id });

        const firstInserted = inserted[0];
        if (firstInserted && typeof firstInserted.id === "string") {
          return {
            kind: "created",
            subjectId: firstInserted.id,
          };
        }

        // Step 2: Conflict occurred; deterministically select existing subject
        const existingRows = await tx
          .select({ id: subjectIdentities.id })
          .from(subjectIdentities)
          .where(
            and(
              eq(subjectIdentities.provider, validated.provider),
              eq(subjectIdentities.providerSubjectId, validated.providerSubjectId)
            )
          )
          .limit(1);

        const firstExisting = existingRows[0];
        if (firstExisting && typeof firstExisting.id === "string") {
          return {
            kind: "resolved",
            subjectId: firstExisting.id,
          };
        }

        return {
          kind: "unavailable",
          reason: "usage_control_unavailable",
        };
      });
    } catch (error) {
      if (error instanceof HermesSubjectIdentityValidationError) {
        throw error;
      }
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
