export function isJurisprudencePublicationCronEnabled(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): boolean {
  const value = env.JURISPRUDENCE_PUBLICATION_CRON_ENABLED;

  if (value === "true") {
    return true;
  }

  if (value === "false" || value === undefined) {
    return false;
  }

  throw new Error(
    `STABLE_CONFIG_ERROR: JURISPRUDENCE_PUBLICATION_CRON_ENABLED has invalid value: ${value}`,
  );
}

export function readJurisprudencePublicationCronSecret(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): string | undefined {
  return env.JURISPRUDENCE_PUBLICATION_CRON_SECRET;
}
