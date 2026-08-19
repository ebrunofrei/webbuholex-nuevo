import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export async function withJurisprudenceInternalReadRole<T>(
  db: PostgresJsDatabase<Record<string, never>>,
  callback: (tx: PostgresJsDatabase<Record<string, never>>) => Promise<T>,
): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SET TRANSACTION READ ONLY`);
    await tx.execute(sql`SET LOCAL ROLE jurisprudence_internal_read_runtime`);
    return await callback(tx);
  });
}
