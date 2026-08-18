export const JURISPRUDENCE_OUTBOX_MAX_ATTEMPTS = 5;

export const JURISPRUDENCE_OUTBOX_PROCESSING_STALE_MS = 5 * 60 * 1000;

export function getJurisprudenceOutboxRetryDelayMs(
  attempt: number
): number | null {
  if (attempt <= 0 || !Number.isInteger(attempt)) {
    throw new Error("jurisprudence_outbox_invalid_attempt");
  }

  switch (attempt) {
    case 1:
      return 30_000;
    case 2:
      return 120_000;
    case 3:
      return 600_000;
    case 4:
      return 1_800_000;
    default:
      return null;
  }
}
