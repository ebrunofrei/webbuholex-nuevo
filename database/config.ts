import { z } from "zod";

export interface DatabaseRuntimeConfig {
  readonly url: string;
  readonly maxConnections: number;
  readonly idleTimeoutSeconds: number;
  readonly connectTimeoutSeconds: number;
  readonly prepare: false;
}

export interface DatabaseMigrationConfig {
  readonly url: string;
}

const pgUrlSchema = z.string().trim().superRefine((val, ctx) => {
  if (val === "") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "empty" });
    return;
  }
  try {
    const url = new URL(val);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_protocol" });
      return;
    }
    if (!url.hostname) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "missing_host" });
      return;
    }
    if (!url.pathname || url.pathname === "/") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "missing_database" });
      return;
    }
    if (!url.password) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "missing_password" });
      return;
    }
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_url" });
  }
});

export function readDatabaseRuntimeConfig(
  source: Readonly<Record<string, string | undefined>> = process.env
): DatabaseRuntimeConfig {
  const url = source.DATABASE_URL;
  if (!url) {
    throw new Error("database_runtime_configuration_missing");
  }

  const result = pgUrlSchema.safeParse(url);
  if (!result.success) {
    throw new Error("database_runtime_configuration_invalid");
  }

  return {
    url: result.data,
    maxConnections: 1,
    idleTimeoutSeconds: 20,
    connectTimeoutSeconds: 5,
    prepare: false,
  };
}

export function readDatabaseMigrationConfig(
  source: Readonly<Record<string, string | undefined>> = process.env
): DatabaseMigrationConfig {
  const url = source.DATABASE_MIGRATION_URL;
  if (!url) {
    throw new Error("database_migration_configuration_missing");
  }

  const result = pgUrlSchema.safeParse(url);
  if (!result.success) {
    throw new Error("database_migration_configuration_invalid");
  }

  return {
    url: result.data,
  };
}

export type ComplaintsApiDatabaseRuntimeConfig = DatabaseRuntimeConfig;
export type ComplaintsWorkerDatabaseRuntimeConfig = DatabaseRuntimeConfig;
export type ComplaintsAdminDatabaseRuntimeConfig = DatabaseRuntimeConfig;

export function readComplaintsApiDatabaseConfig(
  source: Readonly<Record<string, string | undefined>> = process.env
): ComplaintsApiDatabaseRuntimeConfig {
  const url = source.DATABASE_API_URL;
  if (!url) {
    throw new Error("complaints_api_database_configuration_missing");
  }

  const result = pgUrlSchema.safeParse(url);
  if (!result.success) {
    throw new Error("complaints_api_database_configuration_invalid");
  }

  return {
    url: result.data,
    maxConnections: 1,
    idleTimeoutSeconds: 20,
    connectTimeoutSeconds: 5,
    prepare: false,
  };
}

export function readComplaintsWorkerDatabaseConfig(
  source: Readonly<Record<string, string | undefined>> = process.env
): ComplaintsWorkerDatabaseRuntimeConfig {
  const url = source.DATABASE_WORKER_URL;
  if (!url) {
    throw new Error("complaints_worker_database_configuration_missing");
  }

  const result = pgUrlSchema.safeParse(url);
  if (!result.success) {
    throw new Error("complaints_worker_database_configuration_invalid");
  }

  return {
    url: result.data,
    maxConnections: 1,
    idleTimeoutSeconds: 20,
    connectTimeoutSeconds: 5,
    prepare: false,
  };
}

export function readComplaintsAdminDatabaseConfig(
  source: Readonly<Record<string, string | undefined>> = process.env
): ComplaintsAdminDatabaseRuntimeConfig {
  const url = source.DATABASE_ADMIN_URL;
  if (!url) {
    throw new Error("complaints_admin_database_configuration_missing");
  }

  const result = pgUrlSchema.safeParse(url);
  if (!result.success) {
    throw new Error("complaints_admin_database_configuration_invalid");
  }

  return {
    url: result.data,
    maxConnections: 1,
    idleTimeoutSeconds: 20,
    connectTimeoutSeconds: 5,
    prepare: false,
  };
}

export type AuthorizationDatabaseRuntimeConfig = DatabaseRuntimeConfig;

export function readAuthorizationDatabaseConfig(
  source: Readonly<Record<string, string | undefined>> = process.env
): AuthorizationDatabaseRuntimeConfig {
  const url = source.DATABASE_AUTHORIZATION_URL;
  if (!url) {
    throw new Error("authorization_database_configuration_missing");
  }

  const result = pgUrlSchema.safeParse(url);
  if (!result.success) {
    throw new Error("authorization_database_configuration_invalid");
  }

  return {
    url: result.data,
    maxConnections: 1,
    idleTimeoutSeconds: 20,
    connectTimeoutSeconds: 5,
    prepare: false,
  };
}
