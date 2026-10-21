import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/auth/supabase-server";
import { getAuthProvider } from "@/lib/auth/provider";
import { sanitizeWorkspaceReturnTo } from "@/lib/auth/return-to";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const rawReturnTo = requestUrl.searchParams.get("returnTo");
  const returnTo =
    rawReturnTo === "/iniciar-sesion" || rawReturnTo === "/iniciar-sesion/"
      ? "/iniciar-sesion"
      : sanitizeWorkspaceReturnTo(rawReturnTo);

  const redirectResponse = NextResponse.redirect(new URL(returnTo, request.url));

  if (getAuthProvider() !== "supabase") {
    return redirectResponse;
  }

  const env = getSupabaseEnv();
  if (!env) {
    return redirectResponse;
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          redirectResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    await supabase.auth.signOut();
  } catch {
    // Fail-safe: proceed with redirect and whatever cookies were cleared
  }

  return redirectResponse;
}
