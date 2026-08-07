export type TargetConfig = {
  projectRef?: string;
  databaseName?: string;
  host?: string;
};

export type MarkerData = {
  environment?: string;
  projectRef?: string;
  databaseName?: string;
};

export function validateLocalTarget(
  config: TargetConfig,
  expectedHost: string,
  expectedDatabase: string,
  expectedProjectRef: string
): { valid: boolean; error?: string } {
  if (!config.host || config.host !== expectedHost) {
    return { valid: false, error: 'complaints_staging_target_unverified' };
  }
  if (!config.databaseName || config.databaseName !== expectedDatabase) {
    return { valid: false, error: 'complaints_staging_target_unverified' };
  }
  if (!config.projectRef || config.projectRef !== expectedProjectRef) {
    return { valid: false, error: 'complaints_staging_target_unverified' };
  }
  return { valid: true };
}

export function validateBootstrapState(
  hasUuidPrerequisite: boolean
): { valid: boolean; error?: string } {
  if (!hasUuidPrerequisite) {
    return { valid: false, error: 'complaints_staging_prerequisite_missing' };
  }
  return { valid: true };
}

export function validatePersistentMarker(
  marker: MarkerData | null,
  isBootstrap: boolean,
  expectedProjectRef: string,
  expectedDatabase: string
): { valid: boolean; error?: string } {
  if (isBootstrap) {
    // In bootstrap, marker might not exist yet, which is fine, or we don't care at this point,
    // though the requirement says "acepta ausencia de marker en bootstrap"
    if (!marker) {
      return { valid: true };
    }
  }

  if (!marker) {
    return { valid: false, error: 'complaints_staging_target_unverified' };
  }

  if (marker.environment !== 'staging') {
    return { valid: false, error: 'complaints_staging_target_unverified' };
  }
  if (marker.projectRef !== expectedProjectRef) {
    return { valid: false, error: 'complaints_staging_target_unverified' };
  }
  if (marker.databaseName !== expectedDatabase) {
    return { valid: false, error: 'complaints_staging_target_unverified' };
  }

  return { valid: true };
}
