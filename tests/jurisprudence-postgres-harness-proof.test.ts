import { describe, expect, it } from 'vitest';
import {
  JurisprudenceMigrationTestHarnessError,
  validateTestDatabaseUrl,
  withEphemeralSchema,
  inspectColumns,
  inspectForeignKeys,
  generateEphemeralSchemaName,
  requireDefined
} from './helpers/jurisprudence-migration-harness';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import fs from 'fs';
import path from 'path';

function getPostgresErrorCode(error: unknown): string | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }
  return undefined;
}

function createTestProcessEnv(
  overrides: Partial<NodeJS.ProcessEnv> = {},
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...overrides,
  };
}

describe('Real PostgreSQL Migration Test Harness Foundation (A1.7E-H0)', () => {

  const testDbUrl = process.env.JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL;

  // H2: unsafe/missing target configuration fails closed
  describe('H2: Guard / Unit Tests (No PostgreSQL required)', () => {
    it('fails if JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL is missing', () => {
      const emptyEnv = createTestProcessEnv({});
      expect(() => validateTestDatabaseUrl(emptyEnv)).toThrowError(JurisprudenceMigrationTestHarnessError);
    });

    it('rejects remote hosts and forces localhost/127.0.0.1/::1', () => {
      const badEnv = createTestProcessEnv({ JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL: 'postgres://user:pass@aws-0-sa-east-1.pooler.supabase.com:5432/buholex_migration_test' });
      expect(() => validateTestDatabaseUrl(badEnv)).toThrowError('Hostname aws-0-sa-east-1.pooler.supabase.com is not allowed');
    });

    it('rejects database names not ending in _test', () => {
      const badEnv = createTestProcessEnv({ JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL: 'postgres://user:pass@localhost:5432/buholex_staging' });
      expect(() => validateTestDatabaseUrl(badEnv)).toThrowError('Database name must end with _test');
    });

    it('rejects if target collides with a runtime variable (normalized)', () => {
      const env = createTestProcessEnv({
        JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL: 'postgres://testuser:testpass@localhost:5432/buholex_migration_test',
        DATABASE_URL: 'postgres://produser:prodpass@localhost:5432/buholex_migration_test'
      });
      expect(() => validateTestDatabaseUrl(env)).toThrowError('Target collides with runtime variable DATABASE_URL');
    });

    it('rejects database names containing unsafe environment markers', () => {
      const unsafeDatabaseNames = [
        "buholex_prod_test",
        "buholex_production_test",
        "buholex_staging_test",
      ];
      for (const databaseName of unsafeDatabaseNames) {
        const badEnv = createTestProcessEnv({ JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL: `postgres://user:pass@localhost:5432/${databaseName}` });
        expect(() => validateTestDatabaseUrl(badEnv)).toThrowError(JurisprudenceMigrationTestHarnessError);
        expect(() => validateTestDatabaseUrl(badEnv)).toThrowError(/Database name contains unsafe marker/);
      }
    });

    it('generates a valid ephemeral schema name', () => {
      const name = generateEphemeralSchemaName();
      expect(name).toMatch(/^juris_mig_test_[a-f0-9]{32}$/);
    });
  });

  // Execute Real Integration Tests ONLY if the DB URL is present
  const runRealTests = !!testDbUrl;

  describe('Real PostgreSQL Tests', () => {
    if (!runRealTests) {
      it.skip('Skipping Real PostgreSQL tests because JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL is not set', () => {});
      return;
    }

    // H1: real PostgreSQL connection established to isolated test target
    it('H1: connects to real PostgreSQL DB and drops isolated schema on cleanup', async () => {
      await withEphemeralSchema(process.env, async (sql) => {
        const res = await sql`SELECT 1 as val`;
        const row = requireDefined(res[0], 'Expected row was not returned');
        expect(row.val).toBe(1);
      });
    });

    // H3: real DDL migration executes successfully
    // H4: catalog introspection sees created column/constraint
    it('H3 & H4: executes real DDL and introspects catalog', async () => {
      await withEphemeralSchema(process.env, async (sql, schema) => {
        await sql.unsafe(`
          CREATE TABLE ${schema}.test_parent (
            id varchar PRIMARY KEY
          );
          CREATE TABLE ${schema}.test_child (
            id varchar PRIMARY KEY,
            parent_id varchar NOT NULL REFERENCES ${schema}.test_parent(id) ON DELETE RESTRICT
          );
        `);

        const parentCols = await inspectColumns(sql, schema, 'test_parent');
        const parentIdCol = requireDefined(parentCols.find(c => c.column_name === 'id'), 'Expected parent id column to exist');
        expect(parentIdCol).toBeDefined();

        const childCols = await inspectColumns(sql, schema, 'test_child');
        const childParentIdCol = requireDefined(childCols.find(c => c.column_name === 'parent_id'), 'Expected child parent_id column to exist');
        expect(childParentIdCol.is_nullable).toBe('NO');

        const childFks = await inspectForeignKeys(sql, schema, 'test_child');
        expect(childFks.length).toBeGreaterThan(0);
        const fk = requireDefined(childFks[0], 'Expected foreign key to exist');
        expect(fk.delete_rule).toBe('RESTRICT');
      });
    });

    // H5: real FK violation is rejected by PostgreSQL
    it('H5: real FK violation / RESTRICT behavior is rejected by PostgreSQL', async () => {
      await withEphemeralSchema(process.env, async (sql, schema) => {
        await sql.unsafe(`
          CREATE TABLE ${schema}.test_parent (id varchar PRIMARY KEY);
          CREATE TABLE ${schema}.test_child (
            id varchar PRIMARY KEY,
            parent_id varchar NOT NULL REFERENCES ${schema}.test_parent(id) ON DELETE RESTRICT
          );
        `);

        // Test insert violation
        let insertErr: unknown;
        try {
          await sql.unsafe(`INSERT INTO ${schema}.test_child (id, parent_id) VALUES ('1', 'missing')`);
        } catch (e) {
          insertErr = e;
        }
        expect(getPostgresErrorCode(insertErr)).toBe('23503');

        // Test delete restrict violation
        await sql.unsafe(`INSERT INTO ${schema}.test_parent (id) VALUES ('parent1')`);
        await sql.unsafe(`INSERT INTO ${schema}.test_child (id, parent_id) VALUES ('child1', 'parent1')`);

        let deleteErr: unknown;
        try {
          await sql.unsafe(`DELETE FROM ${schema}.test_parent WHERE id = 'parent1'`);
        } catch (e) {
          deleteErr = e;
        }
        expect(getPostgresErrorCode(deleteErr)).toBe('23503');
      });
    });

    // H6: cleanup removes isolated test state
    it('H6: cleanup removes isolated test state (try/finally proven)', async () => {
      let capturedSchema: string | undefined;
      const parsedUrl = validateTestDatabaseUrl(process.env);
      const sqlCheck = postgres(parsedUrl.toString(), { max: 1 });

      try {
        await withEphemeralSchema(process.env, async (sql, schema) => {
          capturedSchema = schema;
          await sql.unsafe(`CREATE TABLE ${schema}.dummy (id int)`);
          // simulate error
          throw new Error('deliberate error to test finally');
        }).catch(() => {});

        // Now check if schema exists
        const schemaToCheck = requireDefined(capturedSchema, 'Expected ephemeral schema name to have been captured.');
        const res = await sqlCheck`
          SELECT schema_name FROM information_schema.schemata WHERE schema_name = ${schemaToCheck}
        `;
        expect(res.length).toBe(0);
      } finally {
        await sqlCheck.end();
      }
    });

    // H7: transaction behavior is empirically established via REAL migration runner
    it('H7: migration runner transactionality empirically established', async () => {
      // We will create a temporary migrations folder to exercise the real migrator
      const tmpMigDir = path.join(process.cwd(), 'tests', 'fixtures', 'tmp_migrations');
      if (!fs.existsSync(tmpMigDir)) fs.mkdirSync(tmpMigDir, { recursive: true });

      // Create a valid mutation then a deliberate failure in a single file
      const migFile = path.join(tmpMigDir, '0000_h7_proof.sql');

      await withEphemeralSchema(process.env, async (sql, schema) => {

        fs.writeFileSync(migFile, `
          CREATE TABLE ${schema}.transaction_test (id int);
          INSERT INTO ${schema}.transaction_test (id) VALUES (1);
          -- Deliberate syntax error to fail the migration
          SYNTAX ERROR DELIBERATE;
        `);

        // We use the real migrator from drizzle
        const db = drizzle(sql);

        // We run executeMigration from the real script
        // Note: executeMigration is hardcoded to validate against staging url,
        // but it accepts mockSql and mockMigrator.
        // We will just invoke drizzle's `migrate` directly to prove the underlying runner behavior
        // since executeMigration is heavily tied to staging target validation.
        const { migrate } = await import('drizzle-orm/postgres-js/migrator');

        await expect(migrate(db, { migrationsFolder: tmpMigDir })).rejects.toThrow();

        // Reconnect/Query to determine whether prior mutation persisted
        const res = await sql.unsafe(`
          SELECT EXISTS (
            SELECT FROM pg_tables
            WHERE schemaname = '${schema}' AND tablename = 'transaction_test'
          ) as exists
        `);

        // If it rolled back, the table should NOT exist.
        // Drizzle migrations run inside a transaction by default (unless concurrently is used).
        const row = requireDefined(res[0], 'Expected row was not returned');
        expect(row.exists).toBe(false);

      }).finally(() => {
        if (fs.existsSync(migFile)) fs.unlinkSync(migFile);
      });
    });

  });
});
