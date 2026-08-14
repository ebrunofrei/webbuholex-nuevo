import { eq, and, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../schema";
import type {
  ComplaintsPersistenceAdapter,
  ComplaintTransactionExecutor,
  ComplaintInsertInput,
  ComplaintStatusHistoryInsertInput,
  ComplaintOutboxInsertInput,
  ComplaintAuditInsertInput,
  ComplaintsOutboxWorkerPersistenceAdapter
} from "../repositories/complaints.types";
import { SanitizedDatabaseConstraintError, createComplaintPersistenceError } from "../repositories/complaints.errors";
import { ComplaintsTransaction, withComplaintsApiRole, withComplaintsAdminRole } from "../roles";
import type { ComplaintStatus } from "@/lib/complaints/complaint.types";
import type { ComplaintProviderResponseInsertInput, ComplaintAdminTransactionExecutor, ComplaintsAdminPersistenceAdapter } from "../repositories/complaints.types";

function findPostgresError(error: unknown, depth: number = 0): Record<string, unknown> | null {
  if (depth > 5 || typeof error !== "object" || error === null) return null;

  if (error instanceof Error && error.name === "ComplaintPersistenceError") return null;
  if (error instanceof SanitizedDatabaseConstraintError) return null;

  const record = error as Record<string, unknown>;
  // Postgres SQLSTATE codes are exactly 5 alphanumeric characters
  if (typeof record.code === "string" && /^[0-9A-Z]{5}$/.test(record.code)) {
    return record;
  }

  if ("cause" in record && record.cause !== undefined) {
    return findPostgresError(record.cause, depth + 1);
  }

  return null;
}

function translateDatabaseError(error: unknown): unknown {
  const pgError = findPostgresError(error);
  if (pgError) {
    const code = pgError.code as string;
    const constraint = typeof pgError.constraint_name === "string" && pgError.constraint_name.trim() !== ""
      ? pgError.constraint_name
      : null;

    return new SanitizedDatabaseConstraintError(code, constraint);
  }
  return error;
}

class DrizzleComplaintTransactionExecutor implements ComplaintTransactionExecutor {
  constructor(private readonly tx: ComplaintsTransaction) {}

  async reserveAnnualSequence(year: number): Promise<number> {
    try {
      const rows = await this.tx
        .insert(schema.complaintSequences)
        .values({
          year,
          lastValue: 1,
        })
        .onConflictDoUpdate({
          target: schema.complaintSequences.year,
          set: {
            lastValue: sql`${schema.complaintSequences.lastValue} + 1`,
            updatedAt: sql`now()`,
          },
        })
        .returning({
          lastValue: schema.complaintSequences.lastValue,
        });

      if (rows.length !== 1 || !rows[0]) {
        throw createComplaintPersistenceError("complaint_sequence_failed");
      }

      const seq = rows[0].lastValue;
      if (typeof seq !== "number" || !Number.isInteger(seq)) {
        throw createComplaintPersistenceError("complaint_sequence_failed");
      }

      return seq;
    } catch (error) {
      const translated = translateDatabaseError(error);
      throw translated;
    }
  }

  async insertComplaint(row: ComplaintInsertInput): Promise<{ id: string; sheetNumber: string }> {
    try {
      const result = await this.tx
        .insert(schema.complaints)
        .values(row)
        .returning({
          id: schema.complaints.id,
          sheetNumber: schema.complaints.sheetNumber,
        });

      if (result.length !== 1 || !result[0] || typeof result[0].id !== "string" || typeof result[0].sheetNumber !== "string") {
        throw createComplaintPersistenceError("complaint_persistence_failed");
      }

      return result[0];
    } catch (error) {
      throw translateDatabaseError(error);
    }
  }

  async insertInitialStatusHistory(row: ComplaintStatusHistoryInsertInput): Promise<void> {
    try {
      await this.tx
        .insert(schema.complaintStatusHistory)
        .values(row);
    } catch (error) {
      throw translateDatabaseError(error);
    }
  }



  async insertReceiptOutbox(row: ComplaintOutboxInsertInput): Promise<void> {
    try {
      await this.tx
        .insert(schema.complaintOutbox)
        .values(row);
    } catch (error) {
      throw translateDatabaseError(error);
    }
  }

  async insertCreatedAuditEvent(row: ComplaintAuditInsertInput): Promise<void> {
    try {
      await this.tx
        .insert(schema.complaintAuditEvents)
        .values(row);
    } catch (error) {
      throw translateDatabaseError(error);
    }
  }
}

function createCoreAdapter(
  runInRole: <T>(callback: (tx: ComplaintsTransaction) => Promise<T>) => Promise<T>
): ComplaintsPersistenceAdapter {
  return {
    async findByIdempotencyDigest(
      digest: string,
      keyVersion: number
    ): Promise<{ id: string; sheetNumber: string; status: "received" | "under_review" | "awaiting_information" | "answered" | "closed"; submittedAt: Date; deadlineAt: string } | null> {
      try {
        return await runInRole(async (tx) => {
          const rows = await tx
            .select({
              id: schema.complaints.id,
              sheetNumber: schema.complaints.sheetNumber,
              status: schema.complaints.status,
              submittedAt: schema.complaints.submittedAt,
              deadlineAt: schema.complaints.deadlineAt,
            })
            .from(schema.complaints)
            .where(
              and(
                eq(schema.complaints.idempotencyKeyHash, digest),
                eq(schema.complaints.idempotencyHashKeyVersion, keyVersion)
              )
            )
            .limit(1);

          if (rows.length === 0) {
            return null;
          }

          const row = rows[0];
          if (
            !row ||
            typeof row.id !== "string" ||
            typeof row.sheetNumber !== "string" ||
            typeof row.status !== "string" ||
            !(row.submittedAt instanceof Date) ||
            typeof row.deadlineAt !== "string"
          ) {
            return null;
          }

          return row as { id: string; sheetNumber: string; status: "received" | "under_review" | "awaiting_information" | "answered" | "closed"; submittedAt: Date; deadlineAt: string };
        });
      } catch (error) {
        throw translateDatabaseError(error);
      }
    },

    async transaction<T>(
      executor: (tx: ComplaintTransactionExecutor) => Promise<T>
    ): Promise<T> {
      try {
        return await runInRole(async (tx) => {
          // runInRole ya establece la transacción y el rol.
          // Inyectamos el tx directamente al executor.
          const wrapper = new DrizzleComplaintTransactionExecutor(tx);
          return await executor(wrapper);
        });
      } catch (error) {
        throw translateDatabaseError(error);
      }
    }
  };
}

export function createComplaintsApiPersistenceAdapter(
  db: PostgresJsDatabase<typeof schema>,
): ComplaintsPersistenceAdapter {
  if (!db || typeof db.transaction !== "function" || typeof db.select !== "function") {
    throw new Error("Invalid database dependency provided.");
  }
  return createCoreAdapter((callback) => withComplaintsApiRole(db, callback));
}

export function createComplaintsWorkerPersistenceAdapter(
  db: PostgresJsDatabase<typeof schema>,
): ComplaintsOutboxWorkerPersistenceAdapter {
  if (!db || typeof db.transaction !== "function" || typeof db.select !== "function") {
    throw new Error("Invalid database dependency provided.");
  }
  // At present, the Worker adapter exposes no functional methods as outbox processing
  // is not yet implemented. This prevents the worker from accidentally accessing API methods.
  return {};
}

class DrizzleComplaintAdminTransactionExecutor implements ComplaintAdminTransactionExecutor {
  constructor(private readonly tx: ComplaintsTransaction) {}

  async getComplaintForUpdate(complaintId: string): Promise<{ id: string; status: ComplaintStatus } | null> {
    try {
      const rows = await this.tx
        .select({
          id: schema.complaints.id,
          status: schema.complaints.status,
        })
        .from(schema.complaints)
        .where(eq(schema.complaints.id, complaintId))
        .for('update');
      return rows.length > 0 ? (rows[0] as { id: string; status: ComplaintStatus }) : null;
    } catch (e) {
      throw translateDatabaseError(e);
    }
  }

  async checkInitialResponseExists(complaintId: string): Promise<boolean> {
    try {
      const rows = await this.tx
        .select({ id: schema.complaintProviderResponses.id })
        .from(schema.complaintProviderResponses)
        .where(and(
          eq(schema.complaintProviderResponses.complaintId, complaintId),
          eq(schema.complaintProviderResponses.version, 1)
        ));
      return rows.length > 0;
    } catch(e) {
      throw translateDatabaseError(e);
    }
  }

  async insertProviderResponse(
    input: ComplaintProviderResponseInsertInput,
  ): Promise<void> {
    try {
      await this.tx.execute(sql`
        INSERT INTO complaints_private.complaint_provider_responses (
          complaint_id,
          version,
          response_text,
          actions_taken,
          responded_at,
          response_channel,
          responder_name,
          responder_role
        )
        VALUES (
          ${input.complaintId},
          ${input.version},
          ${input.responseText ?? null},
          ${input.actionsTaken ?? null},
          ${input.respondedAt.toISOString()},
          ${input.responseChannel},
          ${input.responderName},
          ${input.responderRole}
        )
      `);
    } catch (error) {
      throw translateDatabaseError(error);
    }
  }

  async updateComplaintStatusToAnswered(complaintId: string, expectedStatus: ComplaintStatus, updatedAt: Date): Promise<number> {
    try {
      const result = await this.tx.update(schema.complaints)
        .set({ status: 'answered', updatedAt })
        .where(and(
          eq(schema.complaints.id, complaintId),
          eq(schema.complaints.status, expectedStatus)
        ))
        .returning({ id: schema.complaints.id });
      return result.length;
    } catch(e) {
      throw translateDatabaseError(e);
    }
  }

  async updateComplaintStatusToUnderReview(complaintId: string, updatedAt: Date): Promise<number> {
    try {
      const result = await this.tx.update(schema.complaints)
        .set({ status: 'under_review', updatedAt })
        .where(and(
          eq(schema.complaints.id, complaintId),
          eq(schema.complaints.status, 'received')
        ))
        .returning({ id: schema.complaints.id });
      return result.length;
    } catch(e) {
      throw translateDatabaseError(e);
    }
  }

  async insertResponseStatusHistory(
    input: ComplaintStatusHistoryInsertInput,
  ): Promise<void> {
    try {
      await this.tx.execute(sql`
        INSERT INTO complaints_private.complaint_status_history (
          complaint_id,
          from_status,
          to_status,
          changed_by
        )
        VALUES (
          ${input.complaintId},
          ${input.fromStatus},
          ${input.toStatus},
          ${input.changedBy}
        )
      `);
    } catch (error) {
      throw translateDatabaseError(error);
    }
  }
  async insertResponseAuditEvent(
    input: ComplaintAuditInsertInput,
  ): Promise<void> {
    try {
      const metadata = JSON.stringify(input.metadata);

      await this.tx.execute(sql`
        INSERT INTO complaints_private.complaint_audit_events (
          complaint_id,
          event_type,
          metadata,
          created_by
        )
        VALUES (
          ${input.complaintId},
          ${input.eventType},
          ${metadata}::jsonb,
          ${input.createdBy}
        )
      `);
    } catch (error) {
      throw translateDatabaseError(error);
    }
  }

  async insertResponseOutbox(
    input: ComplaintOutboxInsertInput,
  ): Promise<void> {
    try {
      const payload = JSON.stringify(input.payload);

      await this.tx.execute(sql`
        INSERT INTO complaints_private.complaint_outbox (
          complaint_id,
          event_type,
          payload
        )
        VALUES (
          ${input.complaintId},
          ${input.eventType},
          ${payload}::jsonb
        )
      `);
    } catch (error) {
      throw translateDatabaseError(error);
    }
  }
}

export function createComplaintsAdminPersistenceAdapter(
  db: PostgresJsDatabase<typeof schema>,
): ComplaintsAdminPersistenceAdapter {
  if (!db || typeof db.transaction !== "function" || typeof db.select !== "function") {
    throw new Error("Invalid database dependency provided.");
  }
  return {
    async transaction<T>(
      executor: (tx: ComplaintAdminTransactionExecutor) => Promise<T>
    ): Promise<T> {
      try {
        return await withComplaintsAdminRole(db, async (tx) => {
          const wrapper = new DrizzleComplaintAdminTransactionExecutor(tx);
          return await executor(wrapper);
        });
      } catch (error) {
        throw translateDatabaseError(error);
      }
    }
  };
}
