import { describe, it, expect, vi } from 'vitest';
import { validateEnvironment, executeMigration } from '../scripts/jurisprudence-migrate-staging.mjs';

vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn(() => ({})),
}));

describe('Jurisprudence Staging Migration Guard', () => {
  describe('validateEnvironment', () => {
    it('accepts valid real-shape staging target', () => {
      const result = validateEnvironment({
        DATABASE_MIGRATION_URL: 'postgres://postgres.eyaxxyacysfawlsallic:fake-password@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'
      });
      expect(result.dbName).toBe('postgres');
      expect(result.migrationUrl).toBeDefined();
    });

    it('aborts when migration URL is absent', () => {
      expect(() => validateEnvironment({})).toThrow('jurisprudence_staging_target_unverified');
    });

    it('aborts when target is Production (defense in depth)', () => {
      expect(() => validateEnvironment({
        DATABASE_MIGRATION_URL: 'postgres://postgres.prod-proj:pass@prod.db.com:5432/postgres',
        COMPLAINTS_PRODUCTION_PROJECT_REF: 'prod-proj'
      })).toThrow('jurisprudence_staging_target_unverified');
    });

    it('aborts when wrong/Production target without prod ref env', () => {
      expect(() => validateEnvironment({
        DATABASE_MIGRATION_URL: 'postgres://postgres.prod-proj:pass@prod.db.com:5432/postgres'
      })).toThrow('jurisprudence_staging_target_unverified');
    });

    it('aborts if self-consistent wrong target is supplied', () => {
      // Caller supplies matching wrong URL and fake environment vars
      expect(() => validateEnvironment({
        DATABASE_MIGRATION_URL: 'postgres://postgres.wrong-proj:pass@wrong.db.com:5432/wrong-db',
        JURISPRUDENCE_STAGING_DATABASE: 'wrong-db',
        JURISPRUDENCE_STAGING_ALLOWED_HOST: 'wrong.db.com'
      })).toThrow('jurisprudence_staging_target_unverified');
    });

    it('aborts if same username, wrong host', () => {
      expect(() => validateEnvironment({
        DATABASE_MIGRATION_URL: 'postgres://postgres.eyaxxyacysfawlsallic:pass@wrong.example.com:5432/postgres'
      })).toThrow('jurisprudence_staging_target_unverified');
    });

    it('aborts if same username, wrong Supabase host', () => {
      expect(() => validateEnvironment({
        DATABASE_MIGRATION_URL: 'postgres://postgres.eyaxxyacysfawlsallic:pass@aws-1-sa-east-1.pooler.supabase.com:5432/postgres'
      })).toThrow('jurisprudence_staging_target_unverified');
    });

    it('aborts if same username/host, wrong DB', () => {
      expect(() => validateEnvironment({
        DATABASE_MIGRATION_URL: 'postgres://postgres.eyaxxyacysfawlsallic:pass@aws-0-sa-east-1.pooler.supabase.com:5432/wrong-db'
      })).toThrow('jurisprudence_staging_target_unverified');
    });

    it('aborts if bare project ref username', () => {
      expect(() => validateEnvironment({
        DATABASE_MIGRATION_URL: 'postgres://eyaxxyacysfawlsallic:pass@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'
      })).toThrow('jurisprudence_staging_target_unverified');
    });

    it('aborts if partial project ref username', () => {
      expect(() => validateEnvironment({
        DATABASE_MIGRATION_URL: 'postgres://postgres.eyaxxyacysfawlsallic-fake:pass@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'
      })).toThrow('jurisprudence_staging_target_unverified');
    });

    it('aborts if transaction pooler / 6543 port is used', () => {
      expect(() => validateEnvironment({
        DATABASE_MIGRATION_URL: 'postgres://postgres.eyaxxyacysfawlsallic:pass@aws-0-sa-east-1.pooler.supabase.com:6543/postgres'
      })).toThrow('jurisprudence_staging_target_unverified');
    });
  });

  describe('executeMigration', () => {
    it('migration success: connection constructed, migrate invoked, connection closed', async () => {
      const mockSql = Object.assign(
        vi.fn(async (query: readonly string[]) => {
          const sqlString = query[0] ?? '';
          if (sqlString.includes('current_database()')) return [{ current_database: 'postgres' }];
          return [];
        }),
        { end: vi.fn().mockResolvedValue(undefined) }
      );

      const mockMigrator = vi.fn(async (db: unknown, config: { migrationsFolder: string }) => {
        // migrator success
      });

      const env = {
        DATABASE_MIGRATION_URL: 'postgres://postgres.eyaxxyacysfawlsallic:pass@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'
      };

      await executeMigration({ env, mockSql, mockMigrator, migrationsFolder: 'database/migrations' });

      expect(mockMigrator).toHaveBeenCalledTimes(1);
      expect(mockMigrator.mock.calls[0]?.[1]).toEqual({ migrationsFolder: 'database/migrations' });
      expect(mockSql.end).toHaveBeenCalledTimes(1);
    });

    it('migration failure propagates original error and connection closes', async () => {
      const mockSql = Object.assign(
        vi.fn(async (query: readonly string[]) => {
          const sqlString = query[0] ?? '';
          if (sqlString.includes('current_database()')) return [{ current_database: 'postgres' }];
          return [];
        }),
        { end: vi.fn().mockResolvedValue(undefined) }
      );

      const mockMigrator = vi.fn(async (db: unknown, config: { migrationsFolder: string }) => {
        throw new Error('migration failed randomly');
      });

      const env = {
        DATABASE_MIGRATION_URL: 'postgres://postgres.eyaxxyacysfawlsallic:pass@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'
      };

      await expect(executeMigration({ env, mockSql, mockMigrator })).rejects.toThrow('migration failed randomly');

      expect(mockMigrator).toHaveBeenCalledTimes(1);
      expect(mockSql.end).toHaveBeenCalledTimes(1);
    });

    it('aborts and does not migrate if current_database() is wrong', async () => {
      const mockSql = Object.assign(
        vi.fn(async (query: readonly string[]) => {
          const sqlString = query[0] ?? '';
          if (sqlString.includes('current_database()')) return [{ current_database: 'wrong-db' }];
          return [];
        }),
        { end: vi.fn().mockResolvedValue(undefined) }
      );

      const mockMigrator = vi.fn(async (db: unknown, config: { migrationsFolder: string }) => {
        // migrator success
      });

      const env = {
        DATABASE_MIGRATION_URL: 'postgres://postgres.eyaxxyacysfawlsallic:pass@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'
      };

      await expect(executeMigration({ env, mockSql, mockMigrator })).rejects.toThrow('jurisprudence_staging_target_unverified');

      expect(mockMigrator).toHaveBeenCalledTimes(0);
      expect(mockSql.end).toHaveBeenCalledTimes(1);
    });

    it('No complaints_private marker dependency', () => {
       expect(validateEnvironment.toString()).not.toContain('complaints_private');
       expect(validateEnvironment.toString()).not.toContain('environment_marker');
    });
  });
});
