import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
import { publicServices } from "@/data/services";
const paths = ["/", "/explorar/", "/espacio/", "/servicios/", "/asistente/", "/consulta-profesional/", "/plantillas/", "/plantillas/legales/", "/plantillas/empresariales/", "/plantillas/contables/", "/jurisprudencia/", "/codigos/", "/biblioteca/", "/blog/", "/nosotros/", "/contacto/"] as const;
export default function sitemap(): MetadataRoute.Sitemap { return [...paths, ...publicServices.map((service) => `/servicios/${service.slug}/` as const)].map((path) => ({ url: new URL(path, siteConfig.url).toString(), changeFrequency: path === "/" ? "weekly" : "monthly", priority: path === "/" ? 1 : .6 })); }
