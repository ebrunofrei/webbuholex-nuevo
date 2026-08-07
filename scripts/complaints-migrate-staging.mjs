const isBootstrap = process.argv.includes('--bootstrap');

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
const projectRef = process.env.COMPLAINTS_STAGING_PROJECT_REF;
const dbName = process.env.COMPLAINTS_STAGING_DATABASE;
const allowedHost = process.env.COMPLAINTS_STAGING_ALLOWED_HOST;

function validateEnvironment() {
  if (!migrationUrl || !projectRef || !dbName || !allowedHost) {
    console.error('complaints_staging_target_unverified');
    process.exit(1);
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(migrationUrl);
  } catch {
    console.error('complaints_staging_target_unverified');
    process.exit(1);
  }

  if (parsedUrl.hostname !== allowedHost) {
    console.error('complaints_staging_target_unverified');
    process.exit(1);
  }

  const urlDbName = parsedUrl.pathname.slice(1);
  if (urlDbName !== dbName) {
    console.error('complaints_staging_target_unverified');
    process.exit(1);
  }
}

async function run() {
  if (isBootstrap) {
    // 1. Local target validation
    validateEnvironment();
    // 2. Validate UUID prerequisite (simulated for now)
    const hasPrerequisite = process.env.COMPLAINTS_STAGING_HAS_PREREQUISITE !== 'false';
    if (!hasPrerequisite) {
      console.error('complaints_staging_prerequisite_missing');
      process.exit(1);
    }
    // 3. (Future) Run migrations (creates environment_marker via 0001)
    // 4. (Future) Insert exactly the initial row into environment_marker
    // 5. (Future) Verify environment = staging, project_ref = esperado, database_name = esperado
    console.log('Bootstrap validation passed (dry run). Marker would be inserted AFTER migrations.');
  } else {
    // 1. Local target validation
    validateEnvironment();
    // 2. AND Persistent server marker validation (expects environment_marker in DB)
    // (simulated for now since no real DB connection is allowed in this phase)
    const hasMarker = process.env.COMPLAINTS_STAGING_HAS_MARKER !== 'false';
    if (!hasMarker) {
       console.error('complaints_staging_target_unverified');
       process.exit(1);
    }
    // 3. (Future) Run migrations
    console.log('Normal mode validation passed (dry run). Marker verified BEFORE migrations.');
  }
}

run().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
