// @vitest-environment node
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { SqliteJurisprudencePublicationDossierRepository } from '../lib/sqlite-jurisprudence-publication-dossier-repository';
import {
  JurisprudenceSourceBinding,
  JurisprudenceSourceRecord,
  PublicationGovernanceIdempotencyEntry
} from '../types/jurisprudence-publication-governance';
import { DatabaseSync } from 'node:sqlite';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import os from 'os';

function requireStringProperty(
  value: unknown,
  key: string,
  message: string,
): string {
  if (
    value === null ||
    (typeof value !== 'object' && typeof value !== 'function')
  ) {
    throw new Error(message);
  }

  const property = Reflect.get(value, key);

  if (typeof property !== 'string') {
    throw new Error(message);
  }

  return property;
}

function parseJsonValue(raw: string): unknown {
  return JSON.parse(raw);
}

describe('A1.7E FIX-5 SQLite Runtime Tests', () => {
  let repo: SqliteJurisprudencePublicationDossierRepository;
  let db: DatabaseSync;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `test-sqlite-${uuidv4()}.db`);
    repo = new SqliteJurisprudencePublicationDossierRepository(dbPath);
    db = new DatabaseSync(dbPath);
  });

  afterEach(async () => {
    await repo.close();
    db.close();
    fs.unlinkSync(dbPath);
  });

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

  it('T8: Write parity and T9: Read roundtrip', async () => {
    const source: JurisprudenceSourceRecord = {
      sourceId: 'src_sqlite_1',
      metadataVersion: 1,
      sourceKind: 'official_judicial_portal',
      originType: 'primary_official_online',
      institutionalOrigin: 'Sqlite Origin',
      jurisdiction: 'Sqlite',
      documentReference: 'doc-sqlite',
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
      sourceChecksum: 'checksum-sqlite',
      sourceChecksumAlgorithm: 'sha256',
      sourceFingerprint: 'fingerprint-sqlite',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await repo.createSource(source, dummyIdempotency);

    const binding: JurisprudenceSourceBinding = {
      bindingId: 'bind_sqlite_1',
      sourceId: 'src_sqlite_1',
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
    await repo.createBinding(binding, { ...dummyIdempotency, idempotencyKey: 'idemp-2' });

    // Physical inspection (T8)
    const row = db
      .prepare(
        "SELECT source_id, payload_json FROM jurisprudence_source_bindings WHERE binding_id = ?"
      )
      .get('bind_sqlite_1');

    const physicalSourceId = requireStringProperty(
      row,
      'source_id',
      'Expected bind_sqlite_1.source_id to be a string.',
    );

    const payloadJson = requireStringProperty(
      row,
      'payload_json',
      'Expected bind_sqlite_1.payload_json to be a string.',
    );

    expect(physicalSourceId).toBe('src_sqlite_1');

    const payload = parseJsonValue(payloadJson);

    expect(
      requireStringProperty(
        payload,
        'sourceId',
        'Expected bind_sqlite_1 payload.sourceId to be a string.',
      ),
    ).toBe('src_sqlite_1');

    // Supersede parity (T8)
    const replacement: JurisprudenceSourceBinding = {
      bindingId: 'bind_sqlite_2',
      sourceId: 'src_sqlite_1',
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
    const supersededBinding = { ...binding, bindingStatus: 'superseded' as const, supersededAt: new Date().toISOString(), supersededByBindingId: 'bind_sqlite_2' };
    await repo.supersedeBinding(supersededBinding, replacement, { ...dummyIdempotency, idempotencyKey: 'idemp-3' });

    const replacementRow = db
      .prepare(
        "SELECT source_id, payload_json FROM jurisprudence_source_bindings WHERE binding_id = ?"
      )
      .get('bind_sqlite_2');

    const replacementSourceId = requireStringProperty(
      replacementRow,
      'source_id',
      'Expected bind_sqlite_2.source_id to be a string.',
    );

    const replacementPayloadJson = requireStringProperty(
      replacementRow,
      'payload_json',
      'Expected bind_sqlite_2.payload_json to be a string.',
    );

    expect(replacementSourceId).toBe('src_sqlite_1');

    const replacementPayload = parseJsonValue(replacementPayloadJson);

    expect(
      requireStringProperty(
        replacementPayload,
        'sourceId',
        'Expected bind_sqlite_2 payload.sourceId to be a string.',
      ),
    ).toBe('src_sqlite_1');

    // Read roundtrip (T9)
    const readRoundtrip = await repo.findBindingById('bind_sqlite_2');
    expect(readRoundtrip).not.toBeNull();
    if (readRoundtrip) {
      expect(readRoundtrip.sourceId).toBe('src_sqlite_1');
      expect(readRoundtrip.bindingId).toBe('bind_sqlite_2');
    }
  });

  it('T10: Divergence rejected', async () => {
    const sourceA: JurisprudenceSourceRecord = {
      sourceId: 'src_sqlite_1',
      metadataVersion: 1,
      sourceKind: 'official_judicial_portal',
      originType: 'primary_official_online',
      institutionalOrigin: 'Sqlite Origin',
      jurisdiction: 'Sqlite',
      documentReference: 'doc-sqlite',
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
      sourceChecksum: 'checksum-sqlite',
      sourceChecksumAlgorithm: 'sha256',
      sourceFingerprint: 'fingerprint-sqlite',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const sourceB: JurisprudenceSourceRecord = {
      sourceId: 'src_b',
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
    await repo.createSource(sourceA, { ...dummyIdempotency, idempotencyKey: 'idemp-a' });
    await repo.createSource(sourceB, { ...dummyIdempotency, idempotencyKey: 'idemp-b' });

    const binding: JurisprudenceSourceBinding = {
      bindingId: 'bind_div',
      sourceId: 'src_sqlite_1',
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
    await repo.createBinding(binding, { ...dummyIdempotency, idempotencyKey: 'idemp-div' });

    // Force divergence physically
    db.prepare("UPDATE jurisprudence_source_bindings SET source_id = 'src_b' WHERE binding_id = 'bind_div'").run();

    // Verify rejection
    await expect(repo.findBindingById('bind_div')).rejects.toThrowError(
      expect.objectContaining({
        code: 'REPOSITORY_UNAVAILABLE'
      })
    );
  });

  it('SQLite DELETE RESTRICT works', async () => {
    const source: JurisprudenceSourceRecord = {
      sourceId: 'src_restrict',
      metadataVersion: 1,
      sourceKind: 'official_judicial_portal',
      originType: 'primary_official_online',
      institutionalOrigin: 'R Origin',
      jurisdiction: 'R Jurisdiction',
      documentReference: 'doc-r',
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
      sourceChecksum: 'checksum-r',
      sourceChecksumAlgorithm: 'sha256',
      sourceFingerprint: 'fingerprint-r',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await repo.createSource(source, dummyIdempotency);

    const binding: JurisprudenceSourceBinding = {
      bindingId: 'bind_restrict',
      sourceId: 'src_restrict',
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
    await repo.createBinding(binding, { ...dummyIdempotency, idempotencyKey: 'idemp-res' });

    // Attempt to delete governed source directly
    expect(() => {
      db.prepare("DELETE FROM jurisprudence_governed_sources WHERE source_id = 'src_restrict'").run();
    }).toThrowError(/FOREIGN KEY constraint failed/);
  });
});
