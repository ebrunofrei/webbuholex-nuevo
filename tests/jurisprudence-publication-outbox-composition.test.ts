import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createJurisprudencePublicationOutboxProcessor } from "../lib/jurisprudence/jurisprudence-publication-outbox-composition";
import { JurisprudencePublicationOutboxProcessor } from "../lib/jurisprudence/jurisprudence-publication-outbox-processor";

describe("JurisprudencePublicationOutboxComposition", () => {
  it("creates the processor with the correct adapters without evaluating environment variables immediately", () => {
    // The composition root should use lazy initialization. If it threw here, it would mean
    // it accesses the connection or configuration at import/instantiation time.
    const processor = createJurisprudencePublicationOutboxProcessor();

    expect(processor).toBeInstanceOf(JurisprudencePublicationOutboxProcessor);
  });
});
