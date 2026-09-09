import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { Auth0ManagementApiIdentityStatusClient, type Auth0ManagementCacheStore } from "../lib/auth0-management-api-identity-status-client";
import type { Auth0ManagementApiRuntimeConfig } from "../types/auth0-management-api-configuration";

const config: Auth0ManagementApiRuntimeConfig = {
  domain: "test.auth0.com",
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  audience: "https://test.auth0.com/api/v2/",
  scope: "read:users",
};

const configB: Auth0ManagementApiRuntimeConfig = {
  domain: "test.auth0.com",
  clientId: "other-client-id",
  clientSecret: "other-client-secret",
  audience: "https://test.auth0.com/api/v2/",
  scope: "read:users",
};

describe("Auth0ManagementApiIdentityStatusClient", () => {
  let fetchMock: Mock<typeof globalThis.fetch>;
  let nowMock: Mock<() => number>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let cacheStore: Auth0ManagementCacheStore;
  let client: Auth0ManagementApiIdentityStatusClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    nowMock = vi.fn(() => 1000000); // stable time
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    cacheStore = {
      tokens: new Map(),
      tokenPromises: new Map(),
      statuses: new Map(),
      statusPromises: new Map(),
    };
    client = new Auth0ManagementApiIdentityStatusClient(config, {
      fetch: fetchMock,
      now: nowMock,
      cacheStore,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.useRealTimers();
  });

  const validTokenResponse = () => ({
    ok: true,
    status: 200,
    json: async () => ({
      access_token: "test_token",
      expires_in: 3600,
      token_type: "Bearer",
    }),
  }) as Response;

  const validUserResponse = (blocked?: boolean) => ({
    ok: true,
    status: 200,
    json: async () => ({
      email: "test@example.com",
      ...(blocked !== undefined ? { blocked } : {}),
    }),
  }) as Response;

  it("A. Two sequential client instances with identical Auth0 config and shared cache state reuse one valid M2M token", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce(validUserResponse(false));
    fetchMock.mockResolvedValueOnce(validUserResponse(false));

    const client1 = new Auth0ManagementApiIdentityStatusClient(config, { fetch: fetchMock, now: nowMock, cacheStore });
    const client2 = new Auth0ManagementApiIdentityStatusClient(config, { fetch: fetchMock, now: nowMock, cacheStore });

    await client1.getIdentityStatus("sub|123");
    await client2.getIdentityStatus("sub|456");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const urls = fetchMock.mock.calls.map(c => c[0]);
    expect(urls.filter(u => typeof u === "string" && u.includes("/oauth/token")).length).toBe(1);
  });

  it("B. Two sequential identity checks for the same active subject inside 15 seconds perform one Management identity lookup", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce(validUserResponse(false));

    await client.getIdentityStatus("sub|123");
    nowMock.mockReturnValue(1000000 + 14000); // advance 14s
    await client.getIdentityStatus("sub|123");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("C. After 15 seconds, active subject is looked up again", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce(validUserResponse(false));
    fetchMock.mockResolvedValueOnce(validUserResponse(false));

    await client.getIdentityStatus("sub|123");
    nowMock.mockReturnValue(1000000 + 15001); // advance >15s
    await client.getIdentityStatus("sub|123");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const urls = fetchMock.mock.calls.map(c => c[0]);
    expect(urls.filter(u => typeof u === "string" && u.includes("/api/v2/users/sub%7C123")).length).toBe(2);
  });

  it("D. Suspended status is reused inside 30 seconds and revalidated after expiry", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce(validUserResponse(true));
    fetchMock.mockResolvedValueOnce(validUserResponse(true));

    await client.getIdentityStatus("sub|sus");
    nowMock.mockReturnValue(1000000 + 29000);
    await client.getIdentityStatus("sub|sus"); // reused
    expect(fetchMock).toHaveBeenCalledTimes(2);

    nowMock.mockReturnValue(1000000 + 30001);
    await client.getIdentityStatus("sub|sus"); // revalidated
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("E. not_found is reused inside 30 seconds and revalidated after expiry", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 } as Response);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 } as Response);

    await client.getIdentityStatus("sub|nf");
    nowMock.mockReturnValue(1000000 + 29000);
    await client.getIdentityStatus("sub|nf"); // reused
    expect(fetchMock).toHaveBeenCalledTimes(2);

    nowMock.mockReturnValue(1000000 + 30001);
    await client.getIdentityStatus("sub|nf"); // revalidated
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("F. unavailable is never cached", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

    await client.getIdentityStatus("sub|123");
    const key = JSON.stringify([JSON.stringify([config.domain, config.clientId, config.audience]), "auth0", "sub|123"]);
    expect(cacheStore.statuses.has(key)).toBe(false);

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    await client.getIdentityStatus("sub|123");
    expect(cacheStore.statuses.has(key)).toBe(false);

    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 token, 2 lookups (token reused)
    const urls = fetchMock.mock.calls.map(c => c[0]);
    expect(urls.filter(u => typeof u === "string" && u.includes("/oauth/token")).length).toBe(1);
  });

  it("G. HTTP 429 is never cached", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429 } as Response);

    await client.getIdentityStatus("sub|123");
    const key = JSON.stringify([JSON.stringify([config.domain, config.clientId, config.audience]), "auth0", "sub|123"]);
    expect(cacheStore.statuses.has(key)).toBe(false);

    fetchMock.mockResolvedValueOnce({ ok: false, status: 429 } as Response);
    await client.getIdentityStatus("sub|123");
    expect(cacheStore.statuses.has(key)).toBe(false);

    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 token, 2 lookups (token reused)
    const urls = fetchMock.mock.calls.map(c => c[0]);
    expect(urls.filter(u => typeof u === "string" && u.includes("/oauth/token")).length).toBe(1);
  });

  it("H. network failure is never cached", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockRejectedValueOnce(new Error("network"));

    await client.getIdentityStatus("sub|123");
    const key = JSON.stringify([JSON.stringify([config.domain, config.clientId, config.audience]), "auth0", "sub|123"]);
    expect(cacheStore.statuses.has(key)).toBe(false);

    fetchMock.mockRejectedValueOnce(new Error("network"));
    await client.getIdentityStatus("sub|123");
    expect(cacheStore.statuses.has(key)).toBe(false);

    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 token, 2 lookups (token reused)
    const urls = fetchMock.mock.calls.map(c => c[0]);
    expect(urls.filter(u => typeof u === "string" && u.includes("/oauth/token")).length).toBe(1);
  });

  it("I. Concurrent requests for same config+subject share one identity lookup", async () => {
    let resolveUser: (r: Response) => void;
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockReturnValueOnce(new Promise((res) => { resolveUser = res; }));

    const p1 = client.getIdentityStatus("sub|123");
    const p2 = client.getIdentityStatus("sub|123");

    resolveUser!(validUserResponse(false));
    await Promise.all([p1, p2]);

    expect(fetchMock).toHaveBeenCalledTimes(2); // 1 token, 1 lookup
  });

  it("J. Failed identity single-flight promise is removed and a later call can retry", async () => {
    let rejectUser: (r: unknown) => void;
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockReturnValueOnce(new Promise((_, rej) => { rejectUser = rej; }));
    fetchMock.mockResolvedValueOnce(validUserResponse(false));

    const p1 = client.getIdentityStatus("sub|123");
    rejectUser!(new Error("fail"));
    await p1;

    const p2 = client.getIdentityStatus("sub|123");
    await p2;

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("HTTP_401_CONFIG_SCOPED_TEST: 401 lookup clears only the applicable configuration token cache", async () => {
    const client2 = new Auth0ManagementApiIdentityStatusClient(configB, {
      fetch: fetchMock,
      now: nowMock,
      cacheStore,
    });

    // Populate token for config A
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 } as Response);
    await client.getIdentityStatus("sub|123");

    // Populate token for config B
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce(validUserResponse(false));
    await client2.getIdentityStatus("sub|123");

    // Do another call for config A - should fetch token again
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce(validUserResponse(false));
    await client.getIdentityStatus("sub|123");

    // Do another call for config B - should reuse token
    fetchMock.mockResolvedValueOnce(validUserResponse(false));
    await client2.getIdentityStatus("sub|456");

    const urls = fetchMock.mock.calls.map(c => c[0]);
    // Config A token fetched twice, Config B token fetched once -> total 3 token fetches
    expect(urls.filter(u => typeof u === "string" && u.includes("/oauth/token")).length).toBe(3);
  });

  it("HTTP_403_CONFIG_SCOPED_TEST: 403 lookup clears only the applicable configuration token cache", async () => {
    const client2 = new Auth0ManagementApiIdentityStatusClient(configB, {
      fetch: fetchMock,
      now: nowMock,
      cacheStore,
    });

    // Populate token for config A
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 } as Response);
    await client.getIdentityStatus("sub|123");

    // Populate token for config B
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce(validUserResponse(false));
    await client2.getIdentityStatus("sub|123");

    // Do another call for config A - should fetch token again
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce(validUserResponse(false));
    await client.getIdentityStatus("sub|123");

    // Do another call for config B - should reuse token
    fetchMock.mockResolvedValueOnce(validUserResponse(false));
    await client2.getIdentityStatus("sub|456");

    const urls = fetchMock.mock.calls.map(c => c[0]);
    expect(urls.filter(u => typeof u === "string" && u.includes("/oauth/token")).length).toBe(3);
  });

  it("M. Different Auth0 configuration identities do not share token cache", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce(validUserResponse(false));
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce(validUserResponse(false));

    const client2 = new Auth0ManagementApiIdentityStatusClient(configB, { fetch: fetchMock, now: nowMock, cacheStore });
    await client.getIdentityStatus("sub|123");
    await client2.getIdentityStatus("sub|123");

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const urls = fetchMock.mock.calls.map(c => c[0]);
    expect(urls.filter(u => typeof u === "string" && u.includes("/oauth/token")).length).toBe(2);
  });

  it("N. Different Auth0 configuration identities do not share identity status cache", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce(validUserResponse(false));
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce(validUserResponse(false));

    const client2 = new Auth0ManagementApiIdentityStatusClient(configB, { fetch: fetchMock, now: nowMock, cacheStore });
    await client.getIdentityStatus("sub|123");
    await client2.getIdentityStatus("sub|123");

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const urls = fetchMock.mock.calls.map(c => c[0]);
    expect(urls.filter(u => typeof u === "string" && u.includes("/api/v2/users")).length).toBe(2);
  });

  it("O. Expired entries are pruned", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse());
    fetchMock.mockResolvedValueOnce(validUserResponse(false)); // sub|1 active

    await client.getIdentityStatus("sub|1");

    // active status is cached for ACTIVE_TTL_MS (15000)
    nowMock.mockReturnValue(1000000 + 20000);

    fetchMock.mockResolvedValueOnce(validUserResponse(false)); // sub|2 active
    await client.getIdentityStatus("sub|2");

    expect(cacheStore.statuses.size).toBe(1);

    const keyA = JSON.stringify([JSON.stringify([config.domain, config.clientId, config.audience]), "auth0", "sub|1"]);
    const keyB = JSON.stringify([JSON.stringify([config.domain, config.clientId, config.audience]), "auth0", "sub|2"]);

    expect(cacheStore.statuses.has(keyA)).toBe(false);
    expect(cacheStore.statuses.has(keyB)).toBe(true);
  });

it("P. At capacity, oldest insertion-order entry is evicted", async () => {
  fetchMock.mockImplementation(async (url: unknown) => {
    if (typeof url === 'string' && url.includes("/oauth/token")) return validTokenResponse();
    return validUserResponse(false);
  });

  for (let i = 0; i < 1000; i++) {
    await client.getIdentityStatus(`sub|${i}`);
  }
  expect(cacheStore.statuses.size).toBe(1000);

  const tokenKey = JSON.stringify([config.domain, config.clientId, config.audience]);
  const key0 = JSON.stringify([tokenKey, "auth0", "sub|0"]);
  expect(cacheStore.statuses.has(key0)).toBe(true);

  // Insert 1001 without expiring
  await client.getIdentityStatus("sub|new");
  expect(cacheStore.statuses.size).toBe(1000);
  expect(cacheStore.statuses.has(key0)).toBe(false); // oldest evicted
});

it("Q. Identity cache size never exceeds 1000", async () => {
  fetchMock.mockImplementation(async (url: unknown) => {
    if (typeof url === 'string' && url.includes("/oauth/token")) return validTokenResponse();
    return validUserResponse(false);
  });

  for (let i = 0; i < 1010; i++) {
    await client.getIdentityStatus(`sub|${i}`);
    expect(cacheStore.statuses.size).toBeLessThanOrEqual(1000);
  }
});

it("R. Fresh injected cache state starts empty", async () => {
  fetchMock.mockImplementation(async (url: unknown) => {
    if (typeof url === 'string' && url.includes("/oauth/token")) return validTokenResponse();
    return validUserResponse(false);
  });

  await client.getIdentityStatus("sub|123");
  expect(cacheStore.statuses.size).toBe(1);

  const freshStore: Auth0ManagementCacheStore = {
    tokens: new Map(),
    tokenPromises: new Map(),
    statuses: new Map(),
    statusPromises: new Map(),
  };
  const freshClient = new Auth0ManagementApiIdentityStatusClient(config, { fetch: fetchMock, now: nowMock, cacheStore: freshStore });
  await freshClient.getIdentityStatus("sub|123");

  const urls = fetchMock.mock.calls.map(c => c[0]);
  expect(urls.filter(u => typeof u === "string" && u.includes("/oauth/token")).length).toBe(2);
});

it("TOKEN_SAFETY_MARGIN_BOUNDARY_TEST: short-lived token with expires_in <= 60 => no stale token reuse occurs", async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      access_token: "short_token",
      expires_in: 59, // Under the 60s margin
    }),
  } as Response);
  fetchMock.mockResolvedValueOnce(validUserResponse(false));

  // First lookup succeeds and caches token
  expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "active" });

  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      access_token: "new_token",
      expires_in: 3600,
    }),
  } as Response);
  fetchMock.mockResolvedValueOnce(validUserResponse(false));

  // Second lookup should fetch a new token since the first one is within the safety margin
  expect(await client.getIdentityStatus("sub|456")).toEqual({ status: "active" });

  expect(fetchMock).toHaveBeenCalledTimes(4);
  const tokenCall1 = fetchMock.mock.calls[0]!;
  const tokenCall2 = fetchMock.mock.calls[2]!;
  expect(tokenCall1[0]).toContain("/oauth/token");
  expect(tokenCall2[0]).toContain("/oauth/token");
});

it("T. Existing token single-flight behavior remains correct across client instances", async () => {
  let resolveToken: (v: Response) => void;
  fetchMock.mockReturnValueOnce(new Promise<Response>((res) => { resolveToken = res; }));
  fetchMock.mockResolvedValue(validUserResponse(false));

  const client2 = new Auth0ManagementApiIdentityStatusClient(config, { fetch: fetchMock, now: nowMock, cacheStore });

  const p1 = client.getIdentityStatus("sub|123");
  const p2 = client2.getIdentityStatus("sub|456");

  resolveToken!(validTokenResponse());

  await Promise.all([p1, p2]);

  const urls = fetchMock.mock.calls.map(c => c[0]);
  expect(urls.filter(u => typeof u === "string" && u.includes("/oauth/token")).length).toBe(1);
});

it("U. structural identity key ensures same subject + different config are isolated", async () => {
  fetchMock.mockResolvedValueOnce(validTokenResponse());
  fetchMock.mockResolvedValueOnce(validUserResponse(false));
  fetchMock.mockResolvedValueOnce(validTokenResponse());
  fetchMock.mockResolvedValueOnce(validUserResponse(false));

  const client2 = new Auth0ManagementApiIdentityStatusClient(configB, { fetch: fetchMock, now: nowMock, cacheStore });
  await client.getIdentityStatus("sub|123");
  await client2.getIdentityStatus("sub|123");

  expect(cacheStore.statuses.size).toBe(2);
  const tokenKeyA = JSON.stringify([config.domain, config.clientId, config.audience]);
  const tokenKeyB = JSON.stringify([configB.domain, configB.clientId, configB.audience]);
  expect(cacheStore.statuses.has(JSON.stringify([tokenKeyA, "auth0", "sub|123"]))).toBe(true);
  expect(cacheStore.statuses.has(JSON.stringify([tokenKeyB, "auth0", "sub|123"]))).toBe(true);
});

it("V. structural identity key properly isolates provider subjects and punctuation", async () => {
  fetchMock.mockImplementation(async (url: unknown) => {
    if (typeof url === 'string' && url.includes("/oauth/token")) return validTokenResponse();
    return validUserResponse(false);
  });

  await client.getIdentityStatus("google-oauth2|123");
  await client.getIdentityStatus('google-oauth2","123');
  await client.getIdentityStatus("auth0:sub|123");

  expect(cacheStore.statuses.size).toBe(3);
  const tokenKey = JSON.stringify([config.domain, config.clientId, config.audience]);
  expect(cacheStore.statuses.has(JSON.stringify([tokenKey, "auth0", "google-oauth2|123"]))).toBe(true);
  expect(cacheStore.statuses.has(JSON.stringify([tokenKey, "auth0", 'google-oauth2","123']))).toBe(true);
  expect(cacheStore.statuses.has(JSON.stringify([tokenKey, "auth0", "auth0:sub|123"]))).toBe(true);
});

it("invalid subject => unavailable with zero fetch calls", async () => {
  expect(await client.getIdentityStatus("")).toEqual({ status: "unavailable" });
  expect(await client.getIdentityStatus("   ")).toEqual({ status: "unavailable" });
  expect(fetchMock).not.toHaveBeenCalled();
});
it("22: 200 malformed blocked type => unavailable", async () => {
  fetchMock.mockResolvedValueOnce(validTokenResponse());
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ blocked: "yes" }),
  } as Response);
  expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "unavailable" });
  expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
  expect(consoleErrorSpy.mock.calls[0][0]).toBe("jurisprudence_auth_management_lookup_invalid_response");
  expect(consoleErrorSpy.mock.calls[1][0]).toBe("jurisprudence_auth_management_lookup_unavailable");
  expect(consoleErrorSpy.mock.calls[0].length).toBe(1);
  expect(consoleErrorSpy).not.toHaveBeenCalledWith("jurisprudence_auth_management_token_unavailable");
});

it("other non-200 (400) => unavailable", async () => {
  fetchMock.mockResolvedValueOnce(validTokenResponse());
  fetchMock.mockResolvedValueOnce({ ok: false, status: 400 } as Response);
  expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "unavailable" });
  expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
  expect(consoleErrorSpy.mock.calls[0][0]).toBe("jurisprudence_auth_management_lookup_other_non_200");
  expect(consoleErrorSpy.mock.calls[1][0]).toBe("jurisprudence_auth_management_lookup_unavailable");
});

it("29: timeout => unavailable", async () => {
  fetchMock.mockResolvedValueOnce(validTokenResponse());
  vi.useFakeTimers();
  fetchMock.mockImplementationOnce(async (url, init) => {
    return new Promise((resolve, reject) => {
      init!.signal!.addEventListener("abort", () => reject(new Error("AbortError")));
    });
  });
  const promise = client.getIdentityStatus("sub|123");
  await vi.advanceTimersByTimeAsync(3000);
  expect(await promise).toEqual({ status: "unavailable" });
  vi.useRealTimers();
});

it("token HTTP 200 + [] => unavailable", async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ([]),
  } as Response);
  expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "unavailable" });
});

it("token HTTP 200 + null => unavailable", async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => (null),
  } as Response);
  expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "unavailable" });
});

it("token expires_in extremely large => non-finite derived expiry => unavailable", async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      access_token: "test_token",
      expires_in: Number.MAX_VALUE,
    }),
  } as Response);
  expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "unavailable" });
});

it("user HTTP 200 + [] => unavailable", async () => {
  fetchMock.mockResolvedValueOnce(validTokenResponse() as Response);
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ([]),
  } as Response);
  expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "unavailable" });
  expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
  expect(consoleErrorSpy.mock.calls[0][0]).toBe("jurisprudence_auth_management_lookup_invalid_response");
  expect(consoleErrorSpy.mock.calls[1][0]).toBe("jurisprudence_auth_management_lookup_unavailable");
});

it("user HTTP 200 + null => unavailable", async () => {
  fetchMock.mockResolvedValueOnce(validTokenResponse() as Response);
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => (null),
  } as Response);
  expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "unavailable" });
  expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
  expect(consoleErrorSpy.mock.calls[0][0]).toBe("jurisprudence_auth_management_lookup_invalid_response");
  expect(consoleErrorSpy.mock.calls[1][0]).toBe("jurisprudence_auth_management_lookup_unavailable");
});

it("user HTTP 200 + json throws => unavailable", async () => {
  fetchMock.mockResolvedValueOnce(validTokenResponse() as Response);
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => { throw new Error("JSON Parse Error"); },
  } as unknown as Response);
  expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "unavailable" });
  expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
  expect(consoleErrorSpy.mock.calls[0][0]).toBe("jurisprudence_auth_management_lookup_invalid_response");
  expect(consoleErrorSpy.mock.calls[1][0]).toBe("jurisprudence_auth_management_lookup_unavailable");
});

it("7: malformed token payload => unavailable", async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ bad: "data" }),
  } as Response);
  const result = await client.getIdentityStatus("sub|123");
  expect(result).toEqual({ status: "unavailable" });
});

it("8: token HTTP error => unavailable", async () => {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    status: 401,
    json: async () => ({}),
  } as Response);
  const result = await client.getIdentityStatus("sub|123");
  expect(result).toEqual({ status: "unavailable" });
});

it("9: token network error => unavailable", async () => {
  fetchMock.mockRejectedValueOnce(new Error("Network failed with secret XYZ"));
  const result = await client.getIdentityStatus("sub|123");
  expect(result).toEqual({ status: "unavailable" });
  expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  expect(consoleErrorSpy).toHaveBeenCalledWith("jurisprudence_auth_management_token_unavailable");
  expect(consoleErrorSpy.mock.calls[0].length).toBe(1);
  expect(consoleErrorSpy).not.toHaveBeenCalledWith("jurisprudence_auth_management_lookup_unavailable");
});

it("10: token timeout => unavailable", async () => {
  vi.useFakeTimers();
  fetchMock.mockImplementationOnce(async (url, init) => {
    return new Promise((resolve, reject) => {
      init!.signal!.addEventListener("abort", () => reject(new Error("AbortError")));
    });
  });
  const promise = client.getIdentityStatus("sub|123");
  vi.advanceTimersByTime(3000);
  const result = await promise;
  expect(result).toEqual({ status: "unavailable" });
  vi.useRealTimers();
});


it("SUCCESS_REQUEST_CONTRACT_TEST: fetches token correctly and then user correctly", async () => {
  fetchMock.mockResolvedValueOnce(validTokenResponse());
  fetchMock.mockResolvedValueOnce(validUserResponse(false));

  const result = await client.getIdentityStatus("sub|123");
  expect(result).toEqual({ status: "active" });
  expect(fetchMock).toHaveBeenCalledTimes(2);

  const tokenCall = fetchMock.mock.calls[0]!;
  const userCall = fetchMock.mock.calls[1]!;

  const tokenInit = tokenCall[1] as RequestInit;
  const userInit = userCall[1] as RequestInit;

  expect(tokenCall[0]).toContain("/oauth/token");
  expect(String(tokenInit.body)).toContain('"client_id":"test-client-id"');
  expect(userCall[0]).toBe("https://test.auth0.com/api/v2/users/sub%7C123");
  expect(new Headers(userInit.headers).get("Authorization")).toBe("Bearer test_token");
});

it("FAILED_TOKEN_SINGLE_FLIGHT_CLEANUP_TEST: failed single flight token request clears in-flight state", async () => {
  let rejectToken: ((reason?: unknown) => void) | undefined;
  const tokenPromise = new Promise<Response>((_, rej) => {
    rejectToken = rej;
  });
  fetchMock.mockReturnValueOnce(tokenPromise);

  const p1 = client.getIdentityStatus("sub|123");
  rejectToken!(new Error("Network fail"));

  expect(await p1).toEqual({ status: "unavailable" });

  fetchMock.mockResolvedValueOnce(validTokenResponse());
  fetchMock.mockResolvedValueOnce(validUserResponse(false));

  const p2 = client.getIdentityStatus("sub|456");
  expect(await p2).toEqual({ status: "active" });

  const urls = fetchMock.mock.calls.map(c => c[0]);
  expect(urls.filter(u => typeof u === "string" && u.includes("/oauth/token")).length).toBe(2);
});

it("BLOCKED_FALSE_ACTIVE_TEST: 200 blocked=false => active", async () => {
  fetchMock.mockResolvedValueOnce(validTokenResponse());
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ blocked: false }),
  } as Response);
  expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "active" });
});

it("BLOCKED_TRUE_SUSPENDED_TEST: 200 blocked=true => suspended", async () => {
  fetchMock.mockResolvedValueOnce(validTokenResponse());
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ blocked: true }),
  } as Response);
  expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "suspended" });
});

it("BLOCKED_ABSENT_ACTIVE_TEST: 200 blocked absent => active", async () => {
  fetchMock.mockResolvedValueOnce(validTokenResponse());
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ other_field: "yes" }),
  } as Response);
  expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "active" });
});
});
