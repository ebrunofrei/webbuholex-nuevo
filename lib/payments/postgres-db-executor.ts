import { ExtractTablesWithRelations } from "drizzle-orm";
import { PostgresJsDatabase, PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import { PgTransaction } from "drizzle-orm/pg-core";
import * as schema from "../../database/schema";

export type PaymentDbExecutor = PostgresJsDatabase<typeof schema> | PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;
