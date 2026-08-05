import { NextResponse, type NextRequest } from "next/server";
import { buildLoginRedirect, sanitizeWorkspaceReturnTo } from "@/lib/auth/return-to";
import { getWorkspaceSession } from "@/lib/auth/session";

export function middleware(request: NextRequest) {
  const session = getWorkspaceSession();
  if (session.status === "authenticated") return NextResponse.next();
  const returnTo = sanitizeWorkspaceReturnTo(request.nextUrl.pathname);
  return NextResponse.redirect(new URL(buildLoginRedirect(returnTo), request.url));
}

export const config = { matcher: ["/app/:path*"] };
