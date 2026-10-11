import crypto from "node:crypto";

export type RateLimitHeaderBag = {
  readonly [key: string]: string | readonly string[] | undefined;
};

function getBagValue(bag: RateLimitHeaderBag, key: string): string | undefined {
  const exact = bag[key];
  const value = exact !== undefined ? exact : bag[key.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === "string" ? value : undefined;
}

/**
 * Normalizes an IP string:
 * - strips surrounding whitespace
 * - safely strips port from bracketed IPv6: [2001:db8::1]:8080 -> 2001:db8::1
 * - safely strips brackets from bracketed IPv6: [2001:db8::1] -> 2001:db8::1
 * - safely strips port from IPv4: 192.168.1.1:8080 -> 192.168.1.1
 * - leaves native IPv6 (e.g. 2001:db8::1, ::1) completely uncorrupted (does NOT split on :)
 */
export function normalizeClientIp(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return "127.0.0.1";
  }

  // Bracketed IPv6 with port: [2001:db8::1]:8080
  const bracketedWithPortMatch = /^\[([a-fA-F0-9:]+)\]:\d+$/.exec(trimmed);
  const bracketedWithPortGroup = bracketedWithPortMatch?.[1];
  if (bracketedWithPortGroup !== undefined) {
    return bracketedWithPortGroup.toLowerCase();
  }

  // Bracketed IPv6 without port: [2001:db8::1]
  const bracketedMatch = /^\[([a-fA-F0-9:]+)\]$/.exec(trimmed);
  const bracketedGroup = bracketedMatch?.[1];
  if (bracketedGroup !== undefined) {
    return bracketedGroup.toLowerCase();
  }

  // Standard IPv4 with port: 192.168.1.1:8080
  const ipv4WithPortMatch = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(trimmed);
  const ipv4Group = ipv4WithPortMatch?.[1];
  if (ipv4Group !== undefined) {
    return ipv4Group;
  }

  return trimmed.toLowerCase();
}

/**
 * Extracts client IP following deployment assumption (Vercel / trusted reverse-proxy).
 * Precedence:
 * 1. x-real-ip
 * 2. x-forwarded-for (first client token)
 * 3. Fallback: 127.0.0.1
 */
export function extractClientIp(headers: Headers): string;
export function extractClientIp(headers: RateLimitHeaderBag): string;
export function extractClientIp(headers: Headers | RateLimitHeaderBag): string {
  if (headers instanceof Headers) {
    const realIp = headers.get("x-real-ip");
    if (realIp && realIp.trim().length > 0) {
      return normalizeClientIp(realIp);
    }

    const forwardedFor = headers.get("x-forwarded-for");
    if (forwardedFor && forwardedFor.trim().length > 0) {
      const firstToken = forwardedFor.split(",")[0];
      if (firstToken !== undefined && firstToken.trim().length > 0) {
        return normalizeClientIp(firstToken);
      }
    }

    return "127.0.0.1";
  }

  const realIp = getBagValue(headers, "x-real-ip");
  if (realIp && realIp.trim().length > 0) {
    return normalizeClientIp(realIp);
  }

  const forwardedFor = getBagValue(headers, "x-forwarded-for");
  if (forwardedFor && forwardedFor.trim().length > 0) {
    const firstToken = forwardedFor.split(",")[0];
    if (firstToken !== undefined && firstToken.trim().length > 0) {
      return normalizeClientIp(firstToken);
    }
  }

  return "127.0.0.1";
}

/**
 * Generates HMAC-SHA256 subject identifier.
 * Raw IP is NEVER persisted.
 */
export function hashRateLimitSubject(secret: string, rawIp: string): string {
  if (!secret || secret.trim().length === 0) {
    throw new Error("HMAC secret is required for rate limit subject hashing");
  }
  const normalized = normalizeClientIp(rawIp);
  return crypto.createHmac("sha256", secret).update(normalized).digest("hex").toLowerCase();
}
