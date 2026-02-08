export function computeUnlockExpiresIn(activeUntil) {
  if (!activeUntil) return null;

  const now = Date.now();
  const until = new Date(activeUntil).getTime();
  const diffMs = until - now;

  if (diffMs <= 0) return null;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor(
    (diffMs % (1000 * 60 * 60)) / (1000 * 60)
  );

  return { hours, minutes };
}
