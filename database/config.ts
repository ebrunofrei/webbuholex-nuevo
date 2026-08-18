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
export type ComplaintsAdminReadDatabaseRuntimeConfig = DatabaseRuntimeConfig;

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

export function readComplaintsAdminReadDatabaseConfig(
  source: Readonly<Record<string, string | undefined>> = process.env
): ComplaintsAdminReadDatabaseRuntimeConfig {
  const url = source.DATABASE_ADMIN_READ_URL;
  if (!url) {
    throw new Error("complaints_admin_read_database_configuration_missing");
  }

  const result = pgUrlSchema.safeParse(url);
  if (!result.success) {
    throw new Error("complaints_admin_read_database_configuration_invalid");
  }

  return {
    url: result.data,
    maxConnections: 1,
    idleTimeoutSeconds: 20,
    connectTimeoutSeconds: 5,
    prepare: false,
  };
}

export type ComplaintsAdminDetailReadDatabaseRuntimeConfig =
  | { readonly available: true; readonly url: string; readonly maxConnections: number; readonly idleTimeoutSeconds: number; readonly connectTimeoutSeconds: number; readonly prepare: false; }
  | { readonly available: false; readonly reason: "missing" | "invalid" };

export function readComplaintsAdminDetailReadDatabaseConfig(
  source: Readonly<Record<string, string | undefined>> = process.env
): ComplaintsAdminDetailReadDatabaseRuntimeConfig {
  const url = source.DATABASE_ADMIN_DETAIL_READ_URL;
  if (!url) {
    return { available: false, reason: "missing" };
  }

  const result = pgUrlSchema.safeParse(url);
  if (!result.success) {
    return { available: false, reason: "invalid" };
  }

  return {
    available: true,
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

export type JurisprudencePublicReadDatabaseRuntimeConfig = DatabaseRuntimeConfig;

export function readJurisprudencePublicReadDatabaseConfig(
  source: Readonly<Record<string, string | undefined>> = process.env
): JurisprudencePublicReadDatabaseRuntimeConfig {
  const url = source.DATABASE_JURISPRUDENCE_READ_URL;
  if (!url) {
    throw new Error("jurisprudence_public_read_database_configuration_missing");
  }

  const result = pgUrlSchema.safeParse(url);
  if (!result.success) {
    throw new Error("jurisprudence_public_read_database_configuration_invalid");
  }

  return {
    url: result.data,
    maxConnections: 1,
    idleTimeoutSeconds: 20,
    connectTimeoutSeconds: 5,
    prepare: false, // Explicitly set prepare: false for transaction pooler compatibility (port 6543)
  };
}

export type JurisprudencePublicWriteDatabaseRuntimeConfig = DatabaseRuntimeConfig;

export function readJurisprudencePublicWriteDatabaseConfig(
  source: Readonly<Record<string, string | undefined>> = process.env
): JurisprudencePublicWriteDatabaseRuntimeConfig {
  const url = source.DATABASE_JURISPRUDENCE_WRITE_URL;
  if (!url) {
    throw new Error("jurisprudence_public_write_database_configuration_missing");
  }

  const result = pgUrlSchema.safeParse(url);
  if (!result.success) {
    throw new Error("jurisprudence_public_write_database_configuration_invalid");
  }

  return {
    url: result.data,
    maxConnections: 1,
    idleTimeoutSeconds: 20,
    connectTimeoutSeconds: 5,
    prepare: false,
  };
}

export type JurisprudenceInternalDatabaseRuntimeConfig = DatabaseRuntimeConfig;

export function readJurisprudenceInternalDatabaseConfig(
  source: Readonly<Record<string, string | undefined>> = process.env
): JurisprudenceInternalDatabaseRuntimeConfig {
  const url = source.DATABASE_JURISPRUDENCE_INTERNAL_URL;
  if (!url) {
    throw new Error("jurisprudence_internal_database_configuration_missing");
  }

  const result = pgUrlSchema.safeParse(url);
  if (!result.success) {
    throw new Error("jurisprudence_internal_database_configuration_invalid");
  }

  return {
    url: result.data,
    maxConnections: 1,
    idleTimeoutSeconds: 20,
    connectTimeoutSeconds: 5,
    prepare: false,
  };
}

export type JurisprudenceOutboxDatabaseRuntimeConfig = DatabaseRuntimeConfig;

export function readJurisprudenceOutboxDatabaseConfig(
  source: Readonly<Record<string, string | undefined>> = process.env
): JurisprudenceOutboxDatabaseRuntimeConfig {
  const url = source.DATABASE_JURISPRUDENCE_OUTBOX_URL;
  if (!url) {
    throw new Error("jurisprudence_outbox_database_configuration_missing");
  }

  const result = pgUrlSchema.safeParse(url);
  if (!result.success) {
    throw new Error("jurisprudence_outbox_database_configuration_invalid");
  }

  return {
    url: result.data,
    maxConnections: 1,
    idleTimeoutSeconds: 20,
    connectTimeoutSeconds: 5,
    prepare: false,
  };
}

export type JurisprudenceInternalWriteDatabaseRuntimeConfig = DatabaseRuntimeConfig;

export function readJurisprudenceInternalWriteDatabaseConfig(
  source: Readonly<Record<string, string | undefined>> = process.env
): JurisprudenceInternalWriteDatabaseRuntimeConfig {
  const url = source.DATABASE_JURISPRUDENCE_INTERNAL_WRITE_URL;
  if (!url) {
    throw new Error("jurisprudence_internal_write_database_configuration_missing");
  }

  const result = pgUrlSchema.safeParse(url);
  if (!result.success) {
    throw new Error("jurisprudence_internal_write_database_configuration_invalid");
  }

  return {
    url: result.data,
    maxConnections: 1,
    idleTimeoutSeconds: 20,
    connectTimeoutSeconds: 5,
    prepare: false,
  };
}
