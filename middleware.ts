import { NextResponse, type NextRequest } from "next/server";
import { buildLoginRedirect, sanitizeWorkspaceReturnTo } from "@/lib/auth/return-to";
import { getAuthProvider } from "@/lib/auth/provider";
import { auth0 } from "@/lib/auth/auth0";
import { mergeAuth0ResponseHeaders } from "@/lib/auth/merge-auth0-response";
import { createSupabaseMiddlewareClient, getSupabaseEnv } from "@/lib/auth/supabase-server";

export function matchesRoutePrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

const PRIVATE_ROBOTS_PREFIXES = [
  "/app",
  "/admin",
  "/editorial",
  "/api",
  "/auth",
] as const;

function isPrivateRobotsPath(pathname: string): boolean {
  return PRIVATE_ROBOTS_PREFIXES.some((prefix) => matchesRoutePrefix(pathname, prefix));
}

function applyPrivateRobotsHeaders(pathname: string, response: NextResponse): NextResponse {
  if (isPrivateRobotsPath(pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const provider = getAuthProvider();

  let response: NextResponse;
  if (provider === "supabase") {
    response = await handleSupabaseMiddleware(request);
  } else {
    response = await handleAuth0Middleware(request);
  }

  return applyPrivateRobotsHeaders(request.nextUrl.pathname, response);
}

async function handleAuth0Middleware(request: NextRequest): Promise<NextResponse> {
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/app');
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth/');

  try {
    // 1. Ejecutar middleware de IdP para manejar rutas mágicas y rolling sessions
    const authResponse = await auth0.middleware(request);

    // 2. Si la ruta pertenece exclusivamente al dominio del IdP, terminar anticipadamente
    if (isAuthRoute) {
      return authResponse;
    }

    // 3. Evaluar protección interna BúhoLex
    if (isProtectedRoute) {
      const session = await auth0.getSession(request);

      if (!session) {
        // 4. Crear redirect seguro hacia experiencia de login propia
        const returnTo = sanitizeWorkspaceReturnTo(request.nextUrl.pathname);
        const targetResponse = NextResponse.redirect(new URL(buildLoginRedirect(returnTo), request.url));

        // 5. Preservar estado del SDK
        mergeAuth0ResponseHeaders(authResponse, targetResponse);

        return targetResponse;
      }
    }

    // 6. Acceso permitido (Ruta pública o sesión válida)
    return authResponse;
  } catch {
    // Si la configuración del proveedor no está disponible o falla:
    // Para rutas protegidas: fallar cerrado
    if (isProtectedRoute) {
      const returnTo = sanitizeWorkspaceReturnTo(request.nextUrl.pathname);
      return NextResponse.redirect(new URL(buildLoginRedirect(returnTo), request.url));
    }

    // Para rutas públicas: no tumbar el sitio
    return NextResponse.next();
  }
}

async function handleSupabaseMiddleware(request: NextRequest): Promise<NextResponse> {
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/app');

  const env = getSupabaseEnv();
  if (!env) {
    if (isProtectedRoute) {
      const returnTo = sanitizeWorkspaceReturnTo(request.nextUrl.pathname);
      return NextResponse.redirect(new URL(buildLoginRedirect(returnTo), request.url));
    }
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });
  const { supabase, response: updatedResponse } = createSupabaseMiddlewareClient(request, response);
  if (!supabase) {
    if (isProtectedRoute) {
      const returnTo = sanitizeWorkspaceReturnTo(request.nextUrl.pathname);
      return NextResponse.redirect(new URL(buildLoginRedirect(returnTo), request.url));
    }
    return response;
  }

  try {
    const { data } = await supabase.auth.getUser();

    if (isProtectedRoute && !data.user) {
      const returnTo = sanitizeWorkspaceReturnTo(request.nextUrl.pathname);
      return NextResponse.redirect(new URL(buildLoginRedirect(returnTo), request.url));
    }

    return updatedResponse;
  } catch {
    if (isProtectedRoute) {
      const returnTo = sanitizeWorkspaceReturnTo(request.nextUrl.pathname);
      return NextResponse.redirect(new URL(buildLoginRedirect(returnTo), request.url));
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"
  ]
};
