import { describe, it, expect } from "vitest";
import {
  JURISPRUDENCE_OUTBOX_MAX_ATTEMPTS,
  JURISPRUDENCE_OUTBOX_PROCESSING_STALE_MS,
  getJurisprudenceOutboxRetryDelayMs,
} from "../lib/jurisprudence/jurisprudence-publication-outbox-policy";

describe("Jurisprudence Publication Outbox Policy", () => {
  it("defines MAX_ATTEMPTS as 5", () => {
    expect(JURISPRUDENCE_OUTBOX_MAX_ATTEMPTS).toBe(5);
  });

  it("defines PROCESSING_STALE as 5 minutes", () => {
    expect(JURISPRUDENCE_OUTBOX_PROCESSING_STALE_MS).toBe(5 * 60 * 1000);
  });

  describe("getJurisprudenceOutboxRetryDelayMs", () => {
    it("returns correct delays for valid attempts", () => {
      expect(getJurisprudenceOutboxRetryDelayMs(1)).toBe(30_000);
      expect(getJurisprudenceOutboxRetryDelayMs(2)).toBe(120_000);
      expect(getJurisprudenceOutboxRetryDelayMs(3)).toBe(600_000);
      expect(getJurisprudenceOutboxRetryDelayMs(4)).toBe(1_800_000);
    });

    it("returns null for max attempts and beyond (dead letter)", () => {
      expect(getJurisprudenceOutboxRetryDelayMs(5)).toBeNull();
      expect(getJurisprudenceOutboxRetryDelayMs(6)).toBeNull();
      expect(getJurisprudenceOutboxRetryDelayMs(100)).toBeNull();
    });

    it("throws for attempt <= 0 or non-integer", () => {
      expect(() => getJurisprudenceOutboxRetryDelayMs(0)).toThrowError(
        "jurisprudence_outbox_invalid_attempt"
      );
      expect(() => getJurisprudenceOutboxRetryDelayMs(-1)).toThrowError(
        "jurisprudence_outbox_invalid_attempt"
      );
      expect(() => getJurisprudenceOutboxRetryDelayMs(1.5)).toThrowError(
        "jurisprudence_outbox_invalid_attempt"
      );
    });
  });
});
