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

interface CachedStatus {
  readonly status: ExternalIdentityStatus;
  readonly expiresAt: number;
}

export interface Auth0ManagementCacheStore {
  readonly tokens: Map<string, CachedToken>;
  readonly tokenPromises: Map<string, Promise<string>>;
  readonly statuses: Map<string, CachedStatus>;
  readonly statusPromises: Map<string, Promise<ExternalIdentityStatus>>;
}

const defaultCacheStore: Auth0ManagementCacheStore = {
  tokens: new Map(),
  tokenPromises: new Map(),
  statuses: new Map(),
  statusPromises: new Map(),
};

const MAX_CACHE_SIZE = 1000;
const ACTIVE_TTL_MS = 15000;
const SUSPENDED_TTL_MS = 30000;
const NOT_FOUND_TTL_MS = 30000;

export class Auth0ManagementApiIdentityStatusClient {
  private readonly config: Auth0ManagementApiRuntimeConfig;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly nowImpl: () => number;
  private readonly cacheStore: Auth0ManagementCacheStore;
  private readonly tokenCacheKey: string;

  constructor(
    config: Auth0ManagementApiRuntimeConfig,
    options?: {
      fetch?: typeof globalThis.fetch;
      now?: () => number;
      cacheStore?: Auth0ManagementCacheStore;
    }
  ) {
    this.config = config;
    this.fetchImpl = options?.fetch ?? globalThis.fetch.bind(globalThis);
    this.nowImpl = options?.now ?? Date.now;
    this.cacheStore = options?.cacheStore ?? defaultCacheStore;
    this.tokenCacheKey = JSON.stringify([config.domain, config.clientId, config.audience]);
  }

  async getIdentityStatus(subjectId: string): Promise<ExternalIdentityStatus> {
    if (typeof subjectId !== "string" || subjectId.trim() === "") {
      return { status: "unavailable" };
    }

    const identityCacheKey = JSON.stringify([this.tokenCacheKey, "auth0", subjectId]);
    const now = this.nowImpl();

    const cached = this.cacheStore.statuses.get(identityCacheKey);
    if (cached) {
      if (cached.expiresAt > now) {
        return cached.status;
      }
      this.cacheStore.statuses.delete(identityCacheKey);
    }

    const existingPromise = this.cacheStore.statusPromises.get(identityCacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    const requestPromise = this.fetchAndCacheIdentityStatus(subjectId, identityCacheKey);
    this.cacheStore.statusPromises.set(identityCacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.cacheStore.statusPromises.delete(identityCacheKey);
    }
  }

  private async fetchAndCacheIdentityStatus(subjectId: string, cacheKey: string): Promise<ExternalIdentityStatus> {
    let token: string;
    try {
      token = await this.getAccessToken();
    } catch {
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
      return { status: "unavailable" };
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401) {
      this.cacheStore.tokens.delete(this.tokenCacheKey);
      return { status: "unavailable" };
    }

    if (response.status === 403) {
      this.cacheStore.tokens.delete(this.tokenCacheKey);
      return { status: "unavailable" };
    }

    if (response.status === 404) {
      this.setIdentityStatusCache(cacheKey, { status: "not_found" }, NOT_FOUND_TTL_MS);
      return { status: "not_found" };
    }

    if (response.status === 429) {
      return { status: "unavailable" };
    }

    if (response.status >= 500 && response.status <= 599) {
      return { status: "unavailable" };
    }

    if (response.status !== 200) {
      return { status: "unavailable" };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { status: "unavailable" };
    }

    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return { status: "unavailable" };
    }

    if ("blocked" in data) {
      const blocked = data.blocked;
      if (blocked !== undefined && typeof blocked !== "boolean") {
        return { status: "unavailable" };
      }
      if (blocked === true) {
        this.setIdentityStatusCache(cacheKey, { status: "suspended" }, SUSPENDED_TTL_MS);
        return { status: "suspended" };
      }
    }

    this.setIdentityStatusCache(cacheKey, { status: "active" }, ACTIVE_TTL_MS);
    return { status: "active" };
  }

  private setIdentityStatusCache(key: string, status: ExternalIdentityStatus, ttl: number): void {
    const now = this.nowImpl();
    for (const [k, v] of this.cacheStore.statuses.entries()) {
      if (v.expiresAt <= now) {
        this.cacheStore.statuses.delete(k);
      }
    }
    if (this.cacheStore.statuses.size >= MAX_CACHE_SIZE) {
      const firstKey = this.cacheStore.statuses.keys().next().value;
      if (firstKey !== undefined) this.cacheStore.statuses.delete(firstKey);
    }
    this.cacheStore.statuses.set(key, {
      status,
      expiresAt: now + ttl,
    });
  }

  private async getAccessToken(): Promise<string> {
    const now = this.nowImpl();
    const cachedToken = this.cacheStore.tokens.get(this.tokenCacheKey);
    if (cachedToken && cachedToken.expiresAt > now + TOKEN_EXPIRY_SAFETY_MARGIN_MS) {
      return cachedToken.accessToken;
    }

    const tokenRequestPromise = this.cacheStore.tokenPromises.get(this.tokenCacheKey);
    if (tokenRequestPromise) {
      return tokenRequestPromise;
    }

    const newPromise = this.requestNewAccessToken();
    this.cacheStore.tokenPromises.set(this.tokenCacheKey, newPromise);

    try {
      const token = await newPromise;
      return token;
    } finally {
      this.cacheStore.tokenPromises.delete(this.tokenCacheKey);
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
    } catch {
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

    this.cacheStore.tokens.set(this.tokenCacheKey, {
      accessToken: access_token,
      expiresAt: expiresAt,
    });

    return access_token;
  }
}
