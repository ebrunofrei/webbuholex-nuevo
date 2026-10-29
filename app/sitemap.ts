import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
import { publicServices } from "@/data/services";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/servicios`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/jurisprudencia`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/consulta-profesional`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/nosotros`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contacto`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/explorar`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacidad`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terminos`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cookies`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/libro-de-reclamaciones`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const serviceEntries: MetadataRoute.Sitemap = publicServices
    .filter((service) => service.status === "active" && service.published !== false)
    .map((service) => ({
      url: `${baseUrl}/servicios/${service.slug}`,
      changeFrequency: "monthly",
      priority: 0.8,
    }));

  return [...staticEntries, ...serviceEntries];
}
