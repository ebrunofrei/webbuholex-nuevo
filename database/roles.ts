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
