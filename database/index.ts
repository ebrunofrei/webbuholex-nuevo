import "server-only";

export type { DatabaseRuntimeConfig, DatabaseMigrationConfig } from "./config";
export { readDatabaseRuntimeConfig, readDatabaseMigrationConfig } from "./config";
export type { DatabaseClientBundle } from "./client";
export { getDatabase, createDatabaseClient } from "./client";
