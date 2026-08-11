import { NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import { mergeAuth0ResponseHeaders } from "@/lib/auth/merge-auth0-response";

describe("mergeAuth0ResponseHeaders", () => {
  it("A. Set-Cookie único se preserva", () => {
    const authResponse = new Response();
    authResponse.headers.append("Set-Cookie", "session=123");
    const targetResponse = NextResponse.next();
    mergeAuth0ResponseHeaders(authResponse, targetResponse);
    expect(targetResponse.headers.get("Set-Cookie")).toBe("session=123");
  });

  it("B. múltiples Set-Cookie se preservan", () => {
    const authResponse = new Response();
    authResponse.headers.append("Set-Cookie", "session=123");
    authResponse.headers.append("Set-Cookie", "csrf=456");
    const targetResponse = NextResponse.next();
    mergeAuth0ResponseHeaders(authResponse, targetResponse);
    // targetResponse.headers.get("Set-Cookie") returns the joined string in node/next
    expect(targetResponse.headers.get("Set-Cookie")).toContain("session=123");
    expect(targetResponse.headers.get("Set-Cookie")).toContain("csrf=456");
  });

  it("C. header no-cookie de authResponse se preserva", () => {
    const authResponse = new Response();
    authResponse.headers.append("x-auth0-state", "active");
    const targetResponse = NextResponse.next();
    mergeAuth0ResponseHeaders(authResponse, targetResponse);
    expect(targetResponse.headers.get("x-auth0-state")).toBe("active");
  });

  it("D. x-middleware-next NO se propaga a redirect terminante", () => {
    const authResponse = new Response();
    authResponse.headers.append("x-middleware-next", "1");
    // target is a terminating redirect (status 307)
    const targetResponse = NextResponse.redirect("https://buholex.com/login");
    mergeAuth0ResponseHeaders(authResponse, targetResponse);
    expect(targetResponse.headers.get("x-middleware-next")).toBeNull();
  });

  it("E. Location del redirect BúhoLex no se sobrescribe", () => {
    const authResponse = new Response();
    authResponse.headers.append("Location", "https://auth0.com/login");
    const targetResponse = NextResponse.redirect("https://buholex.com/login");
    mergeAuth0ResponseHeaders(authResponse, targetResponse);
    // targetResponse already had Location, the merge will append it.
    // In next.js, Location header behavior on append might just be a comma separated list.
    // Wait, the user said "El merge no debe cambiar la URL de redirección"
    // Let's verify what happens.
    // We should expect the initial redirect location to still be what was initially set.
    expect(targetResponse.headers.get("Location")).toContain("https://buholex.com/login");
  });

  it("F. status del redirect BúhoLex no se sobrescribe", () => {
    const authResponse = new Response(null, { status: 200 });
    const targetResponse = NextResponse.redirect("https://buholex.com/login", 307);
    mergeAuth0ResponseHeaders(authResponse, targetResponse);
    expect(targetResponse.status).toBe(307);
  });

  it("G. Location exclusivo de BúhoLex en redirects terminantes", () => {
    const authResponse = new Response();
    authResponse.headers.append("Location", "/auth/something");
    const targetResponse = NextResponse.redirect(new URL("https://buholex.com/iniciar-sesion?returnTo=/app"));
    mergeAuth0ResponseHeaders(authResponse, targetResponse);
    expect(targetResponse.headers.get("Location")).toBe("https://buholex.com/iniciar-sesion?returnTo=/app");
  });

  it("H. No copiar Content-Length desde authResponse a respuesta terminante", () => {
    const authResponse = new Response();
    authResponse.headers.append("Content-Length", "123");
    const targetResponse = NextResponse.redirect(new URL("https://buholex.com/iniciar-sesion?returnTo=/app"));
    mergeAuth0ResponseHeaders(authResponse, targetResponse);
    expect(targetResponse.headers.has("Content-Length")).toBe(false);
  });

  it("I. x-middleware-next sigue excluido", () => {
    const authResponse = new Response();
    authResponse.headers.append("x-middleware-next", "1");
    const targetResponse = NextResponse.redirect(new URL("https://buholex.com/login"));
    mergeAuth0ResponseHeaders(authResponse, targetResponse);
    expect(targetResponse.headers.has("x-middleware-next")).toBe(false);
  });

  it("J. Set-Cookie sigue preservándose", () => {
    const authResponse = new Response();
    authResponse.headers.append("Set-Cookie", "session=123");
    const targetResponse = NextResponse.redirect(new URL("https://buholex.com/login"));
    mergeAuth0ResponseHeaders(authResponse, targetResponse);
    expect(targetResponse.headers.get("Set-Cookie")).toBe("session=123");
  });
});
