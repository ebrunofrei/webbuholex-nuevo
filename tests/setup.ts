import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, afterAll } from "vitest";
import "vitest-axe/extend-expect";
import type { DatabaseClientBundle } from "@/database/client";

afterEach(() => {
  cleanup();
});

afterAll(async () => {
  const g = globalThis as typeof globalThis & {
    __buholexDatabaseClient__?: DatabaseClientBundle;
    __buholexComplaintsApiClient__?: DatabaseClientBundle;
    __buholexComplaintsWorkerClient__?: DatabaseClientBundle;
    __buholexComplaintsAdminClient__?: DatabaseClientBundle;
    __buholexComplaintsAdminReadClient__?: DatabaseClientBundle;
    __buholexComplaintsAdminDetailReadClient__?: DatabaseClientBundle;
    __buholexAuthorizationClient__?: DatabaseClientBundle;
    __buholexJurisprudencePublicReadClient__?: DatabaseClientBundle;
    __buholexJurisprudencePublicWriteClient__?: DatabaseClientBundle;
    __buholexJurisprudenceInternalClient__?: DatabaseClientBundle;
    __buholexJurisprudenceOutboxClient__?: DatabaseClientBundle;
    __buholexJurisprudenceInternalWriteClient__?: DatabaseClientBundle;
  };

  const clients = [
    g.__buholexDatabaseClient__,
    g.__buholexComplaintsApiClient__,
    g.__buholexComplaintsWorkerClient__,
    g.__buholexComplaintsAdminClient__,
    g.__buholexComplaintsAdminReadClient__,
    g.__buholexComplaintsAdminDetailReadClient__,
    g.__buholexAuthorizationClient__,
    g.__buholexJurisprudencePublicReadClient__,
    g.__buholexJurisprudencePublicWriteClient__,
    g.__buholexJurisprudenceInternalClient__,
    g.__buholexJurisprudenceOutboxClient__,
    g.__buholexJurisprudenceInternalWriteClient__,
  ];

  await Promise.all(
    clients.map(async (clientBundle) => {
      if (clientBundle && clientBundle.sql && typeof clientBundle.sql.end === "function") {
        // use timeout 1s based on postgres contract async function end({ timeout = null } = {})
        await clientBundle.sql.end({ timeout: 1 });
      }
    })
  );
});
