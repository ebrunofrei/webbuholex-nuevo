import { describe, expect, it } from "vitest";
import { normalizeJurisprudenceTimestamp } from "../lib/jurisprudence-repository-utils";

describe("normalizeJurisprudenceTimestamp", () => {
  it("normalizes a valid string timestamp", () => {
    const input = "2026-08-18T20:14:28.000Z";
    expect(normalizeJurisprudenceTimestamp(input)).toBe(input);
  });

  it("normalizes a valid string timestamp without timezone to UTC", () => {
    const input = "2026-08-18T20:14:28";
    // Depends on environment, but typically parses to UTC or local.
    // We just expect it to not throw and return a valid ISO string.
    const result = normalizeJurisprudenceTimestamp(input);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
  });

  it("normalizes a valid Date object", () => {
    const date = new Date("2026-08-18T20:14:28.000Z");
    expect(normalizeJurisprudenceTimestamp(date)).toBe("2026-08-18T20:14:28.000Z");
  });

  it("throws an error for an invalid string", () => {
    expect(() => normalizeJurisprudenceTimestamp("invalid-date-string"))
      .toThrow(TypeError);
    expect(() => normalizeJurisprudenceTimestamp("invalid-date-string"))
      .toThrow("timestamp_invalid_string");
  });

  it("throws an error for an invalid Date object", () => {
    const invalidDate = new Date("invalid");
    expect(() => normalizeJurisprudenceTimestamp(invalidDate))
      .toThrow(TypeError);
    expect(() => normalizeJurisprudenceTimestamp(invalidDate))
      .toThrow("timestamp_invalid_date");
  });

  it("throws an error for unsupported types", () => {
    expect(() => normalizeJurisprudenceTimestamp(null)).toThrow("timestamp_invalid_type");
    expect(() => normalizeJurisprudenceTimestamp(undefined)).toThrow("timestamp_invalid_type");
    expect(() => normalizeJurisprudenceTimestamp(1234567890)).toThrow("timestamp_invalid_type");
    expect(() => normalizeJurisprudenceTimestamp({})).toThrow("timestamp_invalid_type");
  });
});
