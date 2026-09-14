import { describe, it, expect } from "vitest";
import {
  generateCheckoutToken,
  hashCheckoutToken,
  isValidCheckoutTokenFormat,
} from "@/lib/payments/payment-checkout-session";

describe("PaymentCheckoutSession Domain", () => {
  describe("Token Generation", () => {
    it("generates a 43 character token", () => {
      const token = generateCheckoutToken();
      expect(token).toHaveLength(43);
    });

    it("uses base64url charset", () => {
      const token = generateCheckoutToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("generates unique tokens", () => {
      const token1 = generateCheckoutToken();
      const token2 = generateCheckoutToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe("Token Format Validation", () => {
    it("accepts valid 43 char token", () => {
      const token = generateCheckoutToken();
      expect(isValidCheckoutTokenFormat(token)).toBe(true);
    });

    it("rejects 42 char token", () => {
      const token = generateCheckoutToken().slice(0, 42);
      expect(isValidCheckoutTokenFormat(token)).toBe(false);
    });

    it("rejects 44 char token", () => {
      const token = generateCheckoutToken() + "A";
      expect(isValidCheckoutTokenFormat(token)).toBe(false);
    });

    it("rejects invalid charset", () => {
      const token = generateCheckoutToken().slice(0, 42) + "!";
      expect(isValidCheckoutTokenFormat(token)).toBe(false);
    });
  });

  describe("Token Hashing", () => {
    it("is deterministic", () => {
      const token = generateCheckoutToken();
      const hash1 = hashCheckoutToken(token);
      const hash2 = hashCheckoutToken(token);
      expect(hash1).toBe(hash2);
    });

    it("generates 64 character lowercase hex", () => {
      const token = generateCheckoutToken();
      const hash = hashCheckoutToken(token);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it("hash is not equal to token", () => {
      const token = generateCheckoutToken();
      const hash = hashCheckoutToken(token);
      expect(hash).not.toBe(token);
    });
  });
});
