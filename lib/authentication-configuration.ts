import { authenticationConfigurationSchema } from "@/lib/schemas/authentication-configuration";
import type { AuthenticationConfiguration } from "@/types/authentication-configuration";

export type AuthenticationConfigurationSource = Readonly<Record<string, string | undefined>>;

function splitOrigins(value: string | undefined): readonly string[] {
  return value === undefined ? [] : value.split(",").map((origin) => origin.trim()).filter(Boolean);
}

function integer(value: string | undefined): number {
  return value === undefined ? Number.NaN : Number(value);
}

export function parseAuthenticationConfiguration(input: unknown): AuthenticationConfiguration {
  return authenticationConfigurationSchema.parse(input);
}

export function loadAuthenticationConfiguration(source: AuthenticationConfigurationSource): AuthenticationConfiguration {
  if (source.AUTH_PROVIDER_KIND === undefined) return { status: "not_configured" };

  const required = [
    "AUTH_ISSUER",
    "AUTH_CLIENT_ID",
    "AUTH_AUDIENCE",
    "AUTH_COOKIE_NAME",
    "AUTH_ABSOLUTE_TTL_SECONDS",
    "AUTH_IDLE_TTL_SECONDS",
    "AUTH_ALLOWED_ORIGINS",
    "AUTH_ENVIRONMENT",
    "AUTH_CLIENT_SECRET_REFERENCE",
    "AUTH_SESSION_SECRET_REFERENCE",
  ] as const;
  if (required.some((key) => source[key] === undefined || source[key]?.trim() === "")) {
    return { status: "invalid", reason: "missing_field" };
  }

  const environment = source.AUTH_ENVIRONMENT;
  const candidate = {
    status: environment === "test" ? "configured_for_test" : "configured",
    providerKind: source.AUTH_PROVIDER_KIND,
    issuer: source.AUTH_ISSUER,
    clientId: source.AUTH_CLIENT_ID,
    audience: source.AUTH_AUDIENCE,
    sessionStrategy: "stateful",
    cookie: {
      name: source.AUTH_COOKIE_NAME,
      httpOnly: true,
      secure: source.AUTH_COOKIE_SECURE !== "false",
      sameSite: source.AUTH_COOKIE_SAME_SITE ?? "lax",
      path: "/",
    },
    absoluteTtlSeconds: integer(source.AUTH_ABSOLUTE_TTL_SECONDS),
    idleTtlSeconds: integer(source.AUTH_IDLE_TTL_SECONDS),
    allowedOrigins: splitOrigins(source.AUTH_ALLOWED_ORIGINS),
    environment,
    roleSource: "internal_repository",
    clientSecretReference: { kind: "environment", key: source.AUTH_CLIENT_SECRET_REFERENCE },
    sessionSecretReference: { kind: "environment", key: source.AUTH_SESSION_SECRET_REFERENCE },
  };
  const parsed = authenticationConfigurationSchema.safeParse(candidate);
  return parsed.success
    ? parsed.data
    : { status: "invalid", reason: "invalid_value" };
}
