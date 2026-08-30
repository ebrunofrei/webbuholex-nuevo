import "server-only";

export function isJurisprudencePublicationExecutionEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const value = env.JURISPRUDENCE_PUBLICATION_EXECUTION_ENABLED;

  if (value === "true") {
    return true;
  }

  if (value === "false" || value === undefined) {
    return false;
  }

  throw new Error(
    `STABLE_CONFIG_ERROR: JURISPRUDENCE_PUBLICATION_EXECUTION_ENABLED has invalid value: ${value}`,
  );
}
