import postgres from 'postgres';
import { v4 as uuidv4 } from 'uuid';

export class JurisprudenceMigrationTestHarnessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JurisprudenceMigrationTestHarnessError';
  }
}

export function validateTestDatabaseUrl(env: NodeJS.ProcessEnv): URL {
  const testUrlRaw = env.JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL;
  if (!testUrlRaw) {
    throw new JurisprudenceMigrationTestHarnessError('JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL is missing');
  }

  let parsed: URL;
  try {
    parsed = new URL(testUrlRaw);
  } catch {
    throw new JurisprudenceMigrationTestHarnessError('JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL is unparsable');
  }

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new JurisprudenceMigrationTestHarnessError('Protocol must be postgres/postgresql');
  }

  const allowedHosts = ['localhost', '127.0.0.1', '::1'];
  if (!allowedHosts.includes(parsed.hostname)) {
    throw new JurisprudenceMigrationTestHarnessError(`Hostname ${parsed.hostname} is not allowed. Must be localhost, 127.0.0.1, or ::1`);
  }

  const dbName = parsed.pathname.slice(1);
  if (!dbName.endsWith('_test')) {
    throw new JurisprudenceMigrationTestHarnessError(`Database name must end with _test. Got: ${dbName}`);
  }
  const unsafeMarkers = ['prod', 'production', 'staging'];
  for (const marker of unsafeMarkers) {
    if (dbName.includes(marker)) {
      throw new JurisprudenceMigrationTestHarnessError(`Database name contains unsafe marker '${marker}'. Got: ${dbName}`);
    }
  }

  // Normalize current port
  const currentPort = parsed.port || '5432';
  const currentKey = `${parsed.hostname}:${currentPort}/${dbName}`;

  // Runtime keys to check
  const runtimeKeys = [
    'DATABASE_URL',
    'DATABASE_MIGRATION_URL',
    'DATABASE_API_URL',
    'DATABASE_WORKER_URL',
    'DATABASE_ADMIN_URL',
    'DATABASE_ADMIN_READ_URL',
    'DATABASE_ADMIN_DETAIL_READ_URL',
    'DATABASE_AUTHORIZATION_URL',
  ];

  for (const key of runtimeKeys) {
    const rawVal = env[key];
    if (rawVal) {
      let p: URL;
      try {
        p = new URL(rawVal);
      } catch {
        continue; // Unparsable runtime variable, ignore
      }

      const port = p.port || '5432';
      const targetDb = p.pathname.slice(1);
      const targetKey = `${p.hostname}:${port}/${targetDb}`;
      if (targetKey === currentKey) {
        throw new JurisprudenceMigrationTestHarnessError(`Target collides with runtime variable ${key}`);
      }
    }
  }

  return parsed;
}

export function generateEphemeralSchemaName(): string {
  const hex = uuidv4().replace(/-/g, '').toLowerCase();
  const schema = `juris_mig_test_${hex}`;
  if (!/^juris_mig_test_[a-f0-9]{32}$/.test(schema)) {
    throw new JurisprudenceMigrationTestHarnessError('Generated schema failed regex validation');
  }
  return schema;
}

export async function withEphemeralSchema<T>(
  env: NodeJS.ProcessEnv,
  fn: (sql: postgres.Sql, schemaName: string) => Promise<T>
): Promise<T> {
  const parsedUrl = validateTestDatabaseUrl(env);
  const sql = postgres(parsedUrl.toString(), {
    max: 1,
    onnotice: () => {},
  });

  const schemaName = generateEphemeralSchemaName();

  try {
    await sql.unsafe(`CREATE SCHEMA ${schemaName}`);
    try {
      return await fn(sql, schemaName);
    } finally {
      await sql.unsafe(`DROP SCHEMA ${schemaName} CASCADE`);
    }
  } finally {
    try {
      await sql.end({ timeout: 5 });
    } catch (err) {
      console.error('Failed to close postgres connection', err);
      throw err;
    }
  }
}

type HarnessOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

function validateFixedSchemaName(schemaName: string): string {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schemaName)) {
    throw new JurisprudenceMigrationTestHarnessError(
      `Unsafe fixed schema identifier: ${schemaName}`,
    );
  }

  return schemaName;
}

function registerHarnessFailure<T>(
  outcome: HarnessOutcome<T> | undefined,
  error: unknown,
  secondaryMessage: string,
): HarnessOutcome<T> {
  if (outcome === undefined || outcome.ok) {
    return { ok: false, error };
  }

  console.error(secondaryMessage, error);
  return outcome;
}

export async function withFixedSchema<T>(
  env: NodeJS.ProcessEnv,
  schemaName: string,
  fn: (sql: postgres.Sql) => Promise<T>
): Promise<T> {
  const parsedUrl = validateTestDatabaseUrl(env);
  const safeSchemaName = validateFixedSchemaName(schemaName);

  const sql = postgres(parsedUrl.toString(), {
    max: 1,
    onnotice: () => {},
  });

  let outcome: HarnessOutcome<T> | undefined;
  let lockAcquired = false;

  try {
    try {
      await sql`
        SELECT pg_advisory_lock(
          hashtext('jurisprudence_harness'),
          hashtext(${safeSchemaName})
        )
      `;
      lockAcquired = true;

      await sql.unsafe(
        `DROP SCHEMA IF EXISTS ${safeSchemaName} CASCADE`
      );

      await sql.unsafe(
        `CREATE SCHEMA ${safeSchemaName}`
      );

      try {
        outcome = {
          ok: true,
          value: await fn(sql),
        };
      } catch (error) {
        outcome = {
          ok: false,
          error,
        };
      }

      try {
        await sql.unsafe(
          `DROP SCHEMA IF EXISTS ${safeSchemaName} CASCADE`
        );
      } catch (cleanupError) {
        outcome = registerHarnessFailure(
          outcome,
          cleanupError,
          'Schema cleanup failed after an earlier error:',
        );
      }
    } catch (setupError) {
      outcome = registerHarnessFailure(
        outcome,
        setupError,
        'Fixed-schema setup failed after an earlier error:',
      );
    } finally {
      if (lockAcquired) {
        try {
          const rows = await sql`
            SELECT pg_advisory_unlock(
              hashtext('jurisprudence_harness'),
              hashtext(${safeSchemaName})
            ) AS unlocked
          `;

          const row = requireDefined(
            rows[0],
            'Expected advisory unlock result row.',
          );

          if (row.unlocked !== true) {
            throw new JurisprudenceMigrationTestHarnessError(
              'PostgreSQL advisory lock was not released by the owning session',
            );
          }
        } catch (unlockError) {
          outcome = registerHarnessFailure(
            outcome,
            unlockError,
            'Failed to release advisory lock after an earlier error:',
          );
        }
      }
    }
  } finally {
    try {
      await sql.end({ timeout: 5 });
    } catch (closeError) {
      outcome = registerHarnessFailure(
        outcome,
        closeError,
        'Failed to close postgres connection after an earlier error:',
      );
    }
  }

  if (outcome === undefined) {
    throw new JurisprudenceMigrationTestHarnessError(
      'Fixed-schema harness finished without producing an outcome',
    );
  }

  if (!outcome.ok) {
    throw outcome.error;
  }

  return outcome.value;
}

export async function inspectColumns(sql: postgres.Sql, schema: string, table: string): Promise<Array<{ column_name: string; data_type: string; is_nullable: string }>> {
  const rows = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = ${schema} AND table_name = ${table}
  `;
  return rows.map((r) => ({
    column_name: requireStringField(r, 'column_name'),
    data_type: requireStringField(r, 'data_type'),
    is_nullable: requireStringField(r, 'is_nullable'),
  }));
}

export async function inspectForeignKeys(
  sql: postgres.Sql,
  schema: string,
  table: string,
): Promise<
  Array<{
    constraint_name: string;
    source_schema: string;
    source_table: string;
    source_column: string;
    target_schema: string;
    target_table: string;
    target_column: string;
    delete_rule: string;
  }>
> {
  const rows = await sql`
    SELECT
      con.conname AS constraint_name,
      source_ns.nspname AS source_schema,
      source_table.relname AS source_table,
      source_attr.attname AS source_column,
      target_ns.nspname AS target_schema,
      target_table.relname AS target_table,
      target_attr.attname AS target_column,
      CASE con.confdeltype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
        ELSE 'UNKNOWN'
      END AS delete_rule
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class source_table
      ON source_table.oid = con.conrelid
    JOIN pg_catalog.pg_namespace source_ns
      ON source_ns.oid = source_table.relnamespace
    JOIN pg_catalog.pg_class target_table
      ON target_table.oid = con.confrelid
    JOIN pg_catalog.pg_namespace target_ns
      ON target_ns.oid = target_table.relnamespace
    JOIN LATERAL unnest(con.conkey)
      WITH ORDINALITY AS source_key(attnum, ord)
      ON TRUE
    JOIN LATERAL unnest(con.confkey)
      WITH ORDINALITY AS target_key(attnum, ord)
      ON target_key.ord = source_key.ord
    JOIN pg_catalog.pg_attribute source_attr
      ON source_attr.attrelid = source_table.oid
      AND source_attr.attnum = source_key.attnum
    JOIN pg_catalog.pg_attribute target_attr
      ON target_attr.attrelid = target_table.oid
      AND target_attr.attnum = target_key.attnum
    WHERE con.contype = 'f'
      AND source_ns.nspname = ${schema}
      AND source_table.relname = ${table}
    ORDER BY con.conname, source_key.ord
  `;

  return rows.map((row) => ({
    constraint_name: requireStringField(row, 'constraint_name'),
    source_schema: requireStringField(row, 'source_schema'),
    source_table: requireStringField(row, 'source_table'),
    source_column: requireStringField(row, 'source_column'),
    target_schema: requireStringField(row, 'target_schema'),
    target_table: requireStringField(row, 'target_table'),
    target_column: requireStringField(row, 'target_column'),
    delete_rule: requireStringField(row, 'delete_rule'),
  }));
}

export function requireDefined<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

export function requireStringField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') {
    throw new Error(`Expected row.${key} to be a string, got ${typeof value}`);
  }
  return value;
}
