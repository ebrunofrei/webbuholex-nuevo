import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/auth/supabase-server";
import { getAuthProvider } from "@/lib/auth/provider";
import { sanitizeWorkspaceReturnTo, buildLoginRedirect } from "@/lib/auth/return-to";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const returnTo = sanitizeWorkspaceReturnTo(requestUrl.searchParams.get("returnTo"));

  if (getAuthProvider() !== "supabase") {
    return NextResponse.redirect(new URL(buildLoginRedirect(returnTo), request.url));
  }

  const env = getSupabaseEnv();
  if (!env || !code) {
    return NextResponse.redirect(new URL(buildLoginRedirect(returnTo), request.url));
  }

  const redirectResponse = NextResponse.redirect(new URL(returnTo, request.url));

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(buildLoginRedirect(returnTo), request.url));
  }

  return redirectResponse;
}
