export function validateEnvironment(env: Record<string, string | undefined>): {
  migrationUrl: string;
  dbName: string;
};

export function executeMigration(args: {
  env: Record<string, string | undefined>;
  mockSql?: unknown;
  mockMigrator?: unknown;
  migrationsFolder?: string;
}): Promise<void>;
