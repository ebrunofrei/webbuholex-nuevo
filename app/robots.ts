import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

/**
 * NOTA DE SEGURIDAD Y GOBERNANZA:
 * robots.txt NO constituye un mecanismo de seguridad para proteger información privada ni confidencial.
 * La protección real se garantiza mediante autenticación estricta (Supabase Auth/Auth0),
 * autorización basada en roles (RBAC), cabeceras X-Robots-Tag: noindex, nofollow, noarchive
 * y la ausencia de datos privados en cualquier respuesta pública del servidor.
 * Las directivas Disallow aquí declaradas tienen como único fin optimizar el presupuesto
 * de rastreo (crawl budget) de los motores de búsqueda.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/app/",
        "/admin/",
        "/editorial/",
        "/api/",
        "/auth/",
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
