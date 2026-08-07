import { describe, it, expect } from 'vitest';
import {
  validateLocalTarget,
  validateBootstrapState,
  validatePersistentMarker,
} from './complaints-staging-target';

describe('Complaints Staging Target Guard', () => {
  const expectedHost = 'db.test-project-ref.supabase.co';
  const expectedDatabase = 'postgres';
  const expectedProjectRef = 'test-project-ref';

  describe('validateLocalTarget', () => {
    it('acepta target correcto', () => {
      const result = validateLocalTarget(
        {
          host: expectedHost,
          databaseName: expectedDatabase,
          projectRef: expectedProjectRef,
        },
        expectedHost,
        expectedDatabase,
        expectedProjectRef
      );
      expect(result.valid).toBe(true);
    });

    it('rechaza host incorrecto', () => {
      const result = validateLocalTarget(
        {
          host: 'db.wrong.supabase.co',
          databaseName: expectedDatabase,
          projectRef: expectedProjectRef,
        },
        expectedHost,
        expectedDatabase,
        expectedProjectRef
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('complaints_staging_target_unverified');
    });

    it('rechaza database incorrecta', () => {
      const result = validateLocalTarget(
        {
          host: expectedHost,
          databaseName: 'wrong_db',
          projectRef: expectedProjectRef,
        },
        expectedHost,
        expectedDatabase,
        expectedProjectRef
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('complaints_staging_target_unverified');
    });

    it('rechaza project ref incorrecta', () => {
      const result = validateLocalTarget(
        {
          host: expectedHost,
          databaseName: expectedDatabase,
          projectRef: 'wrong-ref',
        },
        expectedHost,
        expectedDatabase,
        expectedProjectRef
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('complaints_staging_target_unverified');
    });

    it('no incluye URL ni password en errores', () => {
      const result = validateLocalTarget(
        {
          host: 'wrong',
          databaseName: 'wrong',
          projectRef: 'wrong',
        },
        expectedHost,
        expectedDatabase,
        expectedProjectRef
      );
      expect(result.error).not.toContain('postgres://');
      expect(result.error).not.toContain('password');
      expect(result.error).toBe('complaints_staging_target_unverified');
    });
  });

  describe('validateBootstrapState', () => {
    it('rechaza UUID prerequisite ausente', () => {
      const result = validateBootstrapState(false);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('complaints_staging_prerequisite_missing');
    });

    it('acepta con UUID prerequisite', () => {
      const result = validateBootstrapState(true);
      expect(result.valid).toBe(true);
    });
  });

  describe('validatePersistentMarker', () => {
    const validMarker = {
      environment: 'staging',
      projectRef: expectedProjectRef,
      databaseName: expectedDatabase,
    };

    it('rechaza ausencia de marker en modo normal', () => {
      const result = validatePersistentMarker(null, false, expectedProjectRef, expectedDatabase);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('complaints_staging_target_unverified');
    });

    it('acepta ausencia de marker en bootstrap', () => {
      const result = validatePersistentMarker(null, true, expectedProjectRef, expectedDatabase);
      expect(result.valid).toBe(true);
    });

    it('rechaza marker production', () => {
      const result = validatePersistentMarker(
        { ...validMarker, environment: 'production' },
        false,
        expectedProjectRef,
        expectedDatabase
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('complaints_staging_target_unverified');
    });

    it('rechaza marker con project ref distinto', () => {
      const result = validatePersistentMarker(
        { ...validMarker, projectRef: 'wrong-ref' },
        false,
        expectedProjectRef,
        expectedDatabase
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('complaints_staging_target_unverified');
    });

    it('rechaza marker con database distinta', () => {
      const result = validatePersistentMarker(
        { ...validMarker, databaseName: 'wrong-db' },
        false,
        expectedProjectRef,
        expectedDatabase
      );
      expect(result.valid).toBe(false);
      expect(result.error).toBe('complaints_staging_target_unverified');
    });

    it('no incluye URL ni password en errores', () => {
       const result = validatePersistentMarker(
        { ...validMarker, databaseName: 'wrong-db' },
        false,
        expectedProjectRef,
        expectedDatabase
      );
      expect(result.error).not.toContain('postgres://');
      expect(result.error).not.toContain('password');
    });
  });
});
