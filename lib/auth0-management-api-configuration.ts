import "server-only";
import type { Auth0ManagementApiConfiguration } from "@/types/auth0-management-api-configuration";

export type Auth0ManagementApiConfigurationSource = Readonly<Record<string, string | undefined>>;

function isValidAuth0Domain(domain: string): boolean {
  if (!domain || domain.trim() !== domain) return false;
  if (domain.length > 253) return false;
  if (/[/:?#@\s]/.test(domain)) return false;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;

  const labels = domain.split(".");
  if (labels.length < 2) return false;

  for (const label of labels) {
    if (label.length === 0 || label.length > 63) return false;
    if (label.startsWith("-") || label.endsWith("-")) return false;
    if (!/^[a-zA-Z0-9-]+$/.test(label)) return false;
  }

  return true;
}

export function loadAuth0ManagementApiConfiguration(
  source: Auth0ManagementApiConfigurationSource
): Auth0ManagementApiConfiguration {
  const domain = source.AUTH0_DOMAIN;
  const clientId = source.AUTH0_MANAGEMENT_CLIENT_ID;
  const clientSecret = source.AUTH0_MANAGEMENT_CLIENT_SECRET;

  if (clientId === undefined && clientSecret === undefined) {
    return { status: "not_configured" };
  }

  if (!domain || !clientId || !clientSecret || domain.trim() === "" || clientId.trim() === "" || clientSecret.trim() === "") {
    return { status: "invalid", reason: "missing_field" };
  }

  if (!isValidAuth0Domain(domain)) {
    return { status: "invalid", reason: "invalid_domain" };
  }

  return {
    status: "configured",
    domain,
    clientId,
    clientSecret,
    audience: `https://${domain}/api/v2/`,
    scope: "read:users",
  };
}
