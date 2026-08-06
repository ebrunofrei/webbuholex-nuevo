import { eq, and, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../schema";
import type {
  ComplaintsPersistenceAdapter,
  ComplaintTransactionExecutor,
  ComplaintInsertInput,
  ComplaintStatusHistoryInsertInput,
  ComplaintOutboxInsertInput,
  ComplaintAuditInsertInput
} from "../repositories/complaints.types";
import { SanitizedDatabaseConstraintError, createComplaintPersistenceError } from "../repositories/complaints.errors";

type ComplaintsDrizzleDatabase = PostgresJsDatabase<typeof schema>;

function isPostgresError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  if (error instanceof Error && error.name === "ComplaintPersistenceError") return false;
  if (error instanceof SanitizedDatabaseConstraintError) return false;

  // Use a closed property access approach
  const descriptorCode = Object.getOwnPropertyDescriptor(error, "code");
  if (descriptorCode && typeof descriptorCode.value === "string") {
    return true;
  }

  // In some environments, properties might be on the prototype or direct assignment without descriptor
  return "code" in error && typeof (error as Record<string, unknown>).code === "string";
}

function translateDatabaseError(error: unknown): unknown {
  if (isPostgresError(error)) {
    const record = error as Record<string, unknown>;
    const code = record.code as string;
    const constraint = typeof record.constraint_name === "string" && record.constraint_name.trim() !== ""
      ? record.constraint_name
      : null;

    return new SanitizedDatabaseConstraintError(code, constraint);
  }
  return error;
}

class DrizzleComplaintTransactionExecutor implements ComplaintTransactionExecutor {
  constructor(private readonly tx: Omit<ComplaintsDrizzleDatabase, "$client">) {}

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

export function createDrizzleComplaintsPersistenceAdapter(
  db: ComplaintsDrizzleDatabase,
): ComplaintsPersistenceAdapter {
  if (!db || typeof db.transaction !== "function" || typeof db.select !== "function") {
    throw new Error("Invalid ComplaintsDrizzleDatabase dependency provided.");
  }

  return {
    async findByIdempotencyDigest(
      digest: string,
      keyVersion: number
    ): Promise<{ id: string; sheetNumber: string; status: "received" | "under_review" | "awaiting_information" | "answered" | "closed"; submittedAt: Date; deadlineAt: string } | null> {
      try {
        const rows = await db
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
      } catch (error) {
        throw translateDatabaseError(error);
      }
    },

    async transaction<T>(
      executor: (tx: ComplaintTransactionExecutor) => Promise<T>
    ): Promise<T> {
      try {
        return await db.transaction(async (drizzleTx) => {
          const wrapper = new DrizzleComplaintTransactionExecutor(drizzleTx);
          return await executor(wrapper);
        });
      } catch (error) {
        throw translateDatabaseError(error);
      }
    }
  };
}
