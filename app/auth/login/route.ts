import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/auth/supabase-server";
import { getAuthProvider } from "@/lib/auth/provider";
import { sanitizeWorkspaceReturnTo, buildLoginRedirect } from "@/lib/auth/return-to";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const returnTo = sanitizeWorkspaceReturnTo(requestUrl.searchParams.get("returnTo"));

  if (getAuthProvider() !== "supabase") {
    return NextResponse.redirect(new URL(buildLoginRedirect(returnTo), request.url));
  }

  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.redirect(new URL(buildLoginRedirect(returnTo), request.url));
  }

  const callbackUrl = new URL(
    `/auth/callback?${new URLSearchParams({ returnTo }).toString()}`,
    request.url
  ).toString();

  let targetUrl = buildLoginRedirect(returnTo);
  let isOAuthSuccess = false;

  // Temporary response to capture cookies set during signInWithOAuth (e.g. PKCE verifier)
  const pendingCookies: Array<{ name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }> = [];

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
          pendingCookies.push({ name, value, options });
        });
      },
    },
  });

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
      },
    });

    if (!error && data?.url) {
      targetUrl = data.url;
      isOAuthSuccess = true;
    }
  } catch {
    targetUrl = buildLoginRedirect(returnTo);
    isOAuthSuccess = false;
  }

  const response = isOAuthSuccess
    ? NextResponse.redirect(targetUrl)
    : NextResponse.redirect(new URL(targetUrl, request.url));

  pendingCookies.forEach(({ name, value, options }) => {
    if (options) {
      response.cookies.set(name, value, options);
    } else {
      response.cookies.set(name, value);
    }
  });

  return response;
}
