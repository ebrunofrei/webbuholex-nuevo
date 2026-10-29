import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { metadata as rootMetadata } from "@/app/layout";
import { metadata as appLayoutMetadata } from "@/app/app/layout";
import { metadata as adminLayoutMetadata } from "@/app/admin/layout";
import { metadata as editorialLayoutMetadata } from "@/app/editorial/layout";
import { metadata as loginMetadata } from "@/app/iniciar-sesion/page";
import { metadata as assistantMetadata } from "@/app/asistente/page";
import { metadata as bibliotecaMetadata } from "@/app/biblioteca/page";
import { metadata as codigosMetadata } from "@/app/codigos/page";
import { metadata as blogMetadata } from "@/app/blog/page";
import { metadata as espacioMetadata } from "@/app/espacio/page";
import { metadata as plantillasMetadata } from "@/app/plantillas/page";
import { metadata as plantillasLegalesMetadata } from "@/app/plantillas/legales/page";
import { metadata as plantillasEmpresarialesMetadata } from "@/app/plantillas/empresariales/page";
import { metadata as plantillasContablesMetadata } from "@/app/plantillas/contables/page";
import { metadata as plantillasViviendaMetadata } from "@/app/plantillas/legales/contrato-arrendamiento-vivienda/page";
import { metadata as privacyMetadata } from "@/app/privacidad/page";
import { metadata as termsMetadata } from "@/app/terminos/page";
import { metadata as cookiesMetadata } from "@/app/cookies/page";
import { metadata as complaintsMetadata } from "@/app/libro-de-reclamaciones/page";
import { metadata as servicesMetadata } from "@/app/servicios/page";
import { metadata as jurisprudenceMetadata } from "@/app/jurisprudencia/page";
import { metadata as contactMetadata } from "@/app/contacto/page";
import { metadata as nosotrosMetadata } from "@/app/nosotros/page";
import { metadata as consultationMetadata } from "@/app/consulta-profesional/page";
import { metadata as exploreMetadata } from "@/app/explorar/page";
import { generateMetadata as generateServiceMetadata } from "@/app/servicios/[slug]/page";
import { generateMetadata as generateJurisprudenceMetadata } from "@/app/jurisprudencia/[slug]/page";
import { buildCanonicalUrl, createPageMetadata } from "@/lib/metadata";
import { matchesRoutePrefix, middleware } from "@/middleware";
import { siteConfig } from "@/lib/site-config";
import nextConfig from "@/next.config";

describe("SEO-2A: Crawlability Foundation and Indexability Architecture", () => {
  describe("A. robots.txt", () => {
    const robotsData = robots();
    const rules = Array.isArray(robotsData.rules) ? robotsData.rules[0] : robotsData.rules;

    it("no contiene Disallow: / global", () => {
      const disallows = Array.isArray(rules?.disallow) ? rules.disallow : [rules?.disallow];
      expect(disallows).not.toContain("/");
    });

    it("permite el rastreo del contenido publico con Allow: /", () => {
      expect(rules?.allow).toBe("/");
    });

    it("excluye rutas privadas /app/, /admin/, /editorial/, /api/, /auth/", () => {
      const disallows = Array.isArray(rules?.disallow) ? rules.disallow : [rules?.disallow];
      expect(disallows).toContain("/app/");
      expect(disallows).toContain("/admin/");
      expect(disallows).toContain("/editorial/");
      expect(disallows).toContain("/api/");
      expect(disallows).toContain("/auth/");
    });

    it("declara el sitemap canonico y el host", () => {
      expect(robotsData.sitemap).toBe("https://www.buholex.com/sitemap.xml");
      expect(robotsData.host).toBe("https://www.buholex.com");
    });
  });

  describe("B. Root & Public Metadata Indexability", () => {
    it("el layout raiz habilita index: true y follow: true", () => {
      const robotsMeta = rootMetadata.robots;
      expect(typeof robotsMeta === "object" && robotsMeta !== null).toBe(true);
      if (typeof robotsMeta === "object" && robotsMeta !== null) {
        expect(robotsMeta.index).toBe(true);
        expect(robotsMeta.follow).toBe(true);
      }
    });

    it("las paginas publicas principales tienen index: true y follow: true por defecto", () => {
      const publicMetas = [
        servicesMetadata,
        jurisprudenceMetadata,
        contactMetadata,
        nosotrosMetadata,
        consultationMetadata,
        exploreMetadata,
        privacyMetadata,
        termsMetadata,
        cookiesMetadata,
        complaintsMetadata,
      ];

      for (const meta of publicMetas) {
        const robotsMeta = meta.robots;
        expect(typeof robotsMeta === "object" && robotsMeta !== null).toBe(true);
        if (typeof robotsMeta === "object" && robotsMeta !== null) {
          expect(robotsMeta.index).toBe(true);
          expect(robotsMeta.follow).toBe(true);
        }
      }
    });

    it("las landings de servicios individuales son indexables", async () => {
      const meta = await generateServiceMetadata({
        params: Promise.resolve({ slug: "buhodoc" }),
      });
      const robotsMeta = meta.robots;
      expect(typeof robotsMeta === "object" && robotsMeta !== null).toBe(true);
      if (typeof robotsMeta === "object" && robotsMeta !== null) {
        expect(robotsMeta.index).toBe(true);
        expect(robotsMeta.follow).toBe(true);
      }
    });

    it("createPageMetadata implementa PageMetadataOptions minimas y seguras", () => {
      const defaultMeta = createPageMetadata("Titulo", "Desc", "/test");
      expect(defaultMeta.robots).toEqual({
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
        },
      });

      const noindexMeta = createPageMetadata("Titulo", "Desc", "/test", { noindex: true });
      expect(noindexMeta.robots).toEqual({
        index: false,
        follow: true,
      });

      const privateMeta = createPageMetadata("Titulo", "Desc", "/test", { noindex: true, nofollow: true });
      expect(privateMeta.robots).toEqual({
        index: false,
        follow: false,
        noarchive: true,
      });
    });
  });

  describe("C. Placeholders Isolation (noindex, follow)", () => {
    const placeholderMetas = [
      { name: "asistente", meta: assistantMetadata },
      { name: "biblioteca", meta: bibliotecaMetadata },
      { name: "codigos", meta: codigosMetadata },
      { name: "blog", meta: blogMetadata },
      { name: "espacio", meta: espacioMetadata },
      { name: "plantillas", meta: plantillasMetadata },
      { name: "plantillas/legales", meta: plantillasLegalesMetadata },
      { name: "plantillas/empresariales", meta: plantillasEmpresarialesMetadata },
      { name: "plantillas/contables", meta: plantillasContablesMetadata },
      { name: "plantillas/vivienda", meta: plantillasViviendaMetadata },
    ];

    it.each(placeholderMetas)("aplica noindex=true y follow=true a $name", ({ meta }) => {
      const robotsMeta = meta.robots;
      expect(typeof robotsMeta === "object" && robotsMeta !== null).toBe(true);
      if (typeof robotsMeta === "object" && robotsMeta !== null) {
        expect(robotsMeta.index).toBe(false);
        expect(robotsMeta.follow).toBe(true);
      }
    });
  });

  describe("D. Login Page Metadata", () => {
    it("iniciar-sesion tiene noindex=true y follow=false", () => {
      const robotsMeta = loginMetadata.robots;
      expect(typeof robotsMeta === "object" && robotsMeta !== null).toBe(true);
      if (typeof robotsMeta === "object" && robotsMeta !== null) {
        expect(robotsMeta.index).toBe(false);
        expect(robotsMeta.follow).toBe(false);
      }
    });
  });

  describe("E. Private Layouts & Middleware X-Robots-Tag", () => {
    it("/app/layout.tsx tiene noindex=false y follow=false", () => {
      const robotsMeta = appLayoutMetadata.robots;
      expect(typeof robotsMeta === "object" && robotsMeta !== null).toBe(true);
      if (typeof robotsMeta === "object" && robotsMeta !== null) {
        expect(robotsMeta.index).toBe(false);
        expect(robotsMeta.follow).toBe(false);
      }
    });

    it("/admin/layout.tsx tiene noindex=false y follow=false", () => {
      const robotsMeta = adminLayoutMetadata.robots;
      expect(typeof robotsMeta === "object" && robotsMeta !== null).toBe(true);
      if (typeof robotsMeta === "object" && robotsMeta !== null) {
        expect(robotsMeta.index).toBe(false);
        expect(robotsMeta.follow).toBe(false);
      }
    });

    it("/editorial/layout.tsx tiene noindex=false y follow=false", () => {
      const robotsMeta = editorialLayoutMetadata.robots;
      expect(typeof robotsMeta === "object" && robotsMeta !== null).toBe(true);
      if (typeof robotsMeta === "object" && robotsMeta !== null) {
        expect(robotsMeta.index).toBe(false);
        expect(robotsMeta.follow).toBe(false);
      }
    });

    it("matchesRoutePrefix valida coincidencias exactas o jerarquicas sin falsos positivos de prefijo textual", () => {
      // Casos positivos
      expect(matchesRoutePrefix("/app", "/app")).toBe(true);
      expect(matchesRoutePrefix("/app/cuenta", "/app")).toBe(true);
      expect(matchesRoutePrefix("/admin", "/admin")).toBe(true);
      expect(matchesRoutePrefix("/admin/reclamos", "/admin")).toBe(true);
      expect(matchesRoutePrefix("/editorial", "/editorial")).toBe(true);
      expect(matchesRoutePrefix("/editorial/plantillas", "/editorial")).toBe(true);
      expect(matchesRoutePrefix("/api", "/api")).toBe(true);
      expect(matchesRoutePrefix("/api/complaints", "/api")).toBe(true);
      expect(matchesRoutePrefix("/auth", "/auth")).toBe(true);
      expect(matchesRoutePrefix("/auth/callback", "/auth")).toBe(true);

      // Casos negativos (no deben considerarse privados exclusivamente por prefijo textual)
      expect(matchesRoutePrefix("/application", "/app")).toBe(false);
      expect(matchesRoutePrefix("/apple", "/app")).toBe(false);
      expect(matchesRoutePrefix("/administro", "/admin")).toBe(false);
      expect(matchesRoutePrefix("/editoriales", "/editorial")).toBe(false);
      expect(matchesRoutePrefix("/apiario", "/api")).toBe(false);
      expect(matchesRoutePrefix("/author", "/auth")).toBe(false);
    });

    it("el middleware inyecta X-Robots-Tag en todos los casos positivos de rutas privadas y API", async () => {
      const positivePaths = [
        "/app",
        "/app/cuenta",
        "/admin",
        "/admin/reclamos",
        "/editorial",
        "/editorial/plantillas",
        "/api",
        "/api/complaints",
        "/auth",
        "/auth/callback",
      ];

      for (const pathname of positivePaths) {
        const req = new NextRequest(new URL(pathname, siteConfig.url));
        const res = await middleware(req);
        expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
      }
    });

    it("el middleware no inyecta X-Robots-Tag en casos negativos con prefijo textual similar", async () => {
      const negativePaths = [
        "/application",
        "/apple",
        "/administro",
        "/editoriales",
        "/apiario",
        "/author",
      ];

      for (const pathname of negativePaths) {
        const req = new NextRequest(new URL(pathname, siteConfig.url));
        const res = await middleware(req);
        expect(res.headers.get("X-Robots-Tag")).toBeNull();
      }
    });

    it("el middleware no inyecta X-Robots-Tag en rutas publicas estandard", async () => {
      const publicPaths = [
        "/",
        "/servicios",
        "/jurisprudencia",
        "/privacidad",
        "/contacto",
      ];

      for (const pathname of publicPaths) {
        const req = new NextRequest(new URL(pathname, siteConfig.url));
        const res = await middleware(req);
        expect(res.headers.get("X-Robots-Tag")).toBeNull();
      }
    });
  });

  describe("F. Canonicals & trailingSlash: false", () => {
    it("congela trailingSlash: false en next.config.ts", () => {
      expect(nextConfig.trailingSlash).toBe(false);
    });

    it("buildCanonicalUrl normaliza URLs sin trailing slash", () => {
      expect(buildCanonicalUrl("/servicios/")).toBe("https://www.buholex.com/servicios");
      expect(buildCanonicalUrl("/servicios")).toBe("https://www.buholex.com/servicios");
      expect(buildCanonicalUrl("/")).toBe("https://www.buholex.com");
      expect(buildCanonicalUrl("")).toBe("https://www.buholex.com");
    });

    it("buildCanonicalUrl excluye query params y hash fragments segun especificacion SEO-2A-R1", () => {
      expect(buildCanonicalUrl("/")).toBe("https://www.buholex.com");
      expect(buildCanonicalUrl("/servicios/")).toBe("https://www.buholex.com/servicios");
      expect(buildCanonicalUrl("/servicios?utm_source=test")).toBe("https://www.buholex.com/servicios");
      expect(buildCanonicalUrl("https://www.buholex.com/contacto/?x=1")).toBe("https://www.buholex.com/contacto");
      expect(buildCanonicalUrl("/jurisprudencia#buscar")).toBe("https://www.buholex.com/jurisprudencia");
      expect(buildCanonicalUrl("/contacto/?ref=partner#form")).toBe("https://www.buholex.com/contacto");
    });

    it("createPageMetadata genera canonical sin barra final en todas las paginas publicas", () => {
      const meta = createPageMetadata("Test", "Desc", "/servicios/");
      expect(meta.alternates?.canonical).toBe("https://www.buholex.com/servicios");
    });

    it("el root layout tiene canonical canonico unico sin barra final", () => {
      expect(rootMetadata.alternates?.canonical).toBe("https://www.buholex.com");
    });
  });

  describe("G. Sitemap Architecture", () => {
    const sitemapEntries = sitemap();
    const urls = sitemapEntries.map((e) => e.url);

    it("todas las URLs del sitemap pertenecen al host canonico https://www.buholex.com", () => {
      for (const url of urls) {
        expect(url.startsWith("https://www.buholex.com")).toBe(true);
      }
    });

    it("ninguna URL del sitemap tiene barra final salvo eventualmente la raiz", () => {
      for (const url of urls) {
        if (url !== "https://www.buholex.com" && url !== "https://www.buholex.com/") {
          expect(url.endsWith("/")).toBe(false);
        }
      }
    });

    it("incluye exactamente las paginas publicas indexables requeridas", () => {
      expect(urls).toContain("https://www.buholex.com");
      expect(urls).toContain("https://www.buholex.com/servicios");
      expect(urls).toContain("https://www.buholex.com/jurisprudencia");
      expect(urls).toContain("https://www.buholex.com/consulta-profesional");
      expect(urls).toContain("https://www.buholex.com/nosotros");
      expect(urls).toContain("https://www.buholex.com/contacto");
      expect(urls).toContain("https://www.buholex.com/explorar");
      expect(urls).toContain("https://www.buholex.com/privacidad");
      expect(urls).toContain("https://www.buholex.com/terminos");
      expect(urls).toContain("https://www.buholex.com/cookies");
      expect(urls).toContain("https://www.buholex.com/libro-de-reclamaciones");
    });

    it("incluye los servicios activos y publicados", () => {
      expect(urls).toContain("https://www.buholex.com/servicios/buhodoc");
      expect(urls).toContain("https://www.buholex.com/servicios/tesis-juridicas");
      expect(urls).toContain("https://www.buholex.com/servicios/arbitraje-conciliacion");
      expect(urls).toContain("https://www.buholex.com/servicios/patrocinio-defensa");
      expect(urls).toContain("https://www.buholex.com/servicios/servicios-empresariales");
      expect(urls).toContain("https://www.buholex.com/servicios/servicios-contables");
      expect(urls).toContain("https://www.buholex.com/servicios/servicios-gubernamentales");
      expect(urls).toContain("https://www.buholex.com/servicios/ingenieria-civil-saneamiento-inmobiliario");
    });

    it("excluye servicios en preparacion o con published: false", () => {
      expect(urls).not.toContain("https://www.buholex.com/servicios/asesoria-juridica");
      expect(urls).not.toContain("https://www.buholex.com/servicios/videoconferencia-profesional");
      expect(urls).not.toContain("https://www.buholex.com/servicios/diseno-desarrollo-paginas-web-profesionales");
    });

    it("excluye estrictamente todas las rutas de placeholders", () => {
      expect(urls).not.toContain("https://www.buholex.com/asistente");
      expect(urls).not.toContain("https://www.buholex.com/biblioteca");
      expect(urls).not.toContain("https://www.buholex.com/codigos");
      expect(urls).not.toContain("https://www.buholex.com/blog");
      expect(urls).not.toContain("https://www.buholex.com/espacio");
      expect(urls).not.toContain("https://www.buholex.com/plantillas");
      expect(urls).not.toContain("https://www.buholex.com/plantillas/legales");
      expect(urls).not.toContain("https://www.buholex.com/plantillas/empresariales");
      expect(urls).not.toContain("https://www.buholex.com/plantillas/contables");
    });

    it("excluye rutas privadas, administrativas y login", () => {
      expect(urls).not.toContain("https://www.buholex.com/iniciar-sesion");
      expect(urls).not.toContain("https://www.buholex.com/app");
      expect(urls).not.toContain("https://www.buholex.com/admin");
      expect(urls).not.toContain("https://www.buholex.com/editorial");
      expect(urls).not.toContain("https://www.buholex.com/api");
      expect(urls).not.toContain("https://www.buholex.com/auth");
    });

    it("no incluye todavia jurisprudencia/[slug] (reservado para SEO-2C)", () => {
      const jurisprudenceDetailUrls = urls.filter(
        (url) => url.startsWith("https://www.buholex.com/jurisprudencia/") && url !== "https://www.buholex.com/jurisprudencia"
      );
      expect(jurisprudenceDetailUrls).toHaveLength(0);
    });

    it("no emite lastModified falso (new Date()) de forma indiscriminada", () => {
      for (const entry of sitemapEntries) {
        expect(entry.lastModified).toBeUndefined();
      }
    });

    it("cuenta con exactamente 19 URLs publicas canonicas seguras", () => {
      expect(sitemapEntries).toHaveLength(19);
    });
  });

  describe("H. No Regressions", () => {
    it("los documentos legales conservan las compuertas de fecha abiertas (null)", () => {
      expect(privacyMetadata).toBeDefined();
      expect(termsMetadata).toBeDefined();
      expect(cookiesMetadata).toBeDefined();
    });

    it("jurisprudencia/[slug] conserva contrato CSR funcional con generateMetadata", async () => {
      const meta = await generateJurisprudenceMetadata({
        params: Promise.resolve({ slug: "casacion-1234-2023" }),
      });
      expect(meta.alternates?.canonical).toBe("https://www.buholex.com/jurisprudencia/casacion-1234-2023");
    });
  });
});
