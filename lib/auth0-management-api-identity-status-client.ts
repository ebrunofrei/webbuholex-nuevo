import "server-only";

import type { Auth0ManagementApiRuntimeConfig } from "@/types/auth0-management-api-configuration";
import type { ExternalIdentityStatus } from "@/types/authentication-configuration";

// 60 seconds safety margin for M2M token expiration
const TOKEN_EXPIRY_SAFETY_MARGIN_MS = 60000;
const REQUEST_TIMEOUT_MS = 3000;

interface CachedToken {
  readonly accessToken: string;
  readonly expiresAt: number;
}

export class Auth0ManagementApiIdentityStatusClient {
  private readonly config: Auth0ManagementApiRuntimeConfig;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly nowImpl: () => number;

  private cachedToken: CachedToken | null = null;
  private tokenRequestPromise: Promise<string> | null = null;

  constructor(
    config: Auth0ManagementApiRuntimeConfig,
    options?: {
      fetch?: typeof globalThis.fetch;
      now?: () => number;
    }
  ) {
    this.config = config;
    this.fetchImpl = options?.fetch ?? globalThis.fetch.bind(globalThis);
    this.nowImpl = options?.now ?? Date.now;
  }

  async getIdentityStatus(subjectId: string): Promise<ExternalIdentityStatus> {
    if (typeof subjectId !== "string" || subjectId.trim() === "") {
      return { status: "unavailable" };
    }

    let token: string;
    try {
      token = await this.getAccessToken();
    } catch {
      console.error("jurisprudence_auth_management_token_unavailable");
      return { status: "unavailable" };
    }

    const encodedSubjectId = encodeURIComponent(subjectId);
    const url = `https://${this.config.domain}/api/v2/users/${encodedSubjectId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
    } catch {
      console.error("jurisprudence_auth_management_lookup_unavailable");
      return { status: "unavailable" };
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401 || response.status === 403) {
      this.cachedToken = null;
      console.error("jurisprudence_auth_management_lookup_unavailable");
      return { status: "unavailable" };
    }

    if (response.status === 404) {
      return { status: "not_found" };
    }

    if (response.status !== 200) {
      console.error("jurisprudence_auth_management_lookup_unavailable");
      return { status: "unavailable" };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      console.error("jurisprudence_auth_management_lookup_unavailable");
      return { status: "unavailable" };
    }

    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      console.error("jurisprudence_auth_management_lookup_unavailable");
      return { status: "unavailable" };
    }

    if ("blocked" in data) {
      const blocked = data.blocked;
      if (blocked !== undefined && typeof blocked !== "boolean") {
        console.error("jurisprudence_auth_management_lookup_unavailable");
        return { status: "unavailable" };
      }
      if (blocked === true) {
        return { status: "suspended" };
      }
    }

    return { status: "active" };
  }

  private async getAccessToken(): Promise<string> {
    const now = this.nowImpl();
    if (this.cachedToken && this.cachedToken.expiresAt > now + TOKEN_EXPIRY_SAFETY_MARGIN_MS) {
      return this.cachedToken.accessToken;
    }

    if (this.tokenRequestPromise) {
      return this.tokenRequestPromise;
    }

    this.tokenRequestPromise = this.requestNewAccessToken();

    try {
      const token = await this.tokenRequestPromise;
      return token;
    } finally {
      this.tokenRequestPromise = null;
    }
  }

  private async requestNewAccessToken(): Promise<string> {
    const url = `https://${this.config.domain}/oauth/token`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          audience: this.config.audience,
        }),
        signal: controller.signal,
      });
    } catch (e) {
      throw new Error("Token network error");
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error("Token HTTP error");
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error("Token parse error");
    }

    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      throw new Error("Malformed token response");
    }

    if (!("access_token" in data) || !("expires_in" in data)) {
      throw new Error("Missing required token fields");
    }

    const access_token = data.access_token;
    const expires_in = data.expires_in;

    if (typeof access_token !== "string" || access_token.trim() === "") {
      throw new Error("Invalid access token");
    }

    if (typeof expires_in !== "number" || expires_in <= 0 || !Number.isFinite(expires_in)) {
      throw new Error("Invalid expires_in");
    }

    const now = this.nowImpl();
    if (!Number.isFinite(now)) {
      throw new Error("Invalid now value");
    }

    const ttlMs = expires_in * 1000;
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new Error("Invalid token TTL");
    }

    const expiresAt = now + ttlMs;
    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      throw new Error("Invalid absolute expiry");
    }

    this.cachedToken = {
      accessToken: access_token,
      expiresAt: expiresAt,
    };

    return access_token;
  }
}
