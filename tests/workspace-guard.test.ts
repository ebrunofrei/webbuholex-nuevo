import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { buildLoginRedirect, sanitizeWorkspaceReturnTo } from "@/lib/auth/return-to";
import { getWorkspaceSession } from "@/lib/auth/session";
import { evaluateWorkspaceAccess } from "@/lib/auth/workspace-guard";
import { auth0 } from "@/lib/auth/auth0";

vi.mock("@/lib/auth/auth0", () => ({
  auth0: {
    getSession: vi.fn().mockResolvedValue(null)
  }
}));

const privateRoutes = ["app", "asistente", "proyectos", "jurisprudencia", "documentos", "automatizaciones", "biblioteca", "productos", "servicios", "cuenta"] as const;

describe("guard del espacio privado", () => {
  it("mantiene autenticación sin configurar y sin identidad simulada", async () => {
    vi.mocked(auth0.getSession).mockResolvedValueOnce(null);
    const session = await getWorkspaceSession();
    expect(session.status).toBe("not_configured");
    expect(session.sessionId).toBeNull();
    expect(session.providerSubjectId).toBeNull();
    expect(session.provider).toBeNull();
  });

  it("redirige /app y conserva una subruta privada segura", async () => {
    vi.mocked(auth0.getSession).mockResolvedValue(null);
    expect(await evaluateWorkspaceAccess("/app")).toMatchObject({ allowed: false, status: "not_configured", returnTo: "/app" });
    expect((await evaluateWorkspaceAccess("/app/asistente")).redirectTo).toBe(buildLoginRedirect("/app/asistente"));
  });

  it("bloquea open redirects y rutas ajenas al workspace", () => {
    for (const unsafe of ["https://evil.test", "//evil.test", "/\\evil.test", "/explorar", "/app/../evil", "/app/%2f%2fevil.test", "javascript:alert(1)"]) expect(sanitizeWorkspaceReturnTo(unsafe)).toBe("/app");
    const parsed = new URL(buildLoginRedirect("https://evil.test"), "https://buholex.test");
    expect(parsed.origin).toBe("https://buholex.test");
    expect(parsed.searchParams.get("returnTo")).toBe("/app");
  });

  it("reserva las diez rutas y aplica el guard antes del shell", () => {
    for (const route of privateRoutes) { const file = route === "app" ? "app/app/page.tsx" : `app/app/${route}/page.tsx`; expect(existsSync(file)).toBe(true); }
    const layout = readFileSync("app/app/layout.tsx", "utf8");
    expect(layout.indexOf("requireWorkspaceSession")).toBeLessThan(layout.indexOf("<WorkspaceShell>"));
    const middleware = readFileSync("middleware.ts", "utf8");
    expect(middleware).toContain('"/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"');
  });
});
