import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

export function createPageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  const canonical = new URL(path, siteConfig.url).toString();
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      locale: "es_PE",
      url: canonical,
      siteName: siteConfig.name,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
