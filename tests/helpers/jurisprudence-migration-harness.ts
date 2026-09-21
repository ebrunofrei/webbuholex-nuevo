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

export async function inspectForeignKeys(sql: postgres.Sql, schema: string, table: string): Promise<Array<{ constraint_name: string; delete_rule: string }>> {
  const rows = await sql`
    SELECT tc.constraint_name, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.constraint_schema = rc.constraint_schema
      AND tc.constraint_catalog = rc.constraint_catalog
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = ${schema}
      AND tc.table_name = ${table}
  `;
  return rows.map((r) => ({
    constraint_name: requireStringField(r, 'constraint_name'),
    delete_rule: requireStringField(r, 'delete_rule'),
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
