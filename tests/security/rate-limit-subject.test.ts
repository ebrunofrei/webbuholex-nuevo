import { describe, expect, it } from "vitest";
import {
  extractClientIp,
  normalizeClientIp,
  hashRateLimitSubject,
} from "@/lib/security/rate-limit-subject";

describe("rate-limit-subject", () => {
  describe("normalizeClientIp", () => {
    it("normalizes standard IPv4", () => {
      expect(normalizeClientIp("192.168.1.1")).toBe("192.168.1.1");
    });

    it("strips port from IPv4 with port", () => {
      expect(normalizeClientIp("192.168.1.1:8080")).toBe("192.168.1.1");
    });

    it("preserves native unbracketed IPv6 without corrupting colons", () => {
      expect(normalizeClientIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(
        "2001:0db8:85a3:0000:0000:8a2e:0370:7334"
      );
      expect(normalizeClientIp("::1")).toBe("::1");
      expect(normalizeClientIp("2001:db8::1")).toBe("2001:db8::1");
    });

    it("strips brackets from bracketed IPv6", () => {
      expect(normalizeClientIp("[2001:db8::1]")).toBe("2001:db8::1");
    });

    it("strips port and brackets from bracketed IPv6 with port", () => {
      expect(normalizeClientIp("[2001:db8::1]:9000")).toBe("2001:db8::1");
    });

    it("falls back to 127.0.0.1 on empty or whitespace string", () => {
      expect(normalizeClientIp("")).toBe("127.0.0.1");
      expect(normalizeClientIp("   ")).toBe("127.0.0.1");
    });
  });

  describe("extractClientIp", () => {
    it("prefers x-real-ip when provided", () => {
      const headers = new Headers({
        "x-real-ip": "203.0.113.195",
        "x-forwarded-for": "198.51.100.1, 192.0.2.1",
      });
      expect(extractClientIp(headers)).toBe("203.0.113.195");
    });

    it("takes first token of x-forwarded-for chain when x-real-ip missing", () => {
      const headers = new Headers({
        "x-forwarded-for": "198.51.100.42, 192.0.2.1, 10.0.0.1",
      });
      expect(extractClientIp(headers)).toBe("198.51.100.42");
    });

    it("normalizes IPv4 with port from x-forwarded-for", () => {
      const headers = new Headers({
        "x-forwarded-for": "198.51.100.42:34567, 10.0.0.1",
      });
      expect(extractClientIp(headers)).toBe("198.51.100.42");
    });

    it("preserves native IPv6 from x-forwarded-for", () => {
      const headers = new Headers({
        "x-forwarded-for": "2001:db8:85a3::8a2e:370:7334, 10.0.0.1",
      });
      expect(extractClientIp(headers)).toBe("2001:db8:85a3::8a2e:370:7334");
    });

    it("falls back to 127.0.0.1 when no proxy headers present", () => {
      const headers = new Headers();
      expect(extractClientIp(headers)).toBe("127.0.0.1");
    });

    it("works with Record<string, string> header dictionaries", () => {
      const headers: Record<string, string> = {
        "x-real-ip": "192.0.2.55",
      };
      expect(extractClientIp(headers)).toBe("192.0.2.55");
    });
  });

  describe("hashRateLimitSubject", () => {
    const testSecret = "super-secret-hmac-key-test-12345";

    it("generates deterministic 64-character lowercase hex hash", () => {
      const hash1 = hashRateLimitSubject(testSecret, "192.168.1.1");
      const hash2 = hashRateLimitSubject(testSecret, "192.168.1.1");

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
      expect(hash1).not.toContain("192.168.1.1");
    });

    it("produces identical hashes for identical IPs regardless of port or formatting", () => {
      const hashStandard = hashRateLimitSubject(testSecret, "192.168.1.1");
      const hashWithPort = hashRateLimitSubject(testSecret, "192.168.1.1:8080");
      const hashWithWhitespace = hashRateLimitSubject(testSecret, "  192.168.1.1  ");

      expect(hashStandard).toBe(hashWithPort);
      expect(hashStandard).toBe(hashWithWhitespace);
    });

    it("isolates hashes for different IPs", () => {
      const hashA = hashRateLimitSubject(testSecret, "192.168.1.1");
      const hashB = hashRateLimitSubject(testSecret, "192.168.1.2");

      expect(hashA).not.toBe(hashB);
    });

    it("isolates hashes for different secrets", () => {
      const hash1 = hashRateLimitSubject("secret-1", "192.168.1.1");
      const hash2 = hashRateLimitSubject("secret-2", "192.168.1.1");

      expect(hash1).not.toBe(hash2);
    });

    it("throws when secret is missing or blank", () => {
      expect(() => hashRateLimitSubject("", "192.168.1.1")).toThrowError(/HMAC secret is required/);
      expect(() => hashRateLimitSubject("   ", "192.168.1.1")).toThrowError(/HMAC secret is required/);
    });
  });
});
