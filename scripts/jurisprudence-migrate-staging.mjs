import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'url';

const JURISPRUDENCE_STAGING_TARGET = Object.freeze({
  projectRef: 'eyaxxyacysfawlsallic',
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  database: 'postgres',
  username: 'postgres.eyaxxyacysfawlsallic',
  port: '5432',
});

export function validateEnvironment(env) {
  const migrationUrl = env.DATABASE_MIGRATION_URL;

  if (!migrationUrl) {
    throw new Error('jurisprudence_staging_target_unverified');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(migrationUrl);
  } catch {
    throw new Error('jurisprudence_staging_target_unverified');
  }

  // Explicitly reject known Production identities if they are in the environment (defense-in-depth)
  const prodProjectRef = env.COMPLAINTS_PRODUCTION_PROJECT_REF || env.JURISPRUDENCE_PRODUCTION_PROJECT_REF;
  if (prodProjectRef && (parsedUrl.username === `postgres.${prodProjectRef}` || parsedUrl.username === prodProjectRef)) {
    throw new Error('jurisprudence_staging_target_unverified');
  }

  if (parsedUrl.protocol !== 'postgres:' && parsedUrl.protocol !== 'postgresql:') {
    throw new Error('jurisprudence_staging_target_unverified');
  }

  if (parsedUrl.username !== JURISPRUDENCE_STAGING_TARGET.username) {
    throw new Error('jurisprudence_staging_target_unverified');
  }

  if (parsedUrl.hostname !== JURISPRUDENCE_STAGING_TARGET.host) {
    throw new Error('jurisprudence_staging_target_unverified');
  }

  if (parsedUrl.port !== JURISPRUDENCE_STAGING_TARGET.port) {
    throw new Error('jurisprudence_staging_target_unverified');
  }

  const urlDbName = parsedUrl.pathname.slice(1);
  if (urlDbName !== JURISPRUDENCE_STAGING_TARGET.database) {
    throw new Error('jurisprudence_staging_target_unverified');
  }

  return {
    migrationUrl,
    dbName: JURISPRUDENCE_STAGING_TARGET.database
  };
}

export async function executeMigration({ env, mockSql, mockMigrator, migrationsFolder = 'database/migrations' }) {
  let validated;
  try {
    validated = validateEnvironment(env);
  } catch (e) {
    throw new Error(e.message);
  }

  const { migrationUrl, dbName } = validated;

  const sql = mockSql || postgres(migrationUrl, {
    max: 1,
    prepare: false,
    ssl: 'require',
    connect_timeout: 10,
  });

  const db = drizzle(sql);
  const migrator = mockMigrator || migrate;

  try {
    const dbResult = await sql`SELECT current_database()`;
    if (!dbResult || !dbResult[0] || dbResult[0].current_database !== dbName) {
      throw new Error('jurisprudence_staging_target_unverified');
    }

    await migrator(db, { migrationsFolder });

    console.log('jurisprudence_staging_migrations_applied');
    console.log('jurisprudence_staging_target_verified');
  } catch (e) {
    if (e.message === 'jurisprudence_staging_target_unverified') {
       throw e;
    }
    // Any other error from connect/migrate is preserved
    throw e;
  } finally {
    if (sql) {
      if (typeof sql.end === 'function') {
        await sql.end({ timeout: 5 }).catch(() => {});
      }
    }
  }
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]) {
  let isMain = false;
  try {
    isMain = process.argv[1] === fileURLToPath(import.meta.url);
  } catch {
    // Ignore URL parse errors
  }

  if (isMain) {
    executeMigration({ env: process.env })
      .catch((e) => {
        console.error(e.message);
        process.exit(1);
      });
  }
}
