import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";

let client: PostgresJsDatabase<Record<string, never>> | null = null;

export function getJurisprudenceInternalReadDatabase(): PostgresJsDatabase<Record<string, never>> {
  if (client !== null) return client;

  const connectionString = process.env.DATABASE_JURISPRUDENCE_INTERNAL_READ_URL;
  if (!connectionString) {
    throw new Error("DATABASE_JURISPRUDENCE_INTERNAL_READ_URL must be set in environment to initialize internal read database connection");
  }

  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false,
  });

  client = drizzle(sql);
  return client;
}
