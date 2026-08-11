import { NextResponse, type NextRequest } from "next/server";
import { buildLoginRedirect, sanitizeWorkspaceReturnTo } from "@/lib/auth/return-to";
import { auth0 } from "@/lib/auth/auth0";
import { mergeAuth0ResponseHeaders } from "@/lib/auth/merge-auth0-response";

export async function middleware(request: NextRequest) {
  // 1. Ejecutar middleware de IdP para manejar rutas mágicas y rolling sessions
  const authResponse = await auth0.middleware(request);

  // 2. Si la ruta pertenece exclusivamente al dominio del IdP, terminar anticipadamente
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    return authResponse;
  }

  // 3. Evaluar protección interna BúhoLex
  if (request.nextUrl.pathname.startsWith('/app')) {
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
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"
  ]
};
