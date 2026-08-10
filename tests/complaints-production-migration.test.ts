/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { validateEnvironment, executeMigration } from '../scripts/complaints-migrate-production.mjs';
import fs from 'fs';
import path from 'path';

vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn(() => ({})),
}));

describe('Complaints Production Migration Guard', () => {
  describe('validateEnvironment', () => {
    it('aborts when migration URL is absent', () => {
      expect(() => validateEnvironment({
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      })).toThrow('complaints_production_target_unverified');
    });

    it('aborts when production target/marker variables are absent', () => {
      expect(() => validateEnvironment({
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      })).toThrow('complaints_production_target_unverified');
    });

    it('aborts when staging credentials/marker variables are present', () => {
      expect(() => validateEnvironment({
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION',
        COMPLAINTS_STAGING_PROJECT_REF: 'staging-proj'
      })).toThrow('complaints_production_target_unverified');
    });

    it('aborts if API URL is used as migration URL', () => {
      expect(() => validateEnvironment({
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        DATABASE_API_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      })).toThrow('complaints_production_target_unverified');
    });

    it('aborts if Worker URL is used as migration URL', () => {
      expect(() => validateEnvironment({
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        DATABASE_WORKER_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      })).toThrow('complaints_production_target_unverified');
    });

    it('aborts if host is incorrect', () => {
      expect(() => validateEnvironment({
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@wrong.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      })).toThrow('complaints_production_target_unverified');
    });

    it('aborts if database is incorrect', () => {
      expect(() => validateEnvironment({
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@prod.db.com/wrong-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      })).toThrow('complaints_production_target_unverified');
    });

    it('aborts if project_ref validation is incompatible (URL clash)', () => {
      expect(() => validateEnvironment({
        DATABASE_MIGRATION_URL: 'postgres://wrong-proj:pass@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      })).toThrow('complaints_production_target_unverified');
    });
  });

  describe('executeMigration', () => {
    it('aborts if marker nonexistent (missing marker) on partial install', async () => {
      const mockSql: any = vi.fn().mockImplementation(async (query: any) => {
        const sqlString = query[0];
        if (sqlString.includes('current_database()')) return [{ current_database: 'prod-db' }];
        if (sqlString.includes('schema_exists')) return [{ schema_exists: true }];
        if (sqlString.includes('environment_marker')) throw new Error('relation does not exist');
        return [];
      });
      mockSql.end = vi.fn().mockResolvedValue(undefined);

      const env = {
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      };

      await expect(executeMigration({ env, mockSql })).rejects.toThrow('complaints_production_target_unverified');
    });

    it('aborts if marker exists but is for staging (marker staging)', async () => {
      const mockSql: any = vi.fn().mockImplementation(async (query: any) => {
        const sqlString = query[0];
        if (sqlString.includes('current_database()')) return [{ current_database: 'prod-db' }];
        if (sqlString.includes('schema_exists')) return [{ schema_exists: true }];
        if (sqlString.includes('environment_marker')) return [{ environment: 'staging', project_ref: 'staging', database_name: 'prod-db' }];
        return [];
      });
      mockSql.end = vi.fn().mockResolvedValue(undefined);

      const env = {
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      };

      await expect(executeMigration({ env, mockSql })).rejects.toThrow('complaints_production_target_unverified');
    });

    it('aborts if marker exists but project_ref incorrect', async () => {
      const mockSql: any = vi.fn().mockImplementation(async (query: any) => {
        const sqlString = query[0];
        if (sqlString.includes('current_database()')) return [{ current_database: 'prod-db' }];
        if (sqlString.includes('schema_exists')) return [{ schema_exists: true }];
        if (sqlString.includes('environment_marker')) return [{ environment: 'production', project_ref: 'wrong-proj', database_name: 'prod-db' }];
        return [];
      });
      mockSql.end = vi.fn().mockResolvedValue(undefined);

      const env = {
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      };

      await expect(executeMigration({ env, mockSql })).rejects.toThrow('complaints_production_target_unverified');
    });

    it('aborts if marker exists but database_name incorrect', async () => {
      const mockSql: any = vi.fn().mockImplementation(async (query: any) => {
        const sqlString = query[0];
        if (sqlString.includes('current_database()')) return [{ current_database: 'prod-db' }];
        if (sqlString.includes('schema_exists')) return [{ schema_exists: true }];
        if (sqlString.includes('environment_marker')) return [{ environment: 'production', project_ref: 'prod-proj', database_name: 'wrong-db' }];
        return [];
      });
      mockSql.end = vi.fn().mockResolvedValue(undefined);

      const env = {
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      };

      await expect(executeMigration({ env, mockSql })).rejects.toThrow('complaints_production_target_unverified');
    });

    it('allows execution up to migrator with unequivocally productive config (marker production correcto)', async () => {
      const mockSql: any = vi.fn().mockImplementation(async (query: any) => {
        const sqlString = query[0];
        if (sqlString.includes('current_database()')) return [{ current_database: 'prod-db' }];
        if (sqlString.includes('schema_exists')) return [{ schema_exists: true }];
        if (sqlString.includes('environment_marker')) return [{ environment: 'production', project_ref: 'prod-proj', database_name: 'prod-db' }];
        if (sqlString.includes('__drizzle_migrations')) return [{ count: '2' }];
        return [];
      });
      mockSql.end = vi.fn().mockResolvedValue(undefined);

      const mockMigrator = vi.fn().mockResolvedValue(true);
      const mockFs = {
        readdirSync: vi.fn().mockReturnValue(['0000.sql', '0001.sql', '0002.sql'])
      };

      const env = {
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      };

      await executeMigration({ env, mockSql, mockMigrator, mockFs, migrationsFolder: 'test' });
      expect(mockMigrator).toHaveBeenCalled();
    });

    it('allows execution up to migrator and inserts marker on virgin database (FIRST DEPLOY) (schema absent + no journal + no roles)', async () => {
      const mockSql: any = vi.fn().mockImplementation(async (query: any) => {
        const sqlString = query[0];
        if (sqlString.includes('current_database()')) return [{ current_database: 'prod-db' }];
        if (sqlString.includes('schema_exists')) return [{ schema_exists: false }]; // Virgin DB
        if (sqlString.includes('journal_exists')) return [{ journal_exists: false }]; // no journal
        if (sqlString.includes('__drizzle_migrations')) return [{ count: '0' }]; // no journal
        if (sqlString.includes('roles_exist')) return [{ roles_exist: false }]; // no roles
        if (sqlString.includes('marker_exists_after')) return [{ marker_exists_after: true }];
        if (sqlString.includes('INSERT INTO')) return []; // success
        if (sqlString.includes('environment_marker WHERE id = 1')) return [{ environment: 'production', project_ref: 'prod-proj', database_name: 'prod-db' }];
        return [];
      });
      mockSql.end = vi.fn().mockResolvedValue(undefined);

      const mockMigrator = vi.fn().mockResolvedValue(true);
      const mockFs = {
        readdirSync: vi.fn().mockReturnValue(['0000.sql'])
      };

      const env = {
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      };

      await executeMigration({ env, mockSql, mockMigrator, mockFs, migrationsFolder: 'test' });
      expect(mockMigrator).toHaveBeenCalled();
      const insertCall = mockSql.mock.calls.find((call: any) =>
        Array.isArray(call[0]) && call[0].some((str: string) => str.includes('INSERT INTO complaints_private.environment_marker'))
      );
      expect(insertCall).toBeDefined();
      expect(insertCall[1]).toBe("prod-proj");
      expect(insertCall[2]).toBe("prod-db");
    });

    it('aborts on first deploy if any logical/physical roles exist (schema absent + API logical role exists)', async () => {
      const mockSql: any = vi.fn().mockImplementation(async (query: any) => {
        const sqlString = query[0];
        if (sqlString.includes('current_database()')) return [{ current_database: 'prod-db' }];
        if (sqlString.includes('schema_exists')) return [{ schema_exists: false }];
        if (sqlString.includes('journal_exists')) return [{ journal_exists: false }];
        if (sqlString.includes('__drizzle_migrations')) return [{ count: '0' }];
        if (sqlString.includes('roles_exist')) return [{ roles_exist: true }]; // Role exists!
        if (sqlString.includes('environment_marker')) throw new Error('relation does not exist'); // simulates failure on fallback
        return [];
      });
      mockSql.end = vi.fn().mockResolvedValue(undefined);

      const env = {
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      };

      await expect(executeMigration({ env, mockSql })).rejects.toThrow('complaints_production_target_unverified');
    });

    it('aborts on first deploy if migration journal incompatible/existente (schema absent + journal exists)', async () => {
      const mockSql: any = vi.fn().mockImplementation(async (query: any) => {
        const sqlString = query[0];
        if (sqlString.includes('current_database()')) return [{ current_database: 'prod-db' }];
        if (sqlString.includes('schema_exists')) return [{ schema_exists: false }];
        if (sqlString.includes('journal_exists')) return [{ journal_exists: true }]; // Journal exists!
        if (sqlString.includes('__drizzle_migrations')) return [{ count: '1' }]; // Journal exists!
        if (sqlString.includes('roles_exist')) return [{ roles_exist: false }];
        if (sqlString.includes('environment_marker')) throw new Error('relation does not exist'); // simulates failure on fallback
        return [];
      });
      mockSql.end = vi.fn().mockResolvedValue(undefined);

      const env = {
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      };

      await expect(executeMigration({ env, mockSql })).rejects.toThrow('complaints_production_target_unverified');
    });

    it('aborts on first deploy if migration journal physically exists but has 0 rows (schema absent + journal physical presence)', async () => {
      const mockSql: any = vi.fn().mockImplementation(async (query: any) => {
        const sqlString = query[0];
        if (sqlString.includes('current_database()')) return [{ current_database: 'prod-db' }];
        if (sqlString.includes('schema_exists')) return [{ schema_exists: false }];
        if (sqlString.includes('journal_exists')) return [{ journal_exists: true }]; // Physical existence is TRUE
        if (sqlString.includes('__drizzle_migrations')) return [{ count: '0' }]; // Even if 0 rows
        if (sqlString.includes('roles_exist')) return [{ roles_exist: false }];
        if (sqlString.includes('environment_marker')) throw new Error('relation does not exist');
        return [];
      });
      mockSql.end = vi.fn().mockResolvedValue(undefined);

      const mockMigrator = vi.fn().mockResolvedValue(true);
      const mockFs = {
        readdirSync: vi.fn().mockReturnValue(['0000.sql'])
      };

      const env = {
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      };

      await expect(executeMigration({ env, mockSql, mockMigrator, mockFs, migrationsFolder: 'test' })).rejects.toThrow('complaints_production_target_unverified');
      expect(mockMigrator).not.toHaveBeenCalled();
      const insertCall = mockSql.mock.calls.find((call: any) =>
        Array.isArray(call[0]) && call[0].some((str: string) => str.includes('INSERT INTO complaints_private.environment_marker'))
      );
      expect(insertCall).toBeUndefined();
    });

    it('aborts if marker row already exists unexpectedly after migrator (duplicate key on INSERT)', async () => {
      const mockSql: any = vi.fn().mockImplementation(async (query: any) => {
        const sqlString = query[0];
        if (sqlString.includes('current_database()')) return [{ current_database: 'prod-db' }];
        if (sqlString.includes('schema_exists')) return [{ schema_exists: false }];
        if (sqlString.includes('journal_exists')) return [{ journal_exists: false }];
        if (sqlString.includes('__drizzle_migrations')) return [{ count: '0' }];
        if (sqlString.includes('roles_exist')) return [{ roles_exist: false }];
        if (sqlString.includes('marker_exists_after')) return [{ marker_exists_after: true }];
        if (sqlString.includes('INSERT INTO')) throw new Error('duplicate key value violates unique constraint'); // Row already exists unexpectedly
        return [];
      });
      mockSql.end = vi.fn().mockResolvedValue(undefined);

      const mockMigrator = vi.fn().mockResolvedValue(true);
      const mockFs = {
        readdirSync: vi.fn().mockReturnValue(['0000.sql'])
      };

      const env = {
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      };

      await expect(executeMigration({ env, mockSql, mockMigrator, mockFs, migrationsFolder: 'test' })).rejects.toThrow('complaints_production_target_unverified');
    });

    it('aborts if post-INSERT verification mismatch', async () => {
      const mockSql: any = vi.fn().mockImplementation(async (query: any) => {
        const sqlString = query[0];
        if (sqlString.includes('current_database()')) return [{ current_database: 'prod-db' }];
        if (sqlString.includes('schema_exists')) return [{ schema_exists: false }];
        if (sqlString.includes('journal_exists')) return [{ journal_exists: false }];
        if (sqlString.includes('__drizzle_migrations')) return [{ count: '0' }];
        if (sqlString.includes('roles_exist')) return [{ roles_exist: false }];
        if (sqlString.includes('marker_exists_after')) return [{ marker_exists_after: true }];
        if (sqlString.includes('INSERT INTO')) return [];
        if (sqlString.includes('environment_marker WHERE id = 1')) return [{ environment: 'production', project_ref: 'WRONG', database_name: 'prod-db' }]; // mismatch!
        return [];
      });
      mockSql.end = vi.fn().mockResolvedValue(undefined);

      const mockMigrator = vi.fn().mockResolvedValue(true);
      const mockFs = {
        readdirSync: vi.fn().mockReturnValue(['0000.sql'])
      };

      const env = {
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      };

      await expect(executeMigration({ env, mockSql, mockMigrator, mockFs, migrationsFolder: 'test' })).rejects.toThrow('complaints_production_target_unverified');
    });

    it('aborts if marker changes after migrate', async () => {
      let runCount = 0;
      const mockSql: any = vi.fn().mockImplementation(async (query: any) => {
        const sqlString = query[0];
        if (sqlString.includes('current_database()')) return [{ current_database: 'prod-db' }];
        if (sqlString.includes('schema_exists')) return [{ schema_exists: true }];
        if (sqlString.includes('environment_marker')) {
          if (runCount === 0) {
            runCount++;
            return [{ environment: 'production', project_ref: 'prod-proj', database_name: 'prod-db' }];
          } else {
            return [{ environment: 'staging', project_ref: 'prod-proj', database_name: 'prod-db' }]; // changed!
          }
        }
        if (sqlString.includes('__drizzle_migrations')) return [{ count: '2' }];
        return [];
      });
      mockSql.end = vi.fn().mockResolvedValue(undefined);

      const mockMigrator = vi.fn().mockResolvedValue(true);
      const mockFs = {
        readdirSync: vi.fn().mockReturnValue(['0000.sql', '0001.sql', '0002.sql'])
      };

      const env = {
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:pass@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION'
      };

      await expect(executeMigration({ env, mockSql, mockMigrator, mockFs, migrationsFolder: 'test' })).rejects.toThrow('complaints_production_target_unverified');
    });

    it('execution errors do not contain secrets or full URL', async () => {
      const env = {
        DATABASE_MIGRATION_URL: 'postgres://prod-proj:SUPER_SECRET_PASSWORD@prod.db.com/prod-db',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj',
        COMPLAINTS_PRODUCTION_DATABASE: 'prod-db',
        COMPLAINTS_PRODUCTION_ALLOWED_HOST: 'prod.db.com',
        COMPLAINTS_PRODUCTION_CONFIRM: 'WRONG_CONFIRM'
      };
      let caughtError: any;
      try {
        await executeMigration({ env });
      } catch (e) {
        caughtError = e;
      }
      expect(caughtError).toBeDefined();
      expect(caughtError.message).toBe('complaints_production_target_unverified');
      expect(caughtError.message).not.toContain('SUPER_SECRET_PASSWORD');
    });
  });

  describe('Static constraints (Code Analysis)', () => {
    it('production wrapper permite INSERT del marker (aprobado por arquitectura) pero NO UPDATE/DELETE ni DDL de bootstrap', () => {
      const scriptPath = path.join(__dirname, '..', 'scripts', 'complaints-migrate-production.mjs');
      const content = fs.readFileSync(scriptPath, 'utf8');

      // The script is now architecturally approved to contain the INSERT for first deploy
      // expect(content).not.toMatch(/INSERT\s+INTO\s+.*environment_marker/i); // REMOVED

      expect(content).not.toMatch(/UPDATE\s+.*environment_marker/i);
      expect(content).not.toMatch(/DELETE\s+FROM\s+.*environment_marker/i);

      // The script should not contain DDL for environment_marker
      expect(content).not.toMatch(/CREATE\s+TABLE\s+.*environment_marker/i);
      expect(content).not.toMatch(/CREATE\s+SCHEMA/i);
      expect(content).not.toMatch(/ALTER\s+TABLE\s+.*environment_marker/i);

      // The script should not contain bootstrap logic (like UUID generation for verification)
      expect(content).not.toContain('--bootstrap');
      expect(content).not.toContain('isBootstrap');
      expect(content).not.toContain('gen_random_uuid');
      expect(content).not.toContain('COMPLAINTS_PRODUCTION_BOOTSTRAP_CONFIRM');
    });

    it('0008 no contiene INSERT/UPDATE/DELETE y solo amplia el CHECK a staging/production', () => {
      const scriptPath = path.join(__dirname, '..', 'database', 'migrations', '0008_complaints_environment_marker_contract.sql');
      const content = fs.readFileSync(scriptPath, 'utf8');

      expect(content).not.toMatch(/INSERT/i);
      expect(content).not.toMatch(/UPDATE/i);
      expect(content).not.toMatch(/DELETE/i);

      expect(content).toMatch(/ALTER\s+TABLE\s+complaints_private.environment_marker\s+ADD\s+CONSTRAINT\s+env_marker_env_check\s+CHECK\s*\(\s*environment\s+IN\s*\(\s*'staging'\s*,\s*'production'\s*\)\s*\)/i);
    });
  });
});
