import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'url';

export function validateEnvironment(env) {
  const migrationUrl = env.DATABASE_MIGRATION_URL;
  const projectRef = env.COMPLAINTS_STAGING_PROJECT_REF;
  const dbName = env.COMPLAINTS_STAGING_DATABASE;
  const allowedHost = env.COMPLAINTS_STAGING_ALLOWED_HOST;

  if (!migrationUrl || !projectRef || !dbName || !allowedHost) {
    throw new Error('complaints_staging_target_unverified');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(migrationUrl);
  } catch {
    throw new Error('complaints_staging_target_unverified');
  }

  if (parsedUrl.hostname !== allowedHost) {
    throw new Error('complaints_staging_target_unverified');
  }

  const urlDbName = parsedUrl.pathname.slice(1);
  if (urlDbName !== dbName) {
    throw new Error('complaints_staging_target_unverified');
  }

  if (parsedUrl.protocol !== 'postgres:' && parsedUrl.protocol !== 'postgresql:') {
    throw new Error('complaints_staging_target_unverified');
  }

  if (!parsedUrl.username.includes(projectRef)) {
    throw new Error('complaints_staging_target_unverified');
  }

  return { migrationUrl, projectRef, dbName, allowedHost };
}

export async function executeMigration({ env, isBootstrap, mockSql, mockMigrator, migrationsFolder = 'database/migrations' }) {
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
      throw new Error('complaints_staging_target_unverified');
    }

    if (isBootstrap) {
      try {
        await sql`SELECT gen_random_uuid()`;
      } catch {
        throw new Error('complaints_staging_prerequisite_missing');
      }

      const schemaResult = await sql`
        SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname = 'complaints_private') as schema_exists
      `;
      if (schemaResult && schemaResult[0] && schemaResult[0].schema_exists) {
        const hasObjectsResult = await sql`
          SELECT EXISTS(
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'complaints_private'
              AND c.relkind IN ('r', 'v', 'm', 'S', 'f', 'p')
            UNION ALL
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'complaints_private'
          ) as has_objects
        `;
        if (hasObjectsResult && hasObjectsResult[0] && hasObjectsResult[0].has_objects) {
           throw new Error('complaints_staging_target_unverified');
        }
      }

      await migrator(db, { migrationsFolder });

      const markerAfterResult = await sql`
        SELECT EXISTS(
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'complaints_private' AND c.relname = 'environment_marker'
        ) as marker_exists_after
      `;
      if (!markerAfterResult || !markerAfterResult[0] || !markerAfterResult[0].marker_exists_after) {
        throw new Error('complaints_staging_target_unverified');
      }

      await sql`
        INSERT INTO complaints_private.environment_marker (id, environment, project_ref, database_name)
        VALUES (1, 'staging', ${projectRef}, ${dbName})
      `;

      const marker = await sql`
        SELECT * FROM complaints_private.environment_marker WHERE id = 1
      `;
      if (!marker || !marker.length || marker[0].environment !== 'staging' || marker[0].project_ref !== projectRef || marker[0].database_name !== dbName) {
        throw new Error('complaints_staging_target_unverified');
      }

      console.log('complaints_staging_migrations_applied');
      console.log('complaints_staging_marker_verified');
      console.log('complaints_staging_bootstrap_complete');

    } else {
      let marker;
      try {
        marker = await sql`
          SELECT * FROM complaints_private.environment_marker WHERE id = 1
        `;
      } catch {
         throw new Error('complaints_staging_target_unverified');
      }

      if (!marker || !marker.length || marker[0].environment !== 'staging' || marker[0].project_ref !== projectRef || marker[0].database_name !== dbName) {
        throw new Error('complaints_staging_target_unverified');
      }

      await migrator(db, { migrationsFolder });

      const markerAfter = await sql`
        SELECT * FROM complaints_private.environment_marker WHERE id = 1
      `;
      if (!markerAfter || !markerAfter.length || markerAfter[0].environment !== 'staging' || markerAfter[0].project_ref !== projectRef || markerAfter[0].database_name !== dbName) {
        throw new Error('complaints_staging_target_unverified');
      }

      console.log('complaints_staging_migrations_applied');
      console.log('complaints_staging_marker_verified');
      console.log('complaints_staging_target_verified');
    }
  } catch (e) {
    let errorMsg = e.message;
    if (errorMsg === 'complaints_staging_target_unverified' || errorMsg === 'complaints_staging_prerequisite_missing') {
       throw new Error(errorMsg);
    }
    throw new Error('complaints_staging_target_unverified');
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
    const isBootstrap = process.argv.includes('--bootstrap');
    executeMigration({ env: process.env, isBootstrap })
      .catch((e) => {
        console.error(e.message);
        process.exit(1);
      });
  }
}
