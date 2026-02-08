export function applyJurisdictionDrift({
  previousSystem,
  currentSystem,
  driftMemory = {},
  threshold = 2,
}) {
  if (previousSystem === currentSystem) {
    return { system: previousSystem, driftMemory: {} };
  }

  const hits = (driftMemory[currentSystem] || 0) + 1;

  if (hits >= threshold) {
    return { system: currentSystem, driftMemory: {} };
  }

  return {
    system: previousSystem,
    driftMemory: { ...driftMemory, [currentSystem]: hits },
  };
}
