import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'url';
import fs from 'fs';

export function validateEnvironment(env) {
  const migrationUrl = env.DATABASE_MIGRATION_URL;
  const projectRef = env.COMPLAINTS_PRODUCTION_PROJECT_REF;
  const dbName = env.COMPLAINTS_PRODUCTION_DATABASE;
  const allowedHost = env.COMPLAINTS_PRODUCTION_ALLOWED_HOST;
  const confirm = env.COMPLAINTS_PRODUCTION_CONFIRM;

  if (!migrationUrl || !projectRef || !dbName || !allowedHost) {
    throw new Error('complaints_production_target_unverified');
  }

  if (confirm !== 'I_AM_SURE_I_WANT_TO_MIGRATE_PRODUCTION') {
    throw new Error('complaints_production_target_unverified');
  }

  // Reject if API or Worker URL is used as migration URL
  if (env.DATABASE_API_URL && env.DATABASE_API_URL === migrationUrl) {
    throw new Error('complaints_production_target_unverified');
  }
  if (env.DATABASE_WORKER_URL && env.DATABASE_WORKER_URL === migrationUrl) {
    throw new Error('complaints_production_target_unverified');
  }

  // Abort if any staging variable is present
  if (env.COMPLAINTS_STAGING_PROJECT_REF || env.COMPLAINTS_STAGING_DATABASE || env.COMPLAINTS_STAGING_ALLOWED_HOST) {
    throw new Error('complaints_production_target_unverified');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(migrationUrl);
  } catch {
    throw new Error('complaints_production_target_unverified');
  }

  if (parsedUrl.hostname !== allowedHost) {
    throw new Error('complaints_production_target_unverified');
  }

  const urlDbName = parsedUrl.pathname.slice(1);
  if (urlDbName !== dbName) {
    throw new Error('complaints_production_target_unverified');
  }

  if (parsedUrl.protocol !== 'postgres:' && parsedUrl.protocol !== 'postgresql:') {
    throw new Error('complaints_production_target_unverified');
  }

  if (!parsedUrl.username.includes(projectRef)) {
    throw new Error('complaints_production_target_unverified');
  }

  return { migrationUrl, projectRef, dbName, allowedHost };
}

export async function executeMigration({ env, mockSql, mockMigrator, mockFs, migrationsFolder = 'database/migrations' }) {
  let validated;
  try {
    validated = validateEnvironment(env);
  } catch (e) {
    throw new Error(e.message);
  }

  const { migrationUrl, projectRef, dbName } = validated;

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
      throw new Error('complaints_production_target_unverified');
    }

    const fsModule = mockFs || fs;
    let totalLocalMigrations = 0;
    try {
      const localFiles = fsModule.readdirSync(migrationsFolder).filter(f => f.endsWith('.sql'));
      totalLocalMigrations = localFiles.length;
    } catch {
      // Ignored if folder doesn't exist in mocks
    }

    const schemaResult = await sql`
      SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = 'complaints_private') as schema_exists
    `;
    const schemaExists = schemaResult && schemaResult[0] && schemaResult[0].schema_exists;

    let journalExists = false;
    try {
      const journalResult = await sql`
        SELECT EXISTS (
          SELECT 1
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'drizzle'
            AND c.relname = '__drizzle_migrations'
        ) AS journal_exists
      `;
      if (journalResult && journalResult[0] && journalResult[0].journal_exists) {
        journalExists = true;
      }
    } catch {
      // Ignored
    }

    const rolesResult = await sql`
      SELECT EXISTS(
        SELECT 1 FROM pg_roles
        WHERE rolname IN ('complaints_api_runtime', 'complaints_outbox_worker', 'complaints_api_login', 'complaints_worker_login')
      ) as roles_exist
    `;
    const rolesExist = rolesResult && rolesResult[0] && rolesResult[0].roles_exist;

    const isVirgin = !schemaExists && !journalExists && !rolesExist;

    if (isVirgin) {
      await migrator(db, { migrationsFolder });

      const markerAfterResult = await sql`
        SELECT EXISTS(
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'complaints_private' AND c.relname = 'environment_marker'
        ) as marker_exists_after
      `;
      if (!markerAfterResult || !markerAfterResult[0] || !markerAfterResult[0].marker_exists_after) {
        throw new Error('complaints_production_target_unverified');
      }

      await sql`
        INSERT INTO complaints_private.environment_marker (id, environment, project_ref, database_name)
        VALUES (1, 'production', ${projectRef}, ${dbName})
      `;

      const marker = await sql`
        SELECT * FROM complaints_private.environment_marker WHERE id = 1
      `;
      if (!marker || !marker.length || marker[0].environment !== 'production' || marker[0].project_ref !== projectRef || marker[0].database_name !== dbName) {
        throw new Error('complaints_production_target_unverified');
      }

      console.log('complaints_production_migrations_applied');
      console.log('complaints_production_marker_verified');
      console.log('complaints_production_target_verified');
    } else {
      let marker;
      try {
        marker = await sql`
          SELECT * FROM complaints_private.environment_marker WHERE id = 1
        `;
      } catch {
         throw new Error('complaints_production_target_unverified');
      }

      if (!marker || !marker.length || marker[0].environment !== 'production' || marker[0].project_ref !== projectRef || marker[0].database_name !== dbName) {
        throw new Error('complaints_production_target_unverified');
      }

      let appliedMigrations = 0;
      try {
        const dbMigrations = await sql`SELECT count(*) as count FROM drizzle.__drizzle_migrations`;
        if (dbMigrations && dbMigrations[0]) {
          appliedMigrations = parseInt(dbMigrations[0].count, 10);
        }
      } catch {
        // It's possible the migrations table doesn't exist yet, we catch it silently.
      }

      const pending = totalLocalMigrations - appliedMigrations;
      console.log(`complaints_production_migrations_inventory: total=${totalLocalMigrations}, applied=${appliedMigrations}, pending=${pending}`);

      await migrator(db, { migrationsFolder });

      const markerAfter = await sql`
        SELECT * FROM complaints_private.environment_marker WHERE id = 1
      `;
      if (!markerAfter || !markerAfter.length || markerAfter[0].environment !== 'production' || markerAfter[0].project_ref !== projectRef || markerAfter[0].database_name !== dbName) {
        throw new Error('complaints_production_target_unverified');
      }

      console.log('complaints_production_migrations_applied');
      console.log('complaints_production_marker_verified');
      console.log('complaints_production_target_verified');
    }
  } catch (e) {
    let errorMsg = e.message;
    if (errorMsg === 'complaints_production_target_unverified' || errorMsg === 'complaints_production_prerequisite_missing') {
       throw new Error(errorMsg);
    }
    throw new Error('complaints_production_target_unverified');
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
