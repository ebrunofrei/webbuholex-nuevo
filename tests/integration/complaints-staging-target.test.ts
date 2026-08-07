import { describe, it, expect, vi } from 'vitest';
// @ts-expect-error ignore imports from mjs
import { validateEnvironment, executeMigration } from '../../scripts/complaints-migrate-staging.mjs';

describe('Complaints Staging Target Guard', () => {
  const expectedHost = 'db.test-project-ref.supabase.co';
  const expectedDatabase = 'postgres';
  const expectedProjectRef = 'test-project-ref';

  const validEnv = {
    DATABASE_MIGRATION_URL: `postgres://postgres.test-project-ref:password@${expectedHost}:6543/${expectedDatabase}`,
    COMPLAINTS_STAGING_PROJECT_REF: expectedProjectRef,
    COMPLAINTS_STAGING_DATABASE: expectedDatabase,
    COMPLAINTS_STAGING_ALLOWED_HOST: expectedHost,
  };

  const mockSqlGenerator = (opts: Record<string, unknown> = {}) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    const sql: any = async (strings: any, ...values: any[]) => {
      const query = strings.join(' ');

      if (query.includes('current_database()')) {
        if (opts.dbNameError) return [{ current_database: 'wrong_db' }];
        return [{ current_database: expectedDatabase }];
      }
      if (query.includes('gen_random_uuid()')) {
        if (opts.uuidError) throw new Error('function gen_random_uuid() does not exist');
        return [{}];
      }
      if (query.includes('schema_exists')) {
        return [{ schema_exists: opts.schemaExists || false }];
      }
      if (query.includes('marker_exists_after')) {
        return [{ marker_exists_after: opts.markerExistsAfter ?? true }];
      }
      if (query.includes('has_objects')) {
        return [{ has_objects: opts.hasObjects || false }];
      }
      if (query.includes('INSERT INTO')) {
        return [];
      }
      if (query.includes('SELECT * FROM complaints_private.environment_marker WHERE id = 1')) {
        if (opts.markerSelectError) throw new Error('relation does not exist');
        if (opts.markerData === null) return [];
        return [opts.markerData || { environment: 'staging', project_ref: expectedProjectRef, database_name: expectedDatabase }];
      }

      return [];
    };
    sql.end = vi.fn().mockResolvedValue(undefined);
    sql.options = { parsers: {}, serializers: {} };
    return sql;
  };

  describe('validateEnvironment', () => {
    it('acepta target correcto', () => {
      const result = validateEnvironment(validEnv);
      expect(result.allowedHost).toBe(expectedHost);
    });

    it('rechaza host incorrecto', () => {
      expect(() => validateEnvironment({ ...validEnv, COMPLAINTS_STAGING_ALLOWED_HOST: 'wrong' }))
        .toThrow('complaints_staging_target_unverified');
      expect(() => validateEnvironment({ ...validEnv, DATABASE_MIGRATION_URL: `postgres://postgres.test-project-ref:password@wrong:6543/${expectedDatabase}` }))
        .toThrow('complaints_staging_target_unverified');
    });

    it('rechaza database incorrecta', () => {
      expect(() => validateEnvironment({ ...validEnv, COMPLAINTS_STAGING_DATABASE: 'wrong' }))
        .toThrow('complaints_staging_target_unverified');
    });

    it('rechaza project ref incorrecta', () => {
      expect(() => validateEnvironment({ ...validEnv, COMPLAINTS_STAGING_PROJECT_REF: 'wrong' }))
        .toThrow('complaints_staging_target_unverified');
    });

    it('no incluye URL ni password en errores', () => {
      try {
        validateEnvironment({ ...validEnv, COMPLAINTS_STAGING_ALLOWED_HOST: 'wrong' });
      } catch (e: unknown) {
        expect((e as Error).message).not.toContain('postgres://');
        expect((e as Error).message).not.toContain('password');
        expect((e as Error).message).toBe('complaints_staging_target_unverified');
      }
    });
  });

  describe('executeMigration Bootstrap Flow', () => {
    it('bootstrap correcto respeta orden', async () => {
      const mockSql = mockSqlGenerator();
      const mockMigrator = vi.fn().mockResolvedValue(undefined);

      await expect(executeMigration({
        env: validEnv,
        isBootstrap: true,
        mockSql,
        mockMigrator
      })).resolves.toBeUndefined();

      expect(mockMigrator).toHaveBeenCalled();
      expect(mockSql.end).toHaveBeenCalled();
    });

    it('schema existe + complaints existe + marker no existe => reject', async () => {
      const mockSql = mockSqlGenerator({ schemaExists: true, hasObjects: true });
      const mockMigrator = vi.fn();
      await expect(executeMigration({ env: validEnv, isBootstrap: true, mockSql, mockMigrator }))
        .rejects.toThrow('complaints_staging_target_unverified');
      expect(mockMigrator).not.toHaveBeenCalled();
    });

    it('schema existe + sequence existe => reject', async () => {
      const mockSql = mockSqlGenerator({ schemaExists: true, hasObjects: true });
      const mockMigrator = vi.fn();
      await expect(executeMigration({ env: validEnv, isBootstrap: true, mockSql, mockMigrator }))
        .rejects.toThrow('complaints_staging_target_unverified');
      expect(mockMigrator).not.toHaveBeenCalled();
    });

    it('schema existe + función propia existe => reject', async () => {
      const mockSql = mockSqlGenerator({ schemaExists: true, hasObjects: true });
      const mockMigrator = vi.fn();
      await expect(executeMigration({ env: validEnv, isBootstrap: true, mockSql, mockMigrator }))
        .rejects.toThrow('complaints_staging_target_unverified');
      expect(mockMigrator).not.toHaveBeenCalled();
    });

    it('schema existe vacío => accept', async () => {
      const mockSql = mockSqlGenerator({ schemaExists: true, hasObjects: false });
      const mockMigrator = vi.fn().mockResolvedValue(undefined);
      await expect(executeMigration({ env: validEnv, isBootstrap: true, mockSql, mockMigrator }))
        .resolves.toBeUndefined();
      expect(mockMigrator).toHaveBeenCalled();
    });

    it('schema inexistente => accept', async () => {
      const mockSql = mockSqlGenerator({ schemaExists: false, hasObjects: false });
      const mockMigrator = vi.fn().mockResolvedValue(undefined);
      await expect(executeMigration({ env: validEnv, isBootstrap: true, mockSql, mockMigrator }))
        .resolves.toBeUndefined();
      expect(mockMigrator).toHaveBeenCalled();
    });

    it('marker preexistente => reject', async () => {
      const mockSql = mockSqlGenerator({ schemaExists: true, hasObjects: true });
      const mockMigrator = vi.fn();
      await expect(executeMigration({ env: validEnv, isBootstrap: true, mockSql, mockMigrator }))
        .rejects.toThrow('complaints_staging_target_unverified');
      expect(mockMigrator).not.toHaveBeenCalled();
    });

    it('varias tablas de 0000 pero sin marker => reject', async () => {
      const mockSql = mockSqlGenerator({ schemaExists: true, hasObjects: true });
      const mockMigrator = vi.fn();
      await expect(executeMigration({ env: validEnv, isBootstrap: true, mockSql, mockMigrator }))
        .rejects.toThrow('complaints_staging_target_unverified');
      expect(mockMigrator).not.toHaveBeenCalled();
    });

    it('UUID ausente se rechaza', async () => {
      const mockSql = mockSqlGenerator({ uuidError: true });
      const mockMigrator = vi.fn();

      await expect(executeMigration({ env: validEnv, isBootstrap: true, mockSql, mockMigrator }))
        .rejects.toThrow('complaints_staging_prerequisite_missing');
    });

    it('database incorrecta se rechaza', async () => {
      const mockSql = mockSqlGenerator({ dbNameError: true });
      const mockMigrator = vi.fn();

      await expect(executeMigration({ env: validEnv, isBootstrap: true, mockSql, mockMigrator }))
        .rejects.toThrow('complaints_staging_target_unverified');
    });
  });

  describe('executeMigration Normal Mode', () => {
    it('modo normal exige marker preexistente', async () => {
      const mockSql = mockSqlGenerator({ markerSelectError: true });
      const mockMigrator = vi.fn();

      await expect(executeMigration({ env: validEnv, isBootstrap: false, mockSql, mockMigrator }))
        .rejects.toThrow('complaints_staging_target_unverified');
    });

    it('marker production se rechaza', async () => {
      const mockSql = mockSqlGenerator({
        markerData: { environment: 'production', project_ref: expectedProjectRef, database_name: expectedDatabase }
      });
      const mockMigrator = vi.fn();

      await expect(executeMigration({ env: validEnv, isBootstrap: false, mockSql, mockMigrator }))
        .rejects.toThrow('complaints_staging_target_unverified');
    });

    it('marker project ref distinto se rechaza', async () => {
      const mockSql = mockSqlGenerator({
        markerData: { environment: 'staging', project_ref: 'wrong', database_name: expectedDatabase }
      });
      const mockMigrator = vi.fn();

      await expect(executeMigration({ env: validEnv, isBootstrap: false, mockSql, mockMigrator }))
        .rejects.toThrow('complaints_staging_target_unverified');
    });

    it('marker database distinta se rechaza', async () => {
      const mockSql = mockSqlGenerator({
        markerData: { environment: 'staging', project_ref: expectedProjectRef, database_name: 'wrong' }
      });
      const mockMigrator = vi.fn();

      await expect(executeMigration({ env: validEnv, isBootstrap: false, mockSql, mockMigrator }))
        .rejects.toThrow('complaints_staging_target_unverified');
    });

    it('modo normal verifica marker antes de migrate y vuelve a verificar despues', async () => {
      const mockSql = mockSqlGenerator();
      const mockMigrator = vi.fn();

      await executeMigration({ env: validEnv, isBootstrap: false, mockSql, mockMigrator });
      expect(mockMigrator).toHaveBeenCalled();
      expect(mockSql.end).toHaveBeenCalled();
    });

    it('ningún error/log contiene password o URL', async () => {
      const mockSql = mockSqlGenerator({ markerSelectError: true });
      const mockMigrator = vi.fn();

      try {
         await executeMigration({ env: validEnv, isBootstrap: false, mockSql, mockMigrator });
      } catch (e: unknown) {
         expect((e as Error).message).not.toContain('postgres://');
         expect((e as Error).message).not.toContain('password');
         expect((e as Error).message).toBe('complaints_staging_target_unverified');
      }
    });
  });
});
