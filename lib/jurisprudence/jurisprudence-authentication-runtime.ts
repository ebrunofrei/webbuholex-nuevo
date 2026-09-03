import "server-only";

import { loadAuthenticationConfiguration, type AuthenticationConfigurationSource } from "@/lib/authentication-configuration";
import { loadAuth0ManagementApiConfiguration, type Auth0ManagementApiConfigurationSource } from "@/lib/auth0-management-api-configuration";
import { Auth0ManagementApiIdentityStatusClient } from "@/lib/auth0-management-api-identity-status-client";
import { Auth0ExternalIdentityProviderAdapter } from "@/lib/auth0-external-identity-provider-adapter";
import { PostgresJurisprudenceRoleAssignmentRepository } from "@/lib/authorization/postgres-jurisprudence-role-assignment-repository";
import { ProviderBackedJurisprudenceAuthenticator } from "@/lib/provider-backed-jurisprudence-authenticator";
import { getWorkspaceSession } from "@/lib/auth/session";
import type { JurisprudenceAuthenticator } from "@/types/jurisprudence-security";

export interface JurisprudenceAuthenticationRuntime {
  readonly authenticator: JurisprudenceAuthenticator;
  close(): Promise<void>;
}

export type JurisprudenceAuthenticationRuntimeResult =
  | { readonly status: "configured"; readonly runtime: JurisprudenceAuthenticationRuntime }
  | { readonly status: "not_configured" }
  | { readonly status: "invalid"; readonly reason: string };

export function createJurisprudenceAuthenticationRuntime(
  authConfigSource: AuthenticationConfigurationSource = process.env,
  managementConfigSource: Auth0ManagementApiConfigurationSource = process.env,
  options?: {
    now?: () => string;
    fetch?: typeof globalThis.fetch;
    getSession?: typeof getWorkspaceSession;
  }
): JurisprudenceAuthenticationRuntimeResult {
  const authConfig = loadAuthenticationConfiguration(authConfigSource);
  if (authConfig.status !== "configured" && authConfig.status !== "configured_for_test") {
    if (authConfig.status === "not_configured") return { status: "not_configured" };
    if (authConfig.status === "invalid") return { status: "invalid", reason: authConfig.reason };
    return { status: "invalid", reason: "unavailable" };
  }

  const managementConfig = loadAuth0ManagementApiConfiguration(managementConfigSource);
  if (managementConfig.status !== "configured") {
    if (managementConfig.status === "not_configured") return { status: "not_configured" };
    return { status: "invalid", reason: managementConfig.reason };
  }

  const now = options?.now ?? (() => new Date().toISOString());
  const fetchImpl = options?.fetch;
  const getSession = options?.getSession ?? getWorkspaceSession;

  const statusClient = new Auth0ManagementApiIdentityStatusClient(managementConfig, fetchImpl ? { fetch: fetchImpl } : undefined);
  const providerAdapter = new Auth0ExternalIdentityProviderAdapter(authConfig, statusClient, getSession);
  const roleRepository = new PostgresJurisprudenceRoleAssignmentRepository();

  const authenticator = new ProviderBackedJurisprudenceAuthenticator({
    configuration: authConfig,
    provider: providerAdapter,
    roles: roleRepository,
    now,
  });

  let closed = false;

  return {
    status: "configured",
    runtime: {
      authenticator,
      async close() {
        if (closed) return;
        closed = true;
        await authenticator.close();
      },
    },
  };
}
