import crypto from "crypto";

export const CHECKOUT_SESSION_TTL_MINUTES = 30;

export function generateCheckoutToken(): string {
  // 32 bytes of entropy encoded as base64url, which is 43 characters long
  return crypto.randomBytes(32).toString("base64url");
}

export function hashCheckoutToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function isValidCheckoutTokenFormat(token: string): boolean {
  // Must be 43 chars, URL-safe base64 [A-Za-z0-9_-]
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
