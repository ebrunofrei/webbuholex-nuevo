import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseEnvConfig {
  readonly url: string;
  readonly anonKey: string;
}

/**
 * Validates and extracts public Supabase credentials from environment.
 * Fails closed if missing or invalid. Never accesses service-role keys.
 */
export function getSupabaseEnv(env: Record<string, string | undefined> = process.env): SupabaseEnvConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
  } catch {
    return null;
  }

  return { url, anonKey };
}

/**
 * Creates a server-side Supabase client for Server Components and Route Handlers.
 * Uses Next.js App Router cookies() for SSR session handling.
 * Returns null if Supabase environment is unconfigured.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const config = getSupabaseEnv();
  if (!config) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Can happen in Server Components; safe to ignore when middleware handles refresh
        }
      },
    },
  });
}

export interface SupabaseMiddlewareResult {
  readonly supabase: SupabaseClient | null;
  readonly response: NextResponse;
}

/**
 * Creates a Supabase client configured for Next.js Middleware.
 * Synchronizes auth cookies between the request and the response.
 */
export function createSupabaseMiddlewareClient(
  request: NextRequest,
  response: NextResponse
): SupabaseMiddlewareResult {
  const config = getSupabaseEnv();
  if (!config) {
    return { supabase: null, response };
  }

  const mutatedResponse = response;

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          mutatedResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  return { supabase, response: mutatedResponse };
}
