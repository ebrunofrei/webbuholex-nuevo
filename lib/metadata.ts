import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

export interface PageMetadataOptions {
  noindex?: boolean;
  nofollow?: boolean;
}

export function buildCanonicalUrl(pathOrUrl: string): string {
  try {
    const url = new URL(pathOrUrl, siteConfig.url);
    const cleanPath = url.pathname.replace(/\/+$/, "");
    return cleanPath ? `${siteConfig.url}${cleanPath}` : siteConfig.url;
  } catch {
    return siteConfig.url;
  }
}

export function createPageMetadata(
  title: string,
  description: string,
  path: string,
  options?: PageMetadataOptions,
): Metadata {
  const canonical = buildCanonicalUrl(path);
  const isNoIndex = options?.noindex ?? false;
  const isNoFollow = options?.nofollow ?? false;
  const isFollow = !isNoFollow;

  return {
    title,
    description,
    alternates: { canonical },
    robots: isNoIndex
      ? {
          index: false,
          follow: isFollow,
          ...(!isFollow ? { noarchive: true } : {}),
        }
      : {
          index: true,
          follow: isFollow,
          googleBot: {
            index: true,
            follow: isFollow,
          },
        },
    openGraph: {
      type: "website",
      locale: "es_PE",
      url: canonical,
      siteName: siteConfig.name,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
