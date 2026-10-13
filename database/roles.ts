import { sql, ExtractTablesWithRelations } from "drizzle-orm";
import { PostgresJsDatabase, PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import { PgTransaction } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type ComplaintsTransaction = PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

export async function withComplaintsApiRole<T>(
  db: PostgresJsDatabase<typeof schema>,
  callback: (tx: ComplaintsTransaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // FAIL CLOSED: If SET LOCAL ROLE fails, an error is thrown and callback is NEVER executed.
    await tx.execute(sql`SET LOCAL ROLE complaints_api_runtime`);
    return await callback(tx);
  });
}

export async function withComplaintsWorkerRole<T>(
  db: PostgresJsDatabase<typeof schema>,
  callback: (tx: ComplaintsTransaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // FAIL CLOSED: If SET LOCAL ROLE fails, an error is thrown and callback is NEVER executed.
    await tx.execute(sql`SET LOCAL ROLE complaints_outbox_worker`);
    return await callback(tx);
  });
}

export async function withComplaintsAdminRole<T>(
  db: PostgresJsDatabase<typeof schema>,
  callback: (tx: ComplaintsTransaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // FAIL CLOSED: If SET LOCAL ROLE fails, an error is thrown and callback is NEVER executed.
    await tx.execute(sql`SET LOCAL ROLE complaints_admin_runtime`);
    return await callback(tx);
  });
}

export async function withComplaintsAuthorizationRole<T>(
  db: PostgresJsDatabase<typeof schema>,
  callback: (tx: ComplaintsTransaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // FAIL CLOSED: If SET LOCAL ROLE fails, an error is thrown and callback is NEVER executed.
    await tx.execute(sql`SET LOCAL ROLE complaints_authorization_runtime`);
    return await callback(tx);
  });
}

export async function withComplaintsAdminReadRole<T>(
  db: PostgresJsDatabase<typeof schema>,
  callback: (tx: ComplaintsTransaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // FAIL CLOSED: If SET LOCAL ROLE fails, an error is thrown and callback is NEVER executed.
    await tx.execute(sql`SET LOCAL ROLE complaints_admin_read_runtime`);
    return await callback(tx);
  });
}

export async function withComplaintsAdminDetailReadRole<T>(
  db: PostgresJsDatabase<typeof schema>,
  callback: (tx: ComplaintsTransaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // FAIL CLOSED: If SET LOCAL ROLE fails, an error is thrown and callback is NEVER executed.
    await tx.execute(sql`SET LOCAL ROLE complaints_admin_detail_read_runtime`);
    return await callback(tx);
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

export type JurisprudenceTransaction = PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

export async function withJurisprudencePublicReadRole<
  T,
  TTx extends JurisprudenceRoleTransactionScope = JurisprudenceTransaction,
>(
  db: JurisprudenceRoleDatabaseScope<TTx>,
  callback: (tx: TTx) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // FAIL CLOSED: If SET LOCAL ROLE fails, an error is thrown and callback is NEVER executed.
    await tx.execute(sql`SET LOCAL ROLE jurisprudence_public_read_runtime`);
    return await callback(tx);
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

export async function withJurisprudencePublicWriteRole<T>(
  db: PostgresJsDatabase<typeof schema>,
  callback: (tx: JurisprudenceTransaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // FAIL CLOSED: If SET LOCAL ROLE fails, an error is thrown and callback is NEVER executed.
    await tx.execute(sql`SET LOCAL ROLE jurisprudence_public_write_runtime`);
    return await callback(tx);
  });
}

export async function withJurisprudencePublicationOutboxRole<T>(
  db: PostgresJsDatabase<typeof schema>,
  callback: (tx: JurisprudenceTransaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // FAIL CLOSED: If SET LOCAL ROLE fails, an error is thrown and callback is NEVER executed.
    await tx.execute(sql`SET LOCAL ROLE jurisprudence_publication_outbox_runtime`);
    return await callback(tx);
  });
}

export async function withJurisprudencePublicationCommandRole<T>(
  db: PostgresJsDatabase<typeof schema>,
  callback: (tx: JurisprudenceTransaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // FAIL CLOSED: If SET LOCAL ROLE fails, an error is thrown and callback is NEVER executed.
    await tx.execute(sql`SET LOCAL ROLE jurisprudence_publication_command_runtime`);
    return await callback(tx);
  });
}

export async function withJurisprudenceInternalWriteRole<T>(
  db: PostgresJsDatabase<typeof schema>,
  callback: (tx: JurisprudenceTransaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // FAIL CLOSED: If SET LOCAL ROLE fails, an error is thrown and callback is NEVER executed.
    await tx.execute(sql`SET LOCAL ROLE jurisprudence_internal_write_runtime`);
    return await callback(tx);
  });
}

export async function withJurisprudenceAuthorizationRole<T>(
  db: PostgresJsDatabase<typeof schema>,
  callback: (tx: JurisprudenceTransaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // FAIL CLOSED: If SET LOCAL ROLE fails, an error is thrown and callback is NEVER executed.
    await tx.execute(sql`SET LOCAL ROLE jurisprudence_authorization_runtime`);
    return await callback(tx);
  });
}

export interface JurisprudenceRoleTransactionScope {
  execute(query: unknown): Promise<unknown>;
}

export interface JurisprudenceRoleDatabaseScope<TTx extends JurisprudenceRoleTransactionScope = JurisprudenceTransaction> {
  transaction<T>(
    transaction: (tx: TTx) => Promise<T>,
    config?: {
      isolationLevel?: "read uncommitted" | "read committed" | "repeatable read" | "serializable";
      accessMode?: "read only" | "read write";
      deferrable?: boolean;
    }
  ): Promise<T>;
}

export async function withJurisprudenceInterpretationReadRole<
  T,
  TTx extends JurisprudenceRoleTransactionScope = JurisprudenceTransaction,
>(
  db: JurisprudenceRoleDatabaseScope<TTx>,
  callback: (tx: TTx) => Promise<T>
): Promise<T> {
  return await db.transaction(
    async (tx) => {
      // FAIL CLOSED: If SET LOCAL ROLE fails, an error is thrown and callback is NEVER executed.
      await tx.execute(sql`SET LOCAL ROLE jurisprudence_interpretation_read_runtime`);
      return await callback(tx);
    },
    { isolationLevel: "repeatable read", accessMode: "read only" }
  );
}
