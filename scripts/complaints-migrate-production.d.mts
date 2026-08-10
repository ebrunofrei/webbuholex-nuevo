export function validateEnvironment(env: Record<string, string | undefined>): {
  migrationUrl: string;
  projectRef: string;
  dbName: string;
  allowedHost: string;
};

export function executeMigration(args: {
  env: Record<string, string | undefined>;
  mockSql?: unknown;
  mockMigrator?: unknown;
  mockFs?: unknown;
  migrationsFolder?: string;
}): Promise<void>;
