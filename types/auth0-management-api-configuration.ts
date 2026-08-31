export interface Auth0ManagementApiRuntimeConfig {
  readonly domain: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly audience: string;
  readonly scope: "read:users";
}

export type Auth0ManagementApiConfiguration =
  | ({ readonly status: "configured" } & Auth0ManagementApiRuntimeConfig)
  | { readonly status: "not_configured" }
  | { readonly status: "invalid"; readonly reason: "missing_field" | "invalid_domain" };
