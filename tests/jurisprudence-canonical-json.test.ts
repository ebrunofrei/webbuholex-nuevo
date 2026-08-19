import { describe, expect, it } from "vitest";
import { canonicalizeJson, CanonicalJsonError } from "../lib/core/canonical-json";

describe("Core Canonical JSON", () => {
  it("preserves primitives", () => {
    expect(canonicalizeJson(null)).toBe("null");
    expect(canonicalizeJson(true)).toBe("true");
    expect(canonicalizeJson(false)).toBe("false");
    expect(canonicalizeJson("string")).toBe('"string"');
    expect(canonicalizeJson(1)).toBe("1");
    expect(canonicalizeJson(-0)).toBe("0");
  });

  it("distinguishes types", () => {
    expect(canonicalizeJson(1)).not.toBe(canonicalizeJson("1"));
    expect(canonicalizeJson(true)).not.toBe(canonicalizeJson("true"));
  });

  it("preserves array order", () => {
    const arr1 = [1, 2];
    const arr2 = [2, 1];
    expect(canonicalizeJson(arr1)).toBe("[1,2]");
    expect(canonicalizeJson(arr2)).toBe("[2,1]");
    expect(canonicalizeJson(arr1)).not.toBe(canonicalizeJson(arr2));
  });

  it("reorders object keys alphabetically", () => {
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };
    expect(canonicalizeJson(obj1)).toBe('{"a":1,"b":2}');
    expect(canonicalizeJson(obj2)).toBe('{"a":1,"b":2}');
    expect(canonicalizeJson(obj1)).toBe(canonicalizeJson(obj2));
  });

  it("reorders nested object keys", () => {
    const obj1 = { a: 1, b: { d: 4, c: 3 } };
    const obj2 = { b: { c: 3, d: 4 }, a: 1 };
    expect(canonicalizeJson(obj1)).toBe('{"a":1,"b":{"c":3,"d":4}}');
    expect(canonicalizeJson(obj2)).toBe('{"a":1,"b":{"c":3,"d":4}}');
    expect(canonicalizeJson(obj1)).toBe(canonicalizeJson(obj2));
  });

  it("rejects invalid JSON values", () => {
    expect(() => canonicalizeJson(undefined)).toThrow(CanonicalJsonError);
    expect(() => canonicalizeJson(Symbol("test"))).toThrow(CanonicalJsonError);
    expect(() => canonicalizeJson(() => {})).toThrow(CanonicalJsonError);
    expect(() => canonicalizeJson(NaN)).toThrow(CanonicalJsonError);
    expect(() => canonicalizeJson(Infinity)).toThrow(CanonicalJsonError);
  });

  it("handles empty arrays and objects", () => {
    expect(canonicalizeJson([])).toBe("[]");
    expect(canonicalizeJson({})).toBe("{}");
  });
});
