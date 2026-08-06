import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { canonicalizeJson } from "./canonical-json";

export interface CanonicalJsonHashResult {
  readonly canonicalJson: string;
  readonly sha256: string;
}

export interface VersionedDigest {
  readonly digest: string;
  readonly keyVersion: number;
}

export function hashCanonicalJson(value: unknown): CanonicalJsonHashResult {
  const canonicalJson = canonicalizeJson(value);
  const hash = createHash("sha256");
  hash.update(canonicalJson, "utf8");
  return {
    canonicalJson,
    sha256: hash.digest("hex").toLowerCase()
  };
}

export function deriveComplaintAccessTokenDigest(input: {
  readonly token: string;
  readonly secret: string;
  readonly keyVersion: number;
}): VersionedDigest {
  const { token, secret, keyVersion } = input;
  validateVersion(keyVersion);
  validateSecret(secret, token);
  validateToken(token);

  const domain = "buholex:complaints:access-token:v1:";
  const tokenLength = Buffer.byteLength(token, "utf8");
  const message = `${domain}${tokenLength}:${token}`;

  const hmac = createHmac("sha256", secret);
  hmac.update(message, "utf8");

  return {
    digest: hmac.digest("hex").toLowerCase(),
    keyVersion
  };
}

export function deriveComplaintIdempotencyDigest(input: {
  readonly idempotencyKey: string;
  readonly secret: string;
  readonly keyVersion: number;
}): VersionedDigest {
  const { idempotencyKey, secret, keyVersion } = input;
  validateVersion(keyVersion);
  validateSecret(secret, idempotencyKey);
  validateIdempotencyKey(idempotencyKey);

  const domain = "buholex:complaints:idempotency:v1:";
  const keyLength = Buffer.byteLength(idempotencyKey, "utf8");
  const message = `${domain}${keyLength}:${idempotencyKey}`;

  const hmac = createHmac("sha256", secret);
  hmac.update(message, "utf8");

  return {
    digest: hmac.digest("hex").toLowerCase(),
    keyVersion
  };
}

function validateVersion(version: number) {
  if (!Number.isInteger(version) || version <= 0 || version > Number.MAX_SAFE_INTEGER) {
    throw new Error("complaint_hmac_version_unsupported");
  }
}

function validateSecret(secret: string, inputString: string) {
  if (typeof secret !== "string") throw new Error("complaint_hmac_secret_invalid");
  if (secret.length < 32 || secret.length > 4096) throw new Error("complaint_hmac_secret_invalid");
  if (secret.trim().length === 0) throw new Error("complaint_hmac_secret_invalid");
  if (secret === inputString) throw new Error("complaint_hmac_secret_invalid");
}

function validateToken(token: string) {
  if (typeof token !== "string") throw new Error("complaint_hmac_input_invalid");
  if (token.length < 32 || token.length > 512) throw new Error("complaint_hmac_input_invalid");
  if (token.trim().length === 0) throw new Error("complaint_hmac_input_invalid");
}

function validateIdempotencyKey(key: string) {
  if (typeof key !== "string") throw new Error("complaint_hmac_input_invalid");
  if (key.length < 16 || key.length > 256) throw new Error("complaint_hmac_input_invalid");
  if (key.trim().length === 0) throw new Error("complaint_hmac_input_invalid");
}

export function timingSafeEqualHex(expected: string, candidate: string): boolean {
  if (typeof expected !== "string" || typeof candidate !== "string") return false;
  const regex = /^[0-9a-f]{64}$/;
  if (!regex.test(expected) || !regex.test(candidate)) return false;

  const expectedBuf = Buffer.from(expected, "hex");
  const candidateBuf = Buffer.from(candidate, "hex");

  try {
    return timingSafeEqual(expectedBuf, candidateBuf);
  } catch {
    return false;
  }
}
