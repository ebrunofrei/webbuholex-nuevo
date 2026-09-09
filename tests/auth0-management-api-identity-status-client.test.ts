import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { Auth0ManagementApiIdentityStatusClient } from "../lib/auth0-management-api-identity-status-client";
import type { Auth0ManagementApiRuntimeConfig } from "../types/auth0-management-api-configuration";
import type { ExternalIdentityStatus } from "../types/authentication-configuration";

const config: Auth0ManagementApiRuntimeConfig = {
  domain: "test.auth0.com",
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  audience: "https://test.auth0.com/api/v2/",
  scope: "read:users",
};

describe("Auth0ManagementApiIdentityStatusClient", () => {
  let fetchMock: Mock<typeof globalThis.fetch>;
  let nowMock: Mock<() => number>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let client: Auth0ManagementApiIdentityStatusClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    nowMock = vi.fn(() => 1000000); // stable time
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    client = new Auth0ManagementApiIdentityStatusClient(config, {
      fetch: fetchMock,
      now: nowMock,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  const validTokenResponse = {
    ok: true,
    status: 200,
    json: async () => ({
      access_token: "test_token",
      expires_in: 3600,
      token_type: "Bearer",
    }),
  } as Response;

  const validUserResponse = (blocked?: boolean) => ({
    ok: true,
    status: 200,
    json: async () => ({
      email: "test@example.com",
      ...(blocked !== undefined ? { blocked } : {}),
    }),
  }) as Response;

  const setupHappyPath = () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse);
    fetchMock.mockResolvedValueOnce(validUserResponse(false));
  };

  it("1-5, 17-18: fetches token correctly and then user correctly", async () => {
    setupHappyPath();
    const result = await client.getIdentityStatus("sub|123");

    expect(result).toEqual({ status: "active" });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const tokenCall = fetchMock.mock.calls[0]!;
    expect(tokenCall[0]).toBe("https://test.auth0.com/oauth/token");
    const tokenInit = tokenCall[1] as RequestInit;
    expect(tokenInit.method).toBe("POST");
    expect(JSON.parse(tokenInit.body as string)).toEqual({
      grant_type: "client_credentials",
      client_id: "test-client-id",
      client_secret: "test-client-secret",
      audience: "https://test.auth0.com/api/v2/",
    });

    const userCall = fetchMock.mock.calls[1]!;
    expect(userCall[0]).toBe("https://test.auth0.com/api/v2/users/sub%7C123");
    const userInit = userCall[1] as RequestInit;
    expect(userInit.method).toBe("GET");
    expect(userInit.headers).toEqual({ Authorization: "Bearer test_token" });
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

  it("11-12: second lookup reuses unexpired M2M token but fetches user status", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse);
    fetchMock.mockResolvedValueOnce(validUserResponse(false));
    fetchMock.mockResolvedValueOnce(validUserResponse(false));

    await client.getIdentityStatus("sub|123");
    await client.getIdentityStatus("sub|456");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]![0]).toContain("/oauth/token");
    expect(fetchMock.mock.calls[1]![0]).toContain("/api/v2/users/sub%7C123");
    expect(fetchMock.mock.calls[2]![0]).toContain("/api/v2/users/sub%7C456");
  });

  it("13-14: expired token causes new token request (safety margin)", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse);
    fetchMock.mockResolvedValueOnce(validUserResponse(false));
    await client.getIdentityStatus("sub|123");

    // Token expires in 3600s. Safety margin is 60s.
    // Advance time by 3540s + 1ms (crosses safety boundary)
    nowMock.mockReturnValueOnce(1000000 + 3540001);

    fetchMock.mockResolvedValueOnce(validTokenResponse);
    fetchMock.mockResolvedValueOnce(validUserResponse(false));
    await client.getIdentityStatus("sub|123");

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[2]![0]).toContain("/oauth/token");
  });

  it("15-16: 401 lookup invalidates cached token for next call, no immediate retry", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 } as Response);
    fetchMock.mockResolvedValueOnce(validTokenResponse);
    fetchMock.mockResolvedValueOnce(validUserResponse(false));

    const result1 = await client.getIdentityStatus("sub|123");
    expect(result1).toEqual({ status: "unavailable" });
    // Token + User = 2 calls
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const result2 = await client.getIdentityStatus("sub|123");
    expect(result2).toEqual({ status: "active" });
    // Token (refetched) + User = 4 calls total
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("concurrency: single flight token request", async () => {
    let resolveToken: (v: Response) => void;
    const tokenPromise = new Promise<Response>((res) => { resolveToken = res; });
    fetchMock.mockReturnValueOnce(tokenPromise);
    fetchMock.mockResolvedValue(validUserResponse(false));

    const p1 = client.getIdentityStatus("sub|123");
    const p2 = client.getIdentityStatus("sub|456");

    resolveToken!(validTokenResponse);

    await Promise.all([p1, p2]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const urls = fetchMock.mock.calls.map(c => c[0]);
    expect(urls.filter(u => typeof u === "string" && u.includes("/oauth/token")).length).toBe(1);
    expect(urls.filter(u => typeof u === "string" && u.includes("/api/v2/users/sub%7C123")).length).toBe(1);
    expect(urls.filter(u => typeof u === "string" && u.includes("/api/v2/users/sub%7C456")).length).toBe(1);
  });

  it("19: 200 blocked=true => suspended", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse);
    fetchMock.mockResolvedValueOnce(validUserResponse(true));
    expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "suspended" });
  });

  it("20: 200 blocked=false => active", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse);
    fetchMock.mockResolvedValueOnce(validUserResponse(false));
    expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "active" });
  });

  it("21: 200 blocked absent => active", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse);
    fetchMock.mockResolvedValueOnce(validUserResponse(undefined));
    expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "active" });
  });

  it("22: 200 malformed blocked type => unavailable", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ blocked: "yes" }),
    } as Response);
    expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "unavailable" });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith("jurisprudence_auth_management_lookup_unavailable");
    expect(consoleErrorSpy.mock.calls[0].length).toBe(1);
    expect(consoleErrorSpy).not.toHaveBeenCalledWith("jurisprudence_auth_management_token_unavailable");
  });

  it("23: 404 => not_found", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 } as Response);
    expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "not_found" });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("24: 401 => unavailable", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 } as Response);
    expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "unavailable" });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith("jurisprudence_auth_management_lookup_unavailable");
    expect(consoleErrorSpy.mock.calls[0].length).toBe(1);
    expect(consoleErrorSpy).not.toHaveBeenCalledWith("jurisprudence_auth_management_token_unavailable");
  });

  it("25: 403 => unavailable", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 } as Response);
    expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "unavailable" });
  });

  it("26: 429 => unavailable", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429 } as Response);
    expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "unavailable" });
  });

  it("27: 500 => unavailable", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "unavailable" });
  });

  it("28: network failure => unavailable", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse);
    fetchMock.mockRejectedValueOnce(new Error("network failure"));
    expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "unavailable" });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith("jurisprudence_auth_management_lookup_unavailable");
    expect(consoleErrorSpy.mock.calls[0].length).toBe(1);
    expect(consoleErrorSpy).not.toHaveBeenCalledWith("jurisprudence_auth_management_token_unavailable");
  });

  it("29: timeout => unavailable", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse);
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

  it("30: invalid subject => unavailable with zero fetch calls", async () => {
    expect(await client.getIdentityStatus("")).toEqual({ status: "unavailable" });
    expect(await client.getIdentityStatus("   ")).toEqual({ status: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
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
    fetchMock.mockResolvedValueOnce(validTokenResponse as Response);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ([]),
    } as Response);
    expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "unavailable" });
  });

  it("user HTTP 200 + null => unavailable", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse as Response);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => (null),
    } as Response);
    expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "unavailable" });
  });

  it("short-lived token with expires_in <= 60 => no stale token reuse occurs", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "short_token",
        expires_in: 59, // Under the 60s margin
      }),
    } as Response);
    fetchMock.mockResolvedValueOnce(validUserResponse(false) as Response);

    // First lookup succeeds
    expect(await client.getIdentityStatus("sub|123")).toEqual({ status: "active" });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "new_token",
        expires_in: 3600,
      }),
    } as Response);
    fetchMock.mockResolvedValueOnce(validUserResponse(false) as Response);

    // Second lookup should fetch a new token since the first one is within the safety margin
    expect(await client.getIdentityStatus("sub|456")).toEqual({ status: "active" });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0]![0]).toContain("/oauth/token");
    expect(fetchMock.mock.calls[2]![0]).toContain("/oauth/token");
  });

  it("failed single flight token request clears in-flight state", async () => {
    let rejectToken: (r: unknown) => void;
    const tokenPromise = new Promise<Response>((_, rej) => {
      rejectToken = rej;
    });
    fetchMock.mockReturnValueOnce(tokenPromise);

    const p1 = client.getIdentityStatus("sub|123");
    rejectToken!(new Error("Network fail"));

    expect(await p1).toEqual({ status: "unavailable" });

    fetchMock.mockResolvedValueOnce(validTokenResponse as Response);
    fetchMock.mockResolvedValueOnce(validUserResponse(false) as Response);

    const p2 = client.getIdentityStatus("sub|456");
    expect(await p2).toEqual({ status: "active" });

    const urls = fetchMock.mock.calls.map(c => c[0]);
    expect(urls.filter(u => typeof u === "string" && u.includes("/oauth/token")).length).toBe(2);
  });

  it("403 lookup invalidates cached token for next call, no immediate retry", async () => {
    fetchMock.mockResolvedValueOnce(validTokenResponse as Response);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 } as Response);
    fetchMock.mockResolvedValueOnce(validTokenResponse as Response);
    fetchMock.mockResolvedValueOnce(validUserResponse(false) as Response);

    const result1 = await client.getIdentityStatus("sub|123");
    expect(result1).toEqual({ status: "unavailable" });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const result2 = await client.getIdentityStatus("sub|123");
    expect(result2).toEqual({ status: "active" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
