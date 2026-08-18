// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { withJurisprudencePublicationOutboxRole } from "@/database/roles";

import * as schema from "@/database/schema";

describe("J1-E.3B Transactional Outbox Foundation", () => {
  it("should have outbox table in internal schema", () => {
    // Tests that outbox table definition exists in internal schema
    // Since we mock db, we verify structurally that the schema module exposes it.
    expect(schema.jurisprudencePublicationOutbox).toBeDefined();
    // Validate that it points to jurisprudence_internal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((schema.jurisprudencePublicationOutbox as any)[Symbol.for("drizzle:Name")]).toBe("jurisprudence_publication_outbox");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((schema.jurisprudencePublicationOutbox as any)[Symbol.for("drizzle:Schema")]).toBe("jurisprudence_internal");
  });

  it("should expose withJurisprudencePublicationOutboxRole for processor security", async () => {
    const mockTx = {
      execute: vi.fn().mockResolvedValue(true),
    };
    const mockDb = {
      transaction: vi.fn().mockImplementation(async (cb) => {
        return await cb(mockTx);
      }),
    };

    let callbackExecuted = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await withJurisprudencePublicationOutboxRole(mockDb as any, async (tx) => {
      expect(tx).toBe(mockTx);
      expect(mockTx.execute).toHaveBeenCalled();
      const executeArg = mockTx.execute.mock.calls[0]![0];
      const queryStrings = executeArg.queryChunks.map((chunk: unknown) => {
        if (typeof chunk === "string") return chunk;
        if (typeof chunk === "object" && chunk !== null && "value" in chunk) return (chunk as {value: string}).value;
        return "";
      }).join("");
      expect(queryStrings).toContain("SET LOCAL ROLE jurisprudence_publication_outbox_runtime");
      callbackExecuted = true;
      return "result";
    });

    expect(callbackExecuted).toBe(true);
  });

  it("should support required statuses in the schema", () => {
    const statusEnumValues = schema.jurisprudencePublicationOutbox.status.enumValues;
    expect(statusEnumValues).toContain("pending");
    expect(statusEnumValues).toContain("processing");
    expect(statusEnumValues).toContain("sent");
    expect(statusEnumValues).toContain("failed");
    expect(statusEnumValues).toContain("dead_letter");
  });

  it("should support required event types in the schema", () => {
    const eventTypeEnumValues = schema.jurisprudencePublicationOutbox.eventType.enumValues;
    expect(eventTypeEnumValues).toContain("publish_projection");
    expect(eventTypeEnumValues).toContain("withdraw_projection");
  });

  it("should have Check constraints for eventType and status to ensure DB-level validation", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extraConfigBuilder = (schema.jurisprudencePublicationOutbox as any)[Symbol.for("drizzle:ExtraConfigBuilder")];
    expect(typeof extraConfigBuilder).toBe("function");

    const configStr = extraConfigBuilder.toString();

    // Check that check constraints for valid_event_type and valid_status are defined
    expect(configStr).toContain("valid_event_type");
    expect(configStr).toContain("valid_status");
  });
});
