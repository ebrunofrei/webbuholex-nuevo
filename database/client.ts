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
  __buholexAuthorizationClient__?: DatabaseClientBundle;
};

export function getDatabase(): PostgresJsDatabase<typeof schema> {
  const config = readDatabaseRuntimeConfig();

  if (process.env.NODE_ENV === "development") {
    const g = globalThis as DatabaseGlobal;
    if (!g.__buholexDatabaseClient__) {
      g.__buholexDatabaseClient__ = createDatabaseClient(config);
    }
    return g.__buholexDatabaseClient__.db;
  }

  return createDatabaseClient(config).db;
}

export function getDatabaseClientBundle(): DatabaseClientBundle {
  const config = readDatabaseRuntimeConfig();

  if (process.env.NODE_ENV === "development") {
    const g = globalThis as DatabaseGlobal;
    if (!g.__buholexDatabaseClient__) {
      g.__buholexDatabaseClient__ = createDatabaseClient(config);
    }
    return g.__buholexDatabaseClient__;
  }

  return createDatabaseClient(config);
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

  if (process.env.NODE_ENV === "development") {
    const g = globalThis as DatabaseGlobal;
    if (!g.__buholexComplaintsApiClient__) {
      g.__buholexComplaintsApiClient__ = createComplaintsApiDatabaseClient(config);
    }
    return g.__buholexComplaintsApiClient__.db;
  }

  return createComplaintsApiDatabaseClient(config).db;
}

export function getComplaintsWorkerDatabase(): PostgresJsDatabase<typeof schema> {
  const config = readComplaintsWorkerDatabaseConfig();

  if (process.env.NODE_ENV === "development") {
    const g = globalThis as DatabaseGlobal;
    if (!g.__buholexComplaintsWorkerClient__) {
      g.__buholexComplaintsWorkerClient__ = createComplaintsWorkerDatabaseClient(config);
    }
    return g.__buholexComplaintsWorkerClient__.db;
  }

  return createComplaintsWorkerDatabaseClient(config).db;
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

  if (process.env.NODE_ENV === "development") {
    const g = globalThis as DatabaseGlobal;
    if (!g.__buholexComplaintsAdminClient__) {
      g.__buholexComplaintsAdminClient__ = createComplaintsAdminDatabaseClient(config);
    }
    return g.__buholexComplaintsAdminClient__.db;
  }

  return createComplaintsAdminDatabaseClient(config).db;
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

  if (process.env.NODE_ENV === "development") {
    const g = globalThis as DatabaseGlobal;
    if (!g.__buholexAuthorizationClient__) {
      g.__buholexAuthorizationClient__ = createAuthorizationDatabaseClient(config);
    }
    return g.__buholexAuthorizationClient__.db;
  }

  return createAuthorizationDatabaseClient(config).db;
}
