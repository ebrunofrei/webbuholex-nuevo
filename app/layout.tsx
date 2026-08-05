import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteFrame } from "@/components/site-frame";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: "BúhoLex | Criterio jurídico para decisiones reales", template: "%s | BúhoLex" },
  description: siteConfig.description,
  applicationName: "BúhoLex",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
  alternates: { canonical: "/" },
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  openGraph: { type: "website", locale: "es_PE", siteName: "BúhoLex", title: "BúhoLex | Criterio jurídico para decisiones reales", description: siteConfig.description, images: [{ url: "/og.png", width: 1736, height: 906, alt: "BúhoLex, criterio jurídico para decisiones reales" }] },
  twitter: { card: "summary_large_image", title: "BúhoLex", description: siteConfig.description, images: ["/og.png"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#9d3f2f", colorScheme: "light" };

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "BúhoLex",
  legalName: "EMCCON",
  url: siteConfig.url,
  description: siteConfig.description,
  areaServed: "PE",
  knowsLanguage: "es",
  email: siteConfig.contact.email,
  telephone: `+${siteConfig.contact.whatsapp.e164}`,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <a className="skip-link" href="#contenido">Saltar al contenido principal</a>
        <SiteFrame>{children}</SiteFrame>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, "\\u003c") }} />
      </body>
    </html>
  );
}
