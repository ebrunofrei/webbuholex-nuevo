import { describe, expect, it } from 'vitest';
import { PostgresJurisprudencePublicationDossierRepository } from '../lib/postgres-jurisprudence-publication-dossier-repository';
import {
  JurisprudenceSourceBinding,
  JurisprudenceSourceRecord,
  PublicationGovernanceIdempotencyEntry
} from '../types/jurisprudence-publication-governance';
import { withFixedSchema } from './helpers/jurisprudence-migration-harness';
import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';

const runRealTests = !!process.env.JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL;
const migrationPath = path.join(process.cwd(), 'database', 'migrations', '0038_jurisprudence_source_binding_fk.sql');

describe('A1.7E FIX-5 Postgres Runtime Tests', () => {
  if (!runRealTests) {
    it.skip('Skipping Real PostgreSQL tests because JURISPRUDENCE_MIGRATION_TEST_DATABASE_URL is not set', () => {});
    return;
  }

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
      payload_json jsonb NOT NULL
    );

    CREATE TABLE jurisprudence_internal.jurisprudence_publication_governance_idempotency (
      idempotency_key varchar PRIMARY KEY,
      command_fingerprint varchar NOT NULL,
      result_json jsonb NOT NULL,
      created_at timestamp NOT NULL DEFAULT NOW()
    );
  `;

  const dummyIdempotency: PublicationGovernanceIdempotencyEntry = {
    idempotencyKey: 'idemp-1',
    commandFingerprint: 'cmd-1',
    result: {
      source: {
        sourceId: 'dummy-source',
        metadataVersion: 1,
        sourceKind: 'official_judicial_portal',
        originType: 'primary_official_online',
        institutionalOrigin: 'Dummy Origin',
        jurisdiction: 'Dummy',
        documentReference: 'doc-ref-1',
        sourceUrl: null,
        sourceDate: '2023-01-01',
        retrievedAt: new Date().toISOString(),
        custodyStatus: 'documented',
        provenanceStatus: 'unverified',
        integrityStatus: 'not_checked',
        rightsStatus: 'unknown',
        privacyStatus: 'not_started',
        availabilityStatus: 'available_internal',
        verificationStatus: 'unverified',
        sourceChecksum: 'dummy-checksum',
        sourceChecksumAlgorithm: 'sha256',
        sourceFingerprint: 'dummy-fingerprint',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }
  };

  it('T8, T9, T10 parity and divergence detection', async () => {
    await withFixedSchema(process.env, 'jurisprudence_internal', async (sql) => {
      await sql.unsafe(baselineSql);
      const migrationContent = fs.readFileSync(migrationPath, 'utf8');
      await sql.unsafe(migrationContent);

      await sql.unsafe(`INSERT INTO jurisprudence_internal.jurisprudence_record_versions (record_id, version) VALUES ('rec_1', 1);`);

      const rdb = drizzle(sql);
      const wdb = drizzle(sql, { schema });

      const repo = new PostgresJurisprudencePublicationDossierRepository({
        getReadDatabase: () => rdb,
        getWriteDatabase: () => wdb,
        withReadRole: async (db, cb) => db.transaction(cb),
        withWriteRole: async (db, cb) => db.transaction(cb)
      });

      const sourceA: JurisprudenceSourceRecord = {
        sourceId: 'src_pg_a',
        metadataVersion: 1,
        sourceKind: 'official_judicial_portal',
        originType: 'primary_official_online',
        institutionalOrigin: 'A Origin',
        jurisdiction: 'A Jurisdiction',
        documentReference: 'doc-a',
        sourceUrl: null,
        sourceDate: '2023-01-01',
        retrievedAt: new Date().toISOString(),
        custodyStatus: 'documented',
        provenanceStatus: 'unverified',
        integrityStatus: 'not_checked',
        rightsStatus: 'unknown',
        privacyStatus: 'not_started',
        availabilityStatus: 'available_internal',
        verificationStatus: 'unverified',
        sourceChecksum: 'checksum-a',
        sourceChecksumAlgorithm: 'sha256',
        sourceFingerprint: 'fingerprint-a',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await repo.createSource(sourceA, { ...dummyIdempotency, idempotencyKey: 'idemp-a' });

      const binding: JurisprudenceSourceBinding = {
        bindingId: 'bind_pg_1',
        sourceId: 'src_pg_a',
        recordId: 'rec_1',
        recordVersion: 1,
        bindingKind: 'official_basis',
        isPrimarySource: true,
        secondarySourceJustificationReference: null,
        bindingStatus: 'active',
        createdAt: new Date().toISOString(),
        supersededAt: null,
        supersededByBindingId: null
      };
      await repo.createBinding(binding, { ...dummyIdempotency, idempotencyKey: 'idemp-b1' });

      // T8 Write Parity
      const rows = await sql.unsafe<{ source_id: string; payload_json: Record<string, unknown> }[]>(`SELECT source_id, payload_json FROM jurisprudence_internal.jurisprudence_source_bindings WHERE binding_id = 'bind_pg_1'`);
      expect(rows.length).toBe(1);
      const row1 = rows[0];
      if (!row1) throw new Error("Row missing");
      expect(row1.source_id).toBe('src_pg_a');
      expect(row1.payload_json.sourceId).toBe('src_pg_a');

      // T8 Supersede
      const replacement: JurisprudenceSourceBinding = {
        bindingId: 'bind_pg_2',
        sourceId: 'src_pg_a',
        recordId: 'rec_1',
        recordVersion: 1,
        bindingKind: 'official_basis',
        isPrimarySource: true,
        secondarySourceJustificationReference: null,
        bindingStatus: 'active',
        createdAt: new Date().toISOString(),
        supersededAt: null,
        supersededByBindingId: null
      };
      const supersededBinding = { ...binding, bindingStatus: 'superseded' as const, supersededAt: new Date().toISOString(), supersededByBindingId: 'bind_pg_2' };
      await repo.supersedeBinding(supersededBinding, replacement, { ...dummyIdempotency, idempotencyKey: 'idemp-b2' });

      const checkSuperseded = await sql.unsafe<{ binding_status: string }[]>(`SELECT binding_status FROM jurisprudence_internal.jurisprudence_source_bindings WHERE binding_id = 'bind_pg_1'`);
      const checkRow = checkSuperseded[0];
      if (!checkRow) throw new Error("Check row missing");
      expect(checkRow.binding_status).toBe('superseded');

      const repRows = await sql.unsafe<{
        source_id: string;
        payload_json: Record<string, unknown>;
      }[]>(
        `SELECT source_id, payload_json
        FROM jurisprudence_internal.jurisprudence_source_bindings
        WHERE binding_id = 'bind_pg_2'`
      );

      const repRow = repRows[0];

      if (!repRow) {
        throw new Error('Rep row missing');
      }

      expect(repRow.source_id).toBe('src_pg_a');
      expect(repRow.payload_json.sourceId).toBe('src_pg_a');

      // T9 Read Roundtrip
      const roundtrip = await repo.findBindingById('bind_pg_2');
      expect(roundtrip).not.toBeNull();
      if (roundtrip) {
        expect(roundtrip.sourceId).toBe('src_pg_a');
      }

      // T10 Divergence
      const sourceB: JurisprudenceSourceRecord = {
        sourceId: 'src_pg_b',
        metadataVersion: 1,
        sourceKind: 'official_judicial_portal',
        originType: 'primary_official_online',
        institutionalOrigin: 'B Origin',
        jurisdiction: 'B Jurisdiction',
        documentReference: 'doc-b',
        sourceUrl: null,
        sourceDate: '2023-01-01',
        retrievedAt: new Date().toISOString(),
        custodyStatus: 'documented',
        provenanceStatus: 'unverified',
        integrityStatus: 'not_checked',
        rightsStatus: 'unknown',
        privacyStatus: 'not_started',
        availabilityStatus: 'available_internal',
        verificationStatus: 'unverified',
        sourceChecksum: 'checksum-b',
        sourceChecksumAlgorithm: 'sha256',
        sourceFingerprint: 'fingerprint-b',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await repo.createSource(sourceB, { ...dummyIdempotency, idempotencyKey: 'idemp-sb' });

      await sql.unsafe(`UPDATE jurisprudence_internal.jurisprudence_source_bindings SET source_id = 'src_pg_b' WHERE binding_id = 'bind_pg_2'`);

      await expect(repo.findBindingById('bind_pg_2')).rejects.toThrowError(
        expect.objectContaining({
          code: 'REPOSITORY_UNAVAILABLE'
        })
      );
    });
  });
});
