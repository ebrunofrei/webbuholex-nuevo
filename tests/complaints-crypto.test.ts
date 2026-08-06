import { describe, it, expect } from "vitest";
import {
  hashCanonicalJson,
  deriveComplaintAccessTokenDigest,
  deriveComplaintIdempotencyDigest,
  timingSafeEqualHex
} from "../lib/complaints/crypto";

describe("crypto", () => {
  describe("hashCanonicalJson", () => {
    it("SHA-256 determinista", () => {
      const result = hashCanonicalJson({ a: 1 });
      expect(result.sha256).toBe(hashCanonicalJson({ a: 1 }).sha256);
    });

    it("vector conocido", () => {
      const result = hashCanonicalJson({ a: 1 });
      expect(result.canonicalJson).toBe('{"a":1}');
      expect(result.sha256).toBe("015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862");
    });

    it("longitud 64", () => {
      expect(hashCanonicalJson({ a: 1 }).sha256).toHaveLength(64);
    });

    it("hex minúsculo", () => {
      expect(hashCanonicalJson({ a: 1 }).sha256).toMatch(/^[0-9a-f]{64}$/);
    });

    it("distinto orden, mismo hash", () => {
      expect(hashCanonicalJson({ a: 1, b: 2 }).sha256).toBe(hashCanonicalJson({ b: 2, a: 1 }).sha256);
    });

    it("cambio de valor, hash diferente", () => {
      expect(hashCanonicalJson({ a: 1 }).sha256).not.toBe(hashCanonicalJson({ a: 2 }).sha256);
    });

    it("NFC/NFD, hash diferente", () => {
      expect(hashCanonicalJson("ñ").sha256).not.toBe(hashCanonicalJson("n\u0303").sha256);
    });

    it("canonical JSON devuelto", () => {
      expect(hashCanonicalJson({ a: 1 }).canonicalJson).toBe('{"a":1}');
    });
  });

  describe("HMAC", () => {
    const validSecret = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // 32 chars
    const validToken = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"; // 32 chars
    const validIdempotencyKey = "cccccccccccccccc"; // 16 chars

    it("HMAC token determinista", () => {
      const res1 = deriveComplaintAccessTokenDigest({ token: validToken, secret: validSecret, keyVersion: 1 });
      const res2 = deriveComplaintAccessTokenDigest({ token: validToken, secret: validSecret, keyVersion: 1 });
      expect(res1.digest).toBe(res2.digest);
    });

    it("HMAC idempotencia determinista", () => {
      const res1 = deriveComplaintIdempotencyDigest({ idempotencyKey: validIdempotencyKey, secret: validSecret, keyVersion: 1 });
      const res2 = deriveComplaintIdempotencyDigest({ idempotencyKey: validIdempotencyKey, secret: validSecret, keyVersion: 1 });
      expect(res1.digest).toBe(res2.digest);
    });

    it("dominios diferentes producen digest distinto", () => {
      // Usar mismo input/secret pero distintos dominios (uno por access token, otro por idempotency)
      // Como validToken y validIdempotencyKey tienen longitud diferente en el vector válido, pasaremos el mismo string de 32 chars
      const res1 = deriveComplaintAccessTokenDigest({ token: validToken, secret: validSecret, keyVersion: 1 });
      const res2 = deriveComplaintIdempotencyDigest({ idempotencyKey: validToken, secret: validSecret, keyVersion: 1 });
      expect(res1.digest).not.toBe(res2.digest);
    });

    it("secretos diferentes producen digest distinto", () => {
      const res1 = deriveComplaintAccessTokenDigest({ token: validToken, secret: validSecret, keyVersion: 1 });
      const res2 = deriveComplaintAccessTokenDigest({ token: validToken, secret: validSecret.replace("a", "b"), keyVersion: 1 });
      expect(res1.digest).not.toBe(res2.digest);
    });

    it("inputs diferentes producen digest distinto", () => {
      const res1 = deriveComplaintAccessTokenDigest({ token: validToken, secret: validSecret, keyVersion: 1 });
      const res2 = deriveComplaintAccessTokenDigest({ token: validToken.replace("b", "c"), secret: validSecret, keyVersion: 1 });
      expect(res1.digest).not.toBe(res2.digest);
    });

    it("keyVersion devuelta", () => {
      const res = deriveComplaintAccessTokenDigest({ token: validToken, secret: validSecret, keyVersion: 42 });
      expect(res.keyVersion).toBe(42);
    });

    it("input vacío", () => {
      expect(() => deriveComplaintAccessTokenDigest({ token: "", secret: validSecret, keyVersion: 1 })).toThrow("complaint_hmac_input_invalid");
    });

    it("input solo espacios", () => {
      expect(() => deriveComplaintAccessTokenDigest({ token: "                                ", secret: validSecret, keyVersion: 1 })).toThrow("complaint_hmac_input_invalid");
    });

    it("input demasiado corto", () => {
      expect(() => deriveComplaintAccessTokenDigest({ token: "short", secret: validSecret, keyVersion: 1 })).toThrow("complaint_hmac_input_invalid");
    });

    it("input demasiado largo", () => {
      const longToken = "a".repeat(513);
      expect(() => deriveComplaintAccessTokenDigest({ token: longToken, secret: validSecret, keyVersion: 1 })).toThrow("complaint_hmac_input_invalid");
    });

    it("secreto vacío", () => {
      expect(() => deriveComplaintAccessTokenDigest({ token: validToken, secret: "", keyVersion: 1 })).toThrow("complaint_hmac_secret_invalid");
    });

    it("secreto solo espacios", () => {
      expect(() => deriveComplaintAccessTokenDigest({ token: validToken, secret: "                                ", keyVersion: 1 })).toThrow("complaint_hmac_secret_invalid");
    });

    it("secreto demasiado corto", () => {
      expect(() => deriveComplaintAccessTokenDigest({ token: validToken, secret: "short", keyVersion: 1 })).toThrow("complaint_hmac_secret_invalid");
    });

    it("secreto demasiado largo", () => {
      const longSecret = "a".repeat(4097);
      expect(() => deriveComplaintAccessTokenDigest({ token: validToken, secret: longSecret, keyVersion: 1 })).toThrow("complaint_hmac_secret_invalid");
    });

    it("secreto idéntico al input", () => {
      expect(() => deriveComplaintAccessTokenDigest({ token: validToken, secret: validToken, keyVersion: 1 })).toThrow("complaint_hmac_secret_invalid");
    });

    it("versión cero", () => {
      expect(() => deriveComplaintAccessTokenDigest({ token: validToken, secret: validSecret, keyVersion: 0 })).toThrow("complaint_hmac_version_unsupported");
    });

    it("versión negativa", () => {
      expect(() => deriveComplaintAccessTokenDigest({ token: validToken, secret: validSecret, keyVersion: -1 })).toThrow("complaint_hmac_version_unsupported");
    });

    it("versión decimal", () => {
      expect(() => deriveComplaintAccessTokenDigest({ token: validToken, secret: validSecret, keyVersion: 1.5 })).toThrow("complaint_hmac_version_unsupported");
    });

    it("versión insegura", () => {
      expect(() => deriveComplaintAccessTokenDigest({ token: validToken, secret: validSecret, keyVersion: Number.MAX_SAFE_INTEGER + 1 })).toThrow("complaint_hmac_version_unsupported");
    });

    it("digest 64 hex", () => {
      const res = deriveComplaintAccessTokenDigest({ token: validToken, secret: validSecret, keyVersion: 1 });
      expect(res.digest).toHaveLength(64);
      expect(res.digest).toMatch(/^[0-9a-f]{64}$/);
    });

    it("errores no contienen input ni secret", () => {
      let err: Error | undefined;
      try {
        deriveComplaintAccessTokenDigest({ token: validToken, secret: "short", keyVersion: 1 });
      } catch (e) {
        err = e as Error;
      }
      expect(err?.message).toBe("complaint_hmac_secret_invalid");
      expect(err?.message).not.toContain("short");
      expect(err?.message).not.toContain(validToken);
    });
  });

  describe("timingSafeEqualHex", () => {
    const hex1 = "a".repeat(64);
    const hex2 = "b".repeat(64);

    it("timing equal verdadero", () => {
      expect(timingSafeEqualHex(hex1, hex1)).toBe(true);
    });

    it("timing equal falso", () => {
      expect(timingSafeEqualHex(hex1, hex2)).toBe(false);
    });

    it("longitud distinta", () => {
      expect(timingSafeEqualHex(hex1, "a".repeat(63))).toBe(false);
    });

    it("hex inválido", () => {
      expect(timingSafeEqualHex(hex1, "z".repeat(64))).toBe(false);
    });

    it("hex mayúsculo", () => {
      expect(timingSafeEqualHex(hex1, hex1.toUpperCase())).toBe(false);
    });

    it("ausencia de padding", () => {
      // Una cadena más corta pero con hex válido
      expect(timingSafeEqualHex("a".repeat(62), "a".repeat(62))).toBe(false);
    });
  });
});
