import "server-only";
import postgres from "postgres";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import {
  DatabaseRuntimeConfig,
  readDatabaseRuntimeConfig,
  ComplaintsApiDatabaseRuntimeConfig,
  ComplaintsWorkerDatabaseRuntimeConfig,
  readComplaintsApiDatabaseConfig,
  readComplaintsWorkerDatabaseConfig,
  ComplaintsAdminDatabaseRuntimeConfig,
  readComplaintsAdminDatabaseConfig,
  ComplaintsAdminReadDatabaseRuntimeConfig,
  readComplaintsAdminReadDatabaseConfig,
  ComplaintsAdminDetailReadDatabaseRuntimeConfig,
  readComplaintsAdminDetailReadDatabaseConfig,
  AuthorizationDatabaseRuntimeConfig,
  readAuthorizationDatabaseConfig,
} from "./config";

export interface DatabaseClientBundle {
  readonly sql: postgres.Sql;
  readonly db: PostgresJsDatabase<typeof schema>;
}

export function createDatabaseClient(config: DatabaseRuntimeConfig): DatabaseClientBundle {
  const sql = postgres(config.url, {
    max: config.maxConnections,
    idle_timeout: config.idleTimeoutSeconds,
    connect_timeout: config.connectTimeoutSeconds,
    prepare: config.prepare,
  });

  const db = drizzle(sql, { schema });

  return { sql, db };
}

type DatabaseGlobal = typeof globalThis & {
  __buholexDatabaseClient__?: DatabaseClientBundle;
  __buholexComplaintsApiClient__?: DatabaseClientBundle;
  __buholexComplaintsWorkerClient__?: DatabaseClientBundle;
  __buholexComplaintsAdminClient__?: DatabaseClientBundle;
  __buholexComplaintsAdminReadClient__?: DatabaseClientBundle;
  __buholexComplaintsAdminDetailReadClient__?: DatabaseClientBundle;
  __buholexAuthorizationClient__?: DatabaseClientBundle;
};

export function getDatabase(): PostgresJsDatabase<typeof schema> {
  const config = readDatabaseRuntimeConfig();
  const g = globalThis as DatabaseGlobal;
  if (!g.__buholexDatabaseClient__) {
    g.__buholexDatabaseClient__ = createDatabaseClient(config);
  }
  return g.__buholexDatabaseClient__.db;
}

export function getDatabaseClientBundle(): DatabaseClientBundle {
  const config = readDatabaseRuntimeConfig();
  const g = globalThis as DatabaseGlobal;
  if (!g.__buholexDatabaseClient__) {
    g.__buholexDatabaseClient__ = createDatabaseClient(config);
  }
  return g.__buholexDatabaseClient__;
}

export function createComplaintsApiDatabaseClient(config: ComplaintsApiDatabaseRuntimeConfig): DatabaseClientBundle {
  const sql = postgres(config.url, {
    max: config.maxConnections,
    idle_timeout: config.idleTimeoutSeconds,
    connect_timeout: config.connectTimeoutSeconds,
    prepare: config.prepare,
    ssl: "require",
  });
  const db = drizzle(sql, { schema });
  return { sql, db };
}

export function createComplaintsWorkerDatabaseClient(config: ComplaintsWorkerDatabaseRuntimeConfig): DatabaseClientBundle {
  const sql = postgres(config.url, {
    max: config.maxConnections,
    idle_timeout: config.idleTimeoutSeconds,
    connect_timeout: config.connectTimeoutSeconds,
    prepare: config.prepare,
    ssl: "require",
  });
  const db = drizzle(sql, { schema });
  return { sql, db };
}

export function getComplaintsApiDatabase(): PostgresJsDatabase<typeof schema> {
  const config = readComplaintsApiDatabaseConfig();
  const g = globalThis as DatabaseGlobal;
  if (!g.__buholexComplaintsApiClient__) {
    g.__buholexComplaintsApiClient__ = createComplaintsApiDatabaseClient(config);
  }
  return g.__buholexComplaintsApiClient__.db;
}

export function getComplaintsWorkerDatabase(): PostgresJsDatabase<typeof schema> {
  const config = readComplaintsWorkerDatabaseConfig();
  const g = globalThis as DatabaseGlobal;
  if (!g.__buholexComplaintsWorkerClient__) {
    g.__buholexComplaintsWorkerClient__ = createComplaintsWorkerDatabaseClient(config);
  }
  return g.__buholexComplaintsWorkerClient__.db;
}

export function createComplaintsAdminDatabaseClient(config: ComplaintsAdminDatabaseRuntimeConfig): DatabaseClientBundle {
  const sql = postgres(config.url, {
    max: config.maxConnections,
    idle_timeout: config.idleTimeoutSeconds,
    connect_timeout: config.connectTimeoutSeconds,
    prepare: config.prepare,
    ssl: "require",
  });
  const db = drizzle(sql, { schema });
  return { sql, db };
}

export function getComplaintsAdminDatabase(): PostgresJsDatabase<typeof schema> {
  const config = readComplaintsAdminDatabaseConfig();
  const g = globalThis as DatabaseGlobal;
  if (!g.__buholexComplaintsAdminClient__) {
    g.__buholexComplaintsAdminClient__ = createComplaintsAdminDatabaseClient(config);
  }
  return g.__buholexComplaintsAdminClient__.db;
}

export function createComplaintsAdminReadDatabaseClient(config: ComplaintsAdminReadDatabaseRuntimeConfig): DatabaseClientBundle {
  const sql = postgres(config.url, {
    max: config.maxConnections,
    idle_timeout: config.idleTimeoutSeconds,
    connect_timeout: config.connectTimeoutSeconds,
    prepare: config.prepare,
    ssl: "require",
  });
  const db = drizzle(sql, { schema });
  return { sql, db };
}

export function getComplaintsAdminReadDatabase(): PostgresJsDatabase<typeof schema> {
  const config = readComplaintsAdminReadDatabaseConfig();
  const g = globalThis as DatabaseGlobal;
  if (!g.__buholexComplaintsAdminReadClient__) {
    g.__buholexComplaintsAdminReadClient__ = createComplaintsAdminReadDatabaseClient(config);
  }
  return g.__buholexComplaintsAdminReadClient__.db;
}

export function createComplaintsAdminDetailReadDatabaseClient(config: Extract<ComplaintsAdminDetailReadDatabaseRuntimeConfig, { available: true }>): DatabaseClientBundle {
  const sql = postgres(config.url, {
    max: config.maxConnections,
    idle_timeout: config.idleTimeoutSeconds,
    connect_timeout: config.connectTimeoutSeconds,
    prepare: config.prepare,
    ssl: "require",
  });
  const db = drizzle(sql, { schema });
  return { sql, db };
}

export function getComplaintsAdminDetailReadDatabase(): PostgresJsDatabase<typeof schema> {
  const config = readComplaintsAdminDetailReadDatabaseConfig();

  if (!config.available) {
    throw new Error("complaints_admin_detail_read_database_unavailable");
  }

  const g = globalThis as DatabaseGlobal;
  if (!g.__buholexComplaintsAdminDetailReadClient__) {
    g.__buholexComplaintsAdminDetailReadClient__ = createComplaintsAdminDetailReadDatabaseClient(config);
  }
  return g.__buholexComplaintsAdminDetailReadClient__.db;
}

export function createAuthorizationDatabaseClient(config: AuthorizationDatabaseRuntimeConfig): DatabaseClientBundle {
  const sql = postgres(config.url, {
    max: config.maxConnections,
    idle_timeout: config.idleTimeoutSeconds,
    connect_timeout: config.connectTimeoutSeconds,
    prepare: config.prepare,
    ssl: "require",
  });
  const db = drizzle(sql, { schema });
  return { sql, db };
}

export function getAuthorizationDatabase(): PostgresJsDatabase<typeof schema> {
  const config = readAuthorizationDatabaseConfig();
  const g = globalThis as DatabaseGlobal;
  if (!g.__buholexAuthorizationClient__) {
    g.__buholexAuthorizationClient__ = createAuthorizationDatabaseClient(config);
  }
  return g.__buholexAuthorizationClient__.db;
}
