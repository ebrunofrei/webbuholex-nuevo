import { describe, expect, it } from 'vitest';
import {
  withFixedSchema,
  inspectColumns,
  inspectForeignKeys,
  requireDefined,
} from './helpers/jurisprudence-migration-harness';
import fs from 'fs';
import path from 'path';
import type postgres from 'postgres';

function getPostgresErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return undefined;
}

const runRealTests = !!process.env.JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL;
const migrationPath = path.join(process.cwd(), 'database', 'migrations', '0038_jurisprudence_source_binding_fk.sql');

describe('A1.7E FIX-5 Migration PostgreSQL Real Tests', () => {
  if (!runRealTests) {
    it.skip('Skipping Real PostgreSQL tests because JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL is not set', () => {});
    return;
  }

  // Pre-0038 baseline matching 0037 state
  const baselineSql = `
    CREATE TABLE jurisprudence_internal.jurisprudence_governed_sources (
      source_id varchar PRIMARY KEY,
      payload_json jsonb NOT NULL
    );

    CREATE TABLE jurisprudence_internal.jurisprudence_record_versions (
      record_id varchar NOT NULL,
      version integer NOT NULL,
      PRIMARY KEY (record_id, version)
    );

    CREATE TABLE jurisprudence_internal.jurisprudence_source_bindings (
      binding_id varchar PRIMARY KEY,
      record_id varchar NOT NULL,
      record_version integer NOT NULL CHECK (record_version > 0),
      binding_status varchar NOT NULL,
      payload_json jsonb NOT NULL,
      FOREIGN KEY (record_id, record_version) REFERENCES jurisprudence_internal.jurisprudence_record_versions(record_id, version) ON DELETE RESTRICT
    );
  `;

  async function executeMigration(sql: postgres.Sql): Promise<void> {
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    await sql.unsafe(migrationContent);
  }

  it('T1 valid single backfill + T5 NOT NULL + T6 FK + T7 DELETE RESTRICT', async () => {
    await withFixedSchema(process.env, 'jurisprudence_internal', async (sql) => {
      await sql.unsafe(baselineSql);

      await sql.unsafe(`
        INSERT INTO jurisprudence_internal.jurisprudence_governed_sources (source_id, payload_json)
        VALUES ('src_1', '{"sourceId": "src_1"}'::jsonb);

        INSERT INTO jurisprudence_internal.jurisprudence_record_versions (record_id, version) VALUES ('rec_1', 1);

        INSERT INTO jurisprudence_internal.jurisprudence_source_bindings (binding_id, record_id, record_version, binding_status, payload_json)
        VALUES ('bind_1', 'rec_1', 1, 'active', '{"sourceId": "src_1"}'::jsonb);
      `);

      await executeMigration(sql);

      const bindings = await sql.unsafe(
        `SELECT * FROM jurisprudence_internal.jurisprudence_source_bindings`
      );

      expect(bindings.length).toBe(1);

      const binding = requireDefined(
        bindings[0],
        'Expected migrated binding.',
      );

      expect(binding.source_id).toBe('src_1');

      // T5: NOT NULL
      const cols = await inspectColumns(sql, 'jurisprudence_internal', 'jurisprudence_source_bindings');
      const sourceIdCol = requireDefined(cols.find(c => c.column_name === 'source_id'), 'Expected source_id column');
      expect(sourceIdCol.is_nullable).toBe('NO');

      // T6: FK exists
      const fks = await inspectForeignKeys(sql, 'jurisprudence_internal', 'jurisprudence_source_bindings');
      const fkCandidate = fks.find(
        c =>
          c.source_schema === 'jurisprudence_internal' &&
          c.source_table === 'jurisprudence_source_bindings' &&
          c.source_column === 'source_id' &&
          c.target_schema === 'jurisprudence_internal' &&
          c.target_table === 'jurisprudence_governed_sources' &&
          c.target_column === 'source_id'
      );

      const fk = requireDefined(
        fkCandidate,
        'Expected physical source_id foreign key to exist.',
      );

      expect(fk.delete_rule).toBe('RESTRICT');
      expect(fk.source_schema).toBe('jurisprudence_internal');
      expect(fk.source_table).toBe('jurisprudence_source_bindings');
      expect(fk.source_column).toBe('source_id');
      expect(fk.target_schema).toBe('jurisprudence_internal');
      expect(fk.target_table).toBe('jurisprudence_governed_sources');
      expect(fk.target_column).toBe('source_id');

      // Index exists
      const indexes = await sql.unsafe(`
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'jurisprudence_internal' AND tablename = 'jurisprudence_source_bindings'
      `);
      expect(indexes.some(i => i.indexname === 'jurisprudence_source_bindings_source_id_idx')).toBe(true);

      // T7: DELETE RESTRICTED
      let deleteErr: unknown;
      try {
        await sql.unsafe(`DELETE FROM jurisprudence_internal.jurisprudence_governed_sources WHERE source_id = 'src_1'`);
      } catch (e) {
        deleteErr = e;
      }
      expect(getPostgresErrorCode(deleteErr)).toBe('23503');
    });
  });

  it('T2 multiple valid backfills', async () => {
    await withFixedSchema(process.env, 'jurisprudence_internal', async (sql) => {
      await sql.unsafe(baselineSql);
      await sql.unsafe(`
        INSERT INTO jurisprudence_internal.jurisprudence_governed_sources (source_id, payload_json) VALUES
        ('src_1', '{"sourceId": "src_1"}'), ('src_2', '{"sourceId": "src_2"}');

        INSERT INTO jurisprudence_internal.jurisprudence_record_versions (record_id, version) VALUES ('rec_1', 1);

        INSERT INTO jurisprudence_internal.jurisprudence_source_bindings (binding_id, record_id, record_version, binding_status, payload_json) VALUES
        ('bind_1', 'rec_1', 1, 'active', '{"sourceId": "src_1"}'),
        ('bind_2', 'rec_1', 1, 'active', '{"sourceId": "src_2"}');
      `);

      await executeMigration(sql);

      const bindings = await sql.unsafe(`SELECT * FROM jurisprudence_internal.jurisprudence_source_bindings ORDER BY binding_id`);
      expect(bindings.length).toBe(2);

      const firstBinding = requireDefined(
        bindings[0],
        'Expected first migrated binding.',
      );

      const secondBinding = requireDefined(
        bindings[1],
        'Expected second migrated binding.',
      );

      expect(firstBinding.source_id).toBe('src_1');
      expect(secondBinding.source_id).toBe('src_2');
          });
        });

  it('T3 orphan sourceId fails atomically', async () => {
    await withFixedSchema(process.env, 'jurisprudence_internal', async (sql) => {
      await sql.unsafe(baselineSql);
      await sql.unsafe(`
        INSERT INTO jurisprudence_internal.jurisprudence_record_versions (record_id, version) VALUES ('rec_1', 1);
        INSERT INTO jurisprudence_internal.jurisprudence_source_bindings (binding_id, record_id, record_version, binding_status, payload_json)
        VALUES ('bind_1', 'rec_1', 1, 'active', '{"sourceId": "src_missing"}');
      `);

      await expect(executeMigration(sql)).rejects.toThrow(/Found 1 orphaned source_id/);

      // Verify rollback
      const cols = await inspectColumns(sql, 'jurisprudence_internal', 'jurisprudence_source_bindings');
      expect(cols.find(c => c.column_name === 'source_id')).toBeUndefined();
    });
  });

  it('T4 missing sourceId fails atomically', async () => {
    await withFixedSchema(process.env, 'jurisprudence_internal', async (sql) => {
      await sql.unsafe(baselineSql);
      await sql.unsafe(`
        INSERT INTO jurisprudence_internal.jurisprudence_record_versions (record_id, version) VALUES ('rec_1', 1);
        INSERT INTO jurisprudence_internal.jurisprudence_source_bindings (binding_id, record_id, record_version, binding_status, payload_json)
        VALUES ('bind_1', 'rec_1', 1, 'active', '{"other_key": "val"}');
      `);

      await expect(executeMigration(sql)).rejects.toThrow(/missing, malformed, or non-string/);

      // Verify rollback
      const cols = await inspectColumns(sql, 'jurisprudence_internal', 'jurisprudence_source_bindings');
      expect(cols.find(c => c.column_name === 'source_id')).toBeUndefined();

      const fks = await inspectForeignKeys(sql, 'jurisprudence_internal', 'jurisprudence_source_bindings');
      expect(fks.find(c => c.constraint_name === 'jurisprudence_source_bindings_source_id_fk')).toBeUndefined();

      const indexes = await sql.unsafe(`
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'jurisprudence_internal' AND tablename = 'jurisprudence_source_bindings'
      `);
      expect(indexes.some(i => i.indexname === 'jurisprudence_source_bindings_source_id_idx')).toBe(false);
    });
  });

  it('T4B invalid sourceId representations fail atomically', async () => {
    await withFixedSchema(process.env, 'jurisprudence_internal', async (sql) => {
      await sql.unsafe(baselineSql);
      await sql.unsafe(`INSERT INTO jurisprudence_internal.jurisprudence_record_versions (record_id, version) VALUES ('rec_1', 1);`);

      const invalidPayloads = [
        '{"sourceId": null}',
        '{"sourceId": 123}',
        '{"sourceId": true}',
        '{"sourceId": []}',
        '{"sourceId": {}}',
        '{"sourceId": ""}',
        '{"sourceId": "  "}',
        '{"sourceId": "ab"}', // < 3
        '{"sourceId": "' + 'a'.repeat(161) + '"}', // > 160
        '{"sourceId": "12345678"}', // purely digits
        '{"sourceId": "inv@lid"}', // regex fail
      ];

      for (const invalidPayload of invalidPayloads) {
        await sql.unsafe(`
          TRUNCATE jurisprudence_internal.jurisprudence_source_bindings;
          INSERT INTO jurisprudence_internal.jurisprudence_source_bindings
            (binding_id, record_id, record_version, binding_status, payload_json)
          VALUES
            ('bind_test', 'rec_1', 1, 'active', '${invalidPayload}'::jsonb);
        `);

        await expect(executeMigration(sql)).rejects.toThrow(
          /missing, malformed, or non-string/
        );

        // Verify rollback
        const cols = await inspectColumns(sql, 'jurisprudence_internal', 'jurisprudence_source_bindings');
        expect(cols.find(c => c.column_name === 'source_id')).toBeUndefined();

        const fks = await inspectForeignKeys(sql, 'jurisprudence_internal', 'jurisprudence_source_bindings');
        expect(fks.find(c => c.constraint_name === 'jurisprudence_source_bindings_source_id_fk')).toBeUndefined();

        const indexes = await sql.unsafe(`
          SELECT indexname FROM pg_indexes
          WHERE schemaname = 'jurisprudence_internal' AND tablename = 'jurisprudence_source_bindings'
        `);
        expect(indexes.some(i => i.indexname === 'jurisprudence_source_bindings_source_id_idx')).toBe(false);
      }
    });
  });
});
