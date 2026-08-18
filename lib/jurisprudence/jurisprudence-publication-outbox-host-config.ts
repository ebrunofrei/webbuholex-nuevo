export function isJurisprudencePublicationOutboxProcessorEnabled(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): boolean {
  const value = env.JURISPRUDENCE_OUTBOX_PROCESSOR_ENABLED;

  if (value === "true") {
    return true;
  }

  if (value === "false" || value === undefined) {
    return false;
  }

  throw new Error(
    `STABLE_CONFIG_ERROR: JURISPRUDENCE_OUTBOX_PROCESSOR_ENABLED has invalid value: ${value}`,
  );
}
