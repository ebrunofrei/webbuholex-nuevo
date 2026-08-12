// @vitest-environment node

import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import postgres from "postgres";

import type { ProviderResponseHttpPayload } from "@/lib/complaints/complaints-admin-http-runtime";

/**
 * B5C.2
 * STAGING protected admin HTTP integration.
 *
 * IMPORTANT:
 * - STAGING only.
 * - Uses synthetic fixtures only.
 * - Does not provision a real Auth0 user.
 * - Does not execute an outbox worker.
 * - Does not modify production configuration.
 */

loadEnvFile(".env.local");

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for B5C.2 STAGING integration`);
  }

  return value;
}

const migrationUrl = requireEnvironmentVariable("DATABASE_MIGRATION_URL");
requireEnvironmentVariable("DATABASE_ADMIN_URL");
requireEnvironmentVariable("DATABASE_AUTHORIZATION_URL");

const authorizationMockState = vi.hoisted(() => ({
  simulatePersistenceFailure: false,
}));

type MockAuth0Session = {
  user: {
    sub: string;
  };
};

type MockGetSession = () => Promise<MockAuth0Session | null>;

const auth0Mock = vi.hoisted(() => ({
  getSession: vi.fn<MockGetSession>(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/auth0", () => ({
  auth0: auth0Mock,
}));

vi.mock(
  "@/database/repositories/authorization.repository",
  async (importOriginal) => {
    const original =
      await importOriginal<
        typeof import("@/database/repositories/authorization.repository")
      >();

    const { AuthorizationPersistenceError } =
      await import("@/database/repositories/authorization.errors");

    return {
      ...original,

      createAuthorizationRepository: vi.fn(
        (
          database: Parameters<
            typeof original.createAuthorizationRepository
          >[0],
        ) => {
          if (!authorizationMockState.simulatePersistenceFailure) {
            return original.createAuthorizationRepository(database);
          }

          const unavailableRepository = {
            resolveAuthorizedOperator: vi
              .fn()
              .mockRejectedValue(
                new AuthorizationPersistenceError(
                  "simulated_authorization_persistence_failure",
                ),
              ),
          } satisfies ReturnType<
            typeof original.createAuthorizationRepository
          >;

          return unavailableRepository;
        },
      ),
    };
  },
);

const { POST } =
  await import(
    "@/app/api/admin/complaints/[complaintId]/responses/route"
  );

type RouteContext = Parameters<typeof POST>[1];

type RuntimeDatabaseClient = {
  sql: {
    end: () => Promise<void>;
  };
};

type RuntimeGlobals = typeof globalThis & {
  __buholexAuthorizationClient__?: RuntimeDatabaseClient;
  __buholexComplaintsAdminClient__?: RuntimeDatabaseClient;
};

type TriggerStateRow = {
  tgname: string;
  tgenabled: string;
};

const runtimeGlobals = globalThis as RuntimeGlobals;

const sql = postgres(migrationUrl, {
  ssl: "require",
  max: 1,
  prepare: false,
});

const fixtureOperatorId = randomUUID();
const fixtureSubjectId =
  `auth0|buholex-b5c-staging-http-${randomUUID()}`;
const unmappedSubjectId =
  `auth0|buholex-b5c-staging-http-unmapped-${randomUUID()}`;

const fixtureComplaintId = randomUUID();

const fixtureRegistry = {
  operators: new Set<string>(),
  complaints: new Set<string>(),
};

const validPayload = {
  expectedCurrentStatus: "under_review",
  responseChannel: "email",
  responderName: "B5C.2 Staging Responder",
  responderRole: "Integration Tester",
  responseText: "Synthetic B5C.2 provider response",
  actionsTaken: "Synthetic B5C.2 action",
} satisfies ProviderResponseHttpPayload;

function createRouteContext(complaintId: string): RouteContext {
  return {
    params: Promise.resolve({
      complaintId,
    }),
  };
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (typeof body === "string") {
    return body;
  }

  return JSON.stringify(body);
}

function buildRequest(
  body: unknown,
  options: {
    complaintId?: string;
    headers?: Record<string, string>;
  } = {},
): Request {
  const complaintId =
    options.complaintId ?? fixtureComplaintId;

  const serializedBody = serializeBody(body);

  return new Request(
    `http://localhost/api/admin/complaints/${complaintId}/responses`,
    {
      method: "POST",

      headers: {
        Origin: "http://localhost",
        Host: "localhost",
        "Content-Type": "application/json",
        ...options.headers,
      },

      ...(serializedBody !== undefined
        ? { body: serializedBody }
        : {}),
    },
  );
}

async function postTest(
  request: Request,
  complaintId: string = fixtureComplaintId,
): Promise<Response> {
  return POST(
    request,
    createRouteContext(complaintId),
  );
}

function mockSession(
  authenticated = true,
  mapped = true,
): void {
  if (!authenticated) {
    auth0Mock.getSession.mockResolvedValue(null);
    return;
  }

  auth0Mock.getSession.mockResolvedValue({
    user: {
      sub: mapped
        ? fixtureSubjectId
        : unmappedSubjectId,
    },
  });
}

async function createComplaintFixture(
  complaintId: string,
  status: "under_review" | "awaiting_information" | "answered" = "under_review",
): Promise<void> {
  fixtureRegistry.complaints.add(complaintId);

  const year = new Date().getFullYear();
  const sequence =
    Math.floor(Math.random() * 800_000) + 100_000;

  const sheetNumber = `${year}-${sequence}`;
  const idempotencyMarker =
    `b5c2-fixture-${complaintId}`;

  await sql`
    INSERT INTO complaints_private.complaints (
      id,
      schema_version,
      sheet_year,
      sheet_sequence,
      sheet_number,
      private_token_hash,
      token_hash_key_version,
      idempotency_key_hash,
      idempotency_hash_key_version,
      payload_hash,
      status,
      submitted_at,
      deadline_at,
      payload_snapshot
    )
    VALUES (
      ${complaintId},
      '1',
      ${year},
      ${sequence},
      ${sheetNumber},
      'b5c2-private-token-hash',
      1,
      ${idempotencyMarker},
      1,
      'b5c2-payload-hash',
      ${status},
      NOW(),
      NOW(),
      '{}'::jsonb
    )
  `;
}

async function restoreAppendOnlyTriggers(): Promise<void> {
  const results = await Promise.allSettled([
    sql`
      ALTER TABLE complaints_private.complaint_provider_responses
      ENABLE TRIGGER prevent_update_delete_provider_responses
    `,

    sql`
      ALTER TABLE complaints_private.complaint_status_history
      ENABLE TRIGGER prevent_update_delete_status_history
    `,

    sql`
      ALTER TABLE complaints_private.complaint_audit_events
      ENABLE TRIGGER prevent_update_delete_audit_events
    `,
  ]);

  const failures = results
    .filter(
      (result): result is PromiseRejectedResult =>
        result.status === "rejected",
    )
    .map((result) => result.reason);

  if (failures.length > 0) {
    throw new AggregateError(
      failures,
      "Failed to restore one or more append-only triggers",
    );
  }
}

async function verifyAppendOnlyTriggersEnabled(): Promise<void> {
  const rows = await sql<TriggerStateRow[]>`
    SELECT
      tgname,
      tgenabled
    FROM pg_trigger
    WHERE tgname IN (
      'prevent_update_delete_provider_responses',
      'prevent_update_delete_status_history',
      'prevent_update_delete_audit_events'
    )
    ORDER BY tgname
  `;

  expect(rows).toHaveLength(3);

  for (const row of rows) {
    expect(row.tgenabled).toBe("O");
  }
}

async function cleanupComplaintFixtures(): Promise<void> {
  const complaintIds =
    Array.from(fixtureRegistry.complaints);

  if (complaintIds.length === 0) {
    return;
  }

  let cleanupFailure: unknown;

  try {
    await sql`
      ALTER TABLE complaints_private.complaint_provider_responses
      DISABLE TRIGGER prevent_update_delete_provider_responses
    `;

    await sql`
      ALTER TABLE complaints_private.complaint_status_history
      DISABLE TRIGGER prevent_update_delete_status_history
    `;

    await sql`
      ALTER TABLE complaints_private.complaint_audit_events
      DISABLE TRIGGER prevent_update_delete_audit_events
    `;

    await sql`
      DELETE
      FROM complaints_private.complaint_provider_responses
      WHERE complaint_id IN ${sql(complaintIds)}
    `;

    await sql`
      DELETE
      FROM complaints_private.complaint_status_history
      WHERE complaint_id IN ${sql(complaintIds)}
    `;

    await sql`
      DELETE
      FROM complaints_private.complaint_audit_events
      WHERE complaint_id IN ${sql(complaintIds)}
    `;

    await sql`
      DELETE
      FROM complaints_private.complaint_outbox
      WHERE complaint_id IN ${sql(complaintIds)}
    `;

    await sql`
      DELETE
      FROM complaints_private.complaints
      WHERE id IN ${sql(complaintIds)}
    `;
  } catch (error) {
    cleanupFailure = error;
  }

  let triggerRestoreFailure: unknown;

  try {
    await restoreAppendOnlyTriggers();
  } catch (error) {
    triggerRestoreFailure = error;
  }

  if (cleanupFailure !== undefined || triggerRestoreFailure !== undefined) {
    const failures = [
      cleanupFailure,
      triggerRestoreFailure,
    ].filter(
      (error): error is NonNullable<typeof error> =>
        error !== undefined,
    );

    throw new AggregateError(
      failures,
      "B5C.2 complaint fixture cleanup failed",
    );
  }
}

async function cleanupAuthorizationFixtures(): Promise<void> {
  const operatorIds =
    Array.from(fixtureRegistry.operators);

  if (operatorIds.length === 0) {
    return;
  }

  await sql`
    DELETE
    FROM "authorization".operator_capabilities
    WHERE operator_id IN ${sql(operatorIds)}
  `;

  await sql`
    DELETE
    FROM "authorization".external_identity_bindings
    WHERE operator_id IN ${sql(operatorIds)}
  `;

  await sql`
    DELETE
    FROM "authorization".operators
    WHERE id IN ${sql(operatorIds)}
  `;
}

async function closeRuntimeDatabaseClients(): Promise<void> {
  const closeOperations: Promise<void>[] = [];

  if (runtimeGlobals.__buholexAuthorizationClient__) {
    closeOperations.push(
      runtimeGlobals.__buholexAuthorizationClient__.sql.end(),
    );
  }

  if (runtimeGlobals.__buholexComplaintsAdminClient__) {
    closeOperations.push(
      runtimeGlobals.__buholexComplaintsAdminClient__.sql.end(),
    );
  }

  if (closeOperations.length === 0) {
    return;
  }

  const results = await Promise.allSettled(
    closeOperations,
  );

  const failures = results
    .filter(
      (result): result is PromiseRejectedResult =>
        result.status === "rejected",
    )
    .map((result) => result.reason);

  if (failures.length > 0) {
    throw new AggregateError(
      failures,
      "Failed to close one or more runtime database clients",
    );
  }
}

describe(
  "STAGING PROTECTED ADMIN HTTP INTEGRATION",
  () => {
    beforeAll(async () => {
      fixtureRegistry.operators.add(
        fixtureOperatorId,
      );

      await sql`
        INSERT INTO "authorization".operators (
          id,
          status
        )
        VALUES (
          ${fixtureOperatorId},
          'active'
        )
      `;

      await sql`
        INSERT INTO "authorization".external_identity_bindings (
          operator_id,
          provider,
          external_subject_id
        )
        VALUES (
          ${fixtureOperatorId},
          'auth0',
          ${fixtureSubjectId}
        )
      `;

      await sql`
        INSERT INTO "authorization".operator_capabilities (
          operator_id,
          capability
        )
        VALUES (
          ${fixtureOperatorId},
          'complaints:respond'
        )
      `;

      await createComplaintFixture(
        fixtureComplaintId,
        "under_review",
      );
    }, 30_000);

    beforeEach(() => {
      auth0Mock.getSession.mockReset();

      authorizationMockState.simulatePersistenceFailure =
        false;
    });

    afterAll(async () => {
      const cleanupErrors: unknown[] = [];

      try {
        await cleanupComplaintFixtures();
      } catch (error) {
        cleanupErrors.push(error);
      }

      try {
        await cleanupAuthorizationFixtures();
      } catch (error) {
        cleanupErrors.push(error);
      }

      try {
        await verifyAppendOnlyTriggersEnabled();
      } catch (error) {
        cleanupErrors.push(error);
      }

      try {
        await closeRuntimeDatabaseClients();
      } catch (error) {
        cleanupErrors.push(error);
      }

      try {
        await sql.end();
      } catch (error) {
        cleanupErrors.push(error);
      }

      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          cleanupErrors,
          "B5C.2 teardown failed",
        );
      }
    }, 30_000);

    it(
      "HTTP 401 - UNAUTHENTICATED_STATUS",
      async () => {
        mockSession(false);

        const response = await postTest(
          buildRequest(validPayload),
        );

        expect(response.status).toBe(401);

        await expect(response.json()).resolves.toMatchObject({
          success: false,
        });
      },
    );

    it(
      "HTTP 403 - UNMAPPED_STATUS",
      async () => {
        mockSession(true, false);

        const response = await postTest(
          buildRequest(validPayload),
        );

        expect(response.status).toBe(403);

        await expect(response.json()).resolves.toEqual({
          success: false,
          error: {
            code: "forbidden",
          },
        });
      },
      30_000,
    );

    it(
      "HTTP 403 - SUSPENDED_STATUS",
      async () => {
        await sql`
          UPDATE "authorization".operators
          SET status = 'suspended'
          WHERE id = ${fixtureOperatorId}
        `;

        try {
          mockSession(true, true);

          const response = await postTest(
            buildRequest(validPayload),
          );

          expect(response.status).toBe(403);

          await expect(response.json()).resolves.toEqual({
            success: false,
            error: {
              code: "forbidden",
            },
          });
        } finally {
          await sql`
            UPDATE "authorization".operators
            SET status = 'active'
            WHERE id = ${fixtureOperatorId}
          `;
        }
      },
      30_000,
    );

    it(
      "HTTP 403 - CAPABILITY_MISSING_STATUS",
      async () => {
        await sql`
          DELETE
          FROM "authorization".operator_capabilities
          WHERE operator_id = ${fixtureOperatorId}
        `;

        try {
          mockSession(true, true);

          const response = await postTest(
            buildRequest(validPayload),
          );

          expect(response.status).toBe(403);

          await expect(response.json()).resolves.toEqual({
            success: false,
            error: {
              code: "forbidden",
            },
          });
        } finally {
          await sql`
            INSERT INTO "authorization".operator_capabilities (
              operator_id,
              capability
            )
            VALUES (
              ${fixtureOperatorId},
              'complaints:respond'
            )
            ON CONFLICT DO NOTHING
          `;
        }
      },
      30_000,
    );

    it(
      "HTTP 503 - AUTH_503_STATUS",
      async () => {
        mockSession(true, true);

        authorizationMockState.simulatePersistenceFailure =
          true;

        try {
          const response = await postTest(
            buildRequest(validPayload),
          );

          expect(response.status).toBe(503);

          await expect(response.json()).resolves.toMatchObject({
            success: false,
            error: {
              code: "service_unavailable",
            },
          });
        } finally {
          authorizationMockState.simulatePersistenceFailure =
            false;
        }
      },
    );

    it(
      "Transport Security - missing Origin 403",
      async () => {
        mockSession(true, true);

        const request = new Request(
          `http://localhost/api/admin/complaints/${fixtureComplaintId}/responses`,
          {
            method: "POST",

            headers: {
              Host: "localhost",
              "Content-Type": "application/json",
            },

            body: JSON.stringify(validPayload),
          },
        );

        const response = await postTest(request);

        expect(response.status).toBe(403);
      },
    );

    it(
      "Transport Security - wrong Origin 403",
      async () => {
        mockSession(true, true);

        const response = await postTest(
          buildRequest(validPayload, {
            headers: {
              Origin: "http://evil.example",
            },
          }),
        );

        expect(response.status).toBe(403);
      },
    );

    it(
      "Transport Security - invalid Content-Type 415",
      async () => {
        mockSession(true, true);

        const response = await postTest(
          buildRequest(validPayload, {
            headers: {
              "Content-Type": "text/plain",
            },
          }),
        );

        expect(response.status).toBe(415);
      },
    );

    it(
      "Transport Security - payload over 65536 413",
      async () => {
        mockSession(true, true);

        const oversizedPayload = {
          ...validPayload,
          responseText: "a".repeat(70_000),
        };

        const response = await postTest(
          buildRequest(oversizedPayload, {
            headers: {
              "Content-Length": "75000",
            },
          }),
        );

        expect(response.status).toBe(413);
      },
    );

    it(
      "Transport Security - malformed JSON 400",
      async () => {
        mockSession(true, true);

        const response = await postTest(
          buildRequest("{ malformed: json"),
        );

        expect(response.status).toBe(400);
      },
      30_000,
    );

    it(
      "Transport Security - unknown property 400",
      async () => {
        mockSession(true, true);

        const response = await postTest(
          buildRequest({
            ...validPayload,
            unknownProp: 123,
          }),
        );

        expect(response.status).toBe(400);
      },
      30_000,
    );

    it(
      "Path mappings - invalid complaintId 400",
      async () => {
        mockSession(true, true);

        const invalidComplaintId = "bad!";

        const response = await postTest(
          buildRequest(validPayload, {
            complaintId: invalidComplaintId,
          }),
          invalidComplaintId,
        );

        expect(response.status).toBe(400);
      },
    );

    it(
      "HTTP 404 - NOT_FOUND_STATUS",
      async () => {
        mockSession(true, true);

        const unknownComplaintId = randomUUID();

        const response = await postTest(
          buildRequest(validPayload, {
            complaintId: unknownComplaintId,
          }),
          unknownComplaintId,
        );

        expect(response.status).toBe(404);
      },
      30_000,
    );

    it(
      "Domain Validation - DOMAIN_VALIDATION_STATUS 422",
      async () => {
        mockSession(true, true);

        const missingTextPayload = {
          expectedCurrentStatus:
            validPayload.expectedCurrentStatus,
          responseChannel:
            validPayload.responseChannel,
          responderName:
            validPayload.responderName,
          responderRole:
            validPayload.responderRole,
          actionsTaken:
            validPayload.actionsTaken,
        } satisfies Omit<
          ProviderResponseHttpPayload,
          "responseText"
        >;

        const response = await postTest(
          buildRequest(missingTextPayload),
        );

        expect(response.status).toBe(422);
      },
      30_000,
    );

    it(
      "HTTP SUCCESS TEST - 201",
      async () => {
        mockSession(true, true);

        const response = await postTest(
          buildRequest(validPayload),
        );

        expect(response.status).toBe(201);

        await expect(response.json()).resolves.toEqual({
          success: true,
        });

        const persistedResponses = await sql`
          SELECT
            response_text
          FROM complaints_private.complaint_provider_responses
          WHERE complaint_id = ${fixtureComplaintId}
        `;

        expect(persistedResponses).toHaveLength(1);

        expect(
          persistedResponses[0]?.response_text,
        ).toBe(validPayload.responseText);
      },
      30_000,
    );

    it(
      "HTTP 409 - STALE_STATUS",
      async () => {
        mockSession(true, true);

        const staleComplaintId = randomUUID();

        await createComplaintFixture(
          staleComplaintId,
          "answered",
        );

        const response = await postTest(
          buildRequest(validPayload, {
            complaintId: staleComplaintId,
          }),
          staleComplaintId,
        );

        expect(response.status).toBe(409);
      },
      30_000,
    );

    it(
      "Verify Migration State",
      async () => {
        const rows = await sql`
          SELECT count(*)::int AS count
          FROM drizzle.__drizzle_migrations
          WHERE id > 0
        `;

        expect(rows[0]?.count).toBeGreaterThan(0);
      },
    );

    it(
      "Concurrency Test - Only one response succeeds",
      async () => {
        mockSession(true, true);

        const concurrentComplaintId = randomUUID();

        await createComplaintFixture(
          concurrentComplaintId,
          "under_review",
        );

        const requestOne = buildRequest(
          {
            ...validPayload,
            responseText:
              "Synthetic concurrent response one",
          },
          {
            complaintId: concurrentComplaintId,
          },
        );

        const requestTwo = buildRequest(
          {
            ...validPayload,
            responseText:
              "Synthetic concurrent response two",
          },
          {
            complaintId: concurrentComplaintId,
          },
        );

        const results = await Promise.allSettled([
          POST(
            requestOne,
            createRouteContext(
              concurrentComplaintId,
            ),
          ),

          POST(
            requestTwo,
            createRouteContext(
              concurrentComplaintId,
            ),
          ),
        ]);

        let successCount = 0;
        let conflictCount = 0;
        let otherFailureCount = 0;

        for (const result of results) {
          if (result.status === "rejected") {
            otherFailureCount += 1;
            continue;
          }

          if (result.value.status === 201) {
            successCount += 1;
            continue;
          }

          if (result.value.status === 409) {
            conflictCount += 1;
            continue;
          }

          otherFailureCount += 1;
        }

        expect(successCount).toBe(1);
        expect(conflictCount).toBe(1);
        expect(otherFailureCount).toBe(0);

        const persistedResponses = await sql`
          SELECT
            id,
            version
          FROM complaints_private.complaint_provider_responses
          WHERE complaint_id = ${concurrentComplaintId}
        `;

        expect(persistedResponses).toHaveLength(1);
        expect(persistedResponses[0]?.version).toBe(1);

        const complaintRows = await sql`
          SELECT
            status
          FROM complaints_private.complaints
          WHERE id = ${concurrentComplaintId}
        `;

        expect(complaintRows).toHaveLength(1);

        expect(
          complaintRows[0]?.status,
        ).toBe("answered");

        const outboxRows = await sql`
          SELECT
            status
          FROM complaints_private.complaint_outbox
          WHERE complaint_id = ${concurrentComplaintId}
        `;

        expect(outboxRows).toHaveLength(1);

        expect(
          outboxRows[0]?.status,
        ).toBe("pending");

        const jsonbRows = await sql`
          SELECT
            jsonb_typeof(payload) AS payload_type
          FROM complaints_private.complaint_outbox
          WHERE complaint_id = ${concurrentComplaintId}
        `;

        expect(jsonbRows).toHaveLength(1);

        expect(
          jsonbRows[0]?.payload_type,
        ).toBe("object");

        for (const result of results) {
          if (result.status !== "fulfilled") {
            continue;
          }

          expect(result.value.status).not.toBe(500);
          expect(result.value.status).not.toBe(503);

          const body = await result.value.clone().text();

          expect(body).not.toContain("23505");
          expect(body).not.toContain("SQLSTATE");
          expect(body).not.toContain("unique violation");
        }
      },
      30_000,
    );
  },
);
