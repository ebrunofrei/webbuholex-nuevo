// @vitest-environment node
import { describe, expect, it } from "vitest";
import { loadAuth0ManagementApiConfiguration } from "@/lib/auth0-management-api-configuration";

describe("Auth0 Management API Configuration", () => {
  it("fails when missing management client id", () => {
    const config = loadAuth0ManagementApiConfiguration({
      AUTH0_DOMAIN: "tenant.auth0.com",
      AUTH0_MANAGEMENT_CLIENT_SECRET: "secret",
    });
    expect(config.status).toBe("invalid");
    if (config.status === "invalid") {
      expect(config.reason).toBe("missing_field");
    }
  });

  it("fails when missing management client secret", () => {
    const config = loadAuth0ManagementApiConfiguration({
      AUTH0_DOMAIN: "tenant.auth0.com",
      AUTH0_MANAGEMENT_CLIENT_ID: "client_id",
    });
    expect(config.status).toBe("invalid");
    if (config.status === "invalid") {
      expect(config.reason).toBe("missing_field");
    }
  });

  const invalidDomains = [
    { name: "contains scheme", value: "https://tenant.auth0.com" },
    { name: "contains path", value: "tenant.auth0.com/path" },
    { name: "contains port", value: "tenant.auth0.com:443" },
    { name: "contains query", value: "tenant.auth0.com?query=x" },
    { name: "contains fragment", value: "tenant.auth0.com#fragment" },
    { name: "contains whitespace inside", value: "tenant .auth0.com" },
    { name: "starts with leading dot", value: ".tenant.auth0.com" },
    { name: "ends with trailing dot", value: "tenant.auth0.com." },
    { name: "contains empty label (repeated dot)", value: "tenant..auth0.com" },
    { name: "is just a dot", value: "." },
    { name: "has no dot (single label)", value: "tenant" },
  ];

  for (const { name, value } of invalidDomains) {
    it(`fails on invalid domain: ${name}`, () => {
      const config = loadAuth0ManagementApiConfiguration({
        AUTH0_DOMAIN: value,
        AUTH0_MANAGEMENT_CLIENT_ID: "client_id",
        AUTH0_MANAGEMENT_CLIENT_SECRET: "secret",
      });
      expect(config.status).toBe("invalid");
      if (config.status === "invalid") {
        expect(config.reason).toBe("invalid_domain");
      }
    });
  }

  it("fails on empty domain independently configured", () => {
    const config = loadAuth0ManagementApiConfiguration({
      AUTH0_DOMAIN: "   ",
      AUTH0_MANAGEMENT_CLIENT_ID: "client_id",
      AUTH0_MANAGEMENT_CLIENT_SECRET: "secret",
    });
    expect(config.status).toBe("invalid");
    if (config.status === "invalid") {
      expect(config.reason).toBe("missing_field");
    }
  });

  it("succeeds with valid config and derives audience and scope exactly", () => {
    const config = loadAuth0ManagementApiConfiguration({
      AUTH0_DOMAIN: "tenant.auth0.com",
      AUTH0_MANAGEMENT_CLIENT_ID: "client_id",
      AUTH0_MANAGEMENT_CLIENT_SECRET: "secret",
    });
    expect(config.status).toBe("configured");
    if (config.status === "configured") {
      expect(config.domain).toBe("tenant.auth0.com");
      expect(config.clientId).toBe("client_id");
      expect(config.clientSecret).toBe("secret");
      expect(config.audience).toBe("https://tenant.auth0.com/api/v2/");
      expect(config.scope).toBe("read:users");
    }
  });

  it("does not fallback to web login credentials", () => {
    const config = loadAuth0ManagementApiConfiguration({
      AUTH0_DOMAIN: "tenant.auth0.com",
      AUTH0_CLIENT_ID: "web_client_id",
      AUTH0_CLIENT_SECRET: "web_client_secret",
    });
    expect(config.status).toBe("not_configured");
  });

  it("does not expose secret in thrown errors or returned invalid states", () => {
    const config = loadAuth0ManagementApiConfiguration({
      AUTH0_DOMAIN: "tenant.auth0.com",
      AUTH0_MANAGEMENT_CLIENT_ID: "client_id",
      AUTH0_MANAGEMENT_CLIENT_SECRET: "",
    });
    const serialized = JSON.stringify(config);
    expect(serialized).not.toContain("secret");
  });
});
