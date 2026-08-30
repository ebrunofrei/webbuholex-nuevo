import { describe, it, expect } from "vitest";
import { isJurisprudencePublicationExecutionEnabled } from "../lib/jurisprudence/jurisprudence-publication-execution-config";

describe("isJurisprudencePublicationExecutionEnabled", () => {
  it("returns false for undefined", () => {
    expect(isJurisprudencePublicationExecutionEnabled({})).toBe(false);
  });

  it("returns false for 'false'", () => {
    expect(
      isJurisprudencePublicationExecutionEnabled({
        JURISPRUDENCE_PUBLICATION_EXECUTION_ENABLED: "false",
      }),
    ).toBe(false);
  });

  it("returns true for 'true'", () => {
    expect(
      isJurisprudencePublicationExecutionEnabled({
        JURISPRUDENCE_PUBLICATION_EXECUTION_ENABLED: "true",
      }),
    ).toBe(true);
  });

  it("throws for invalid value", () => {
    expect(() =>
      isJurisprudencePublicationExecutionEnabled({
        JURISPRUDENCE_PUBLICATION_EXECUTION_ENABLED: "invalid",
      }),
    ).toThrow(
      "STABLE_CONFIG_ERROR: JURISPRUDENCE_PUBLICATION_EXECUTION_ENABLED has invalid value: invalid",
    );
  });

  it("throws for empty string", () => {
    expect(() =>
      isJurisprudencePublicationExecutionEnabled({
        JURISPRUDENCE_PUBLICATION_EXECUTION_ENABLED: "",
      }),
    ).toThrow(
      "STABLE_CONFIG_ERROR: JURISPRUDENCE_PUBLICATION_EXECUTION_ENABLED has invalid value: ",
    );
  });
});
