import { describe, it, expect, vi, beforeEach } from "vitest";
import { getWorkspaceSession, extractValidMetadata } from "@/lib/auth/session";
import { auth0 } from "@/lib/auth/auth0";

vi.mock("@/lib/auth/auth0", () => ({
  auth0: {
    getSession: vi.fn(),
  },
}));

describe("getWorkspaceSession metadata boundary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const validSession = {
    user: { sub: "auth0|123" },
    tokenSet: { expiresAt: 123456, accessToken: "token" },
    internal: {
      sid: "session-123",
      createdAt: 1700000000,
      sessionExpiresAt: 1700003600,
    },
  };

  it("1. sid populates sessionId", async () => {
    vi.mocked(auth0.getSession).mockResolvedValue(validSession);
    const session = await getWorkspaceSession();
    expect(session.sessionId).toBe("session-123");
  });

  it("2. createdAt epoch seconds becomes exact ISO issuedAt", async () => {
    vi.mocked(auth0.getSession).mockResolvedValue(validSession);
    const session = await getWorkspaceSession();
    expect(session.issuedAt).toBe("2023-11-14T22:13:20.000Z"); // 1700000000 * 1000
  });

  it("3. sessionExpiresAt epoch seconds becomes exact ISO expiresAt", async () => {
    vi.mocked(auth0.getSession).mockResolvedValue(validSession);
    const session = await getWorkspaceSession();
    expect(session.expiresAt).toBe("2023-11-14T23:13:20.000Z"); // 1700003600 * 1000
  });

  it("4. undefined sessionExpiresAt returns null", async () => {
    const { sessionExpiresAt, ...internalWithoutExpiresAt } = validSession.internal;
    vi.mocked(auth0.getSession).mockResolvedValue({
      ...validSession,
      internal: internalWithoutExpiresAt,
    });
    const session = await getWorkspaceSession();
    expect(session.expiresAt).toBeNull();
  });

  it("5. no token exp fallback occurs when sessionExpiresAt is missing", async () => {
    const { sessionExpiresAt, ...internalWithoutExpiresAt } = validSession.internal;
    vi.mocked(auth0.getSession).mockResolvedValue({
      ...validSession,
      internal: internalWithoutExpiresAt,
      user: { sub: "auth0|123", exp: 9999999999 },
    });
    const session = await getWorkspaceSession();
    expect(session.expiresAt).toBeNull();
  });

  it("6. providerSubjectId remains unchanged", async () => {
    vi.mocked(auth0.getSession).mockResolvedValue(validSession);
    const session = await getWorkspaceSession();
    expect(session.providerSubjectId).toBe("auth0|123");
  });

  it("7. provider remains auth0", async () => {
    vi.mocked(auth0.getSession).mockResolvedValue(validSession);
    const session = await getWorkspaceSession();
    expect(session.provider).toBe("auth0");
  });

  it("8. invalid sid fails closed", () => {
    for (const badSid of [null, undefined, "", "   ", 123, {}]) {
      const meta = extractValidMetadata({
        ...validSession,
        internal: { ...validSession.internal, sid: badSid },
      });
      expect(meta).toBeNull();
    }
  });

  it("9. invalid createdAt fails closed", () => {
    for (const badCreatedAt of [null, undefined, -1, 0, NaN, Infinity, -Infinity, "1700000000"]) {
      const meta = extractValidMetadata({
        ...validSession,
        internal: { ...validSession.internal, createdAt: badCreatedAt },
      });
      expect(meta).toBeNull();
    }
  });

  it("10. invalid sessionExpiresAt fails closed", () => {
    for (const badSessionExpiresAt of [null, -1, 0, NaN, Infinity, -Infinity, "1700003600"]) {
      const meta = extractValidMetadata({
        ...validSession,
        internal: { ...validSession.internal, sessionExpiresAt: badSessionExpiresAt },
      });
      expect(meta).toBeNull();
    }
  });

  it("11. expiry before issuedAt fails closed", () => {
    const meta = extractValidMetadata({
      ...validSession,
      internal: {
        sid: "session-123",
        createdAt: 1700000000,
        sessionExpiresAt: 1699999999, // Before createdAt
      },
    });
    expect(meta).toBeNull();
  });

  it("12. no synthetic now()/UUID behavior", async () => {
    vi.mocked(auth0.getSession).mockResolvedValue(null);
    const session = await getWorkspaceSession();
    expect(session.status).toBe("not_configured");
    expect(session.sessionId).toBeNull();
    expect(session.issuedAt).toBeNull();
    expect(session.expiresAt).toBeNull();
  });

  it("13. extremely large finite createdAt fails closed", () => {
    // 8640000000000000 is the max valid timestamp in ms for JS Date.
    // In seconds it's 8640000000000. So anything larger should fail.
    const meta = extractValidMetadata({
      ...validSession,
      internal: { ...validSession.internal, createdAt: 9000000000000 },
    });
    expect(meta).toBeNull();
  });

  it("14. extremely large finite sessionExpiresAt fails closed", () => {
    const meta = extractValidMetadata({
      ...validSession,
      internal: { ...validSession.internal, sessionExpiresAt: 9000000000000 },
    });
    expect(meta).toBeNull();
  });
});
