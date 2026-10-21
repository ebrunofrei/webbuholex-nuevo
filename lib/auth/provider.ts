export type AuthProviderName = "auth0" | "supabase";

/**
 * Resolves the active authentication provider name from the environment.
 * Default is "auth0". Only returns "supabase" if explicitly configured.
 */
export function getAuthProvider(env: Record<string, string | undefined> = process.env): AuthProviderName {
  const configured = env.AUTH_PROVIDER?.trim().toLowerCase();
  if (configured === "supabase") {
    return "supabase";
  }
  return "auth0";
}
