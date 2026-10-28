import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { createPageMetadata } from "@/lib/metadata";
import { LEGAL_DOCUMENTS } from "@/lib/legal/legal-documents";
import { CookieNoticeV1 } from "@/lib/legal/cookies/v1";

const doc = LEGAL_DOCUMENTS.cookies;

export const metadata: Metadata = createPageMetadata(
  doc.title,
  "Aviso de cookies y tecnologías similares de BúhoLex.",
  doc.canonicalPath
);

export default function CookiesPage() {
  const statusLabel = doc.publishedAt
    ? `Versión ${doc.version}`
    : `Versión ${doc.version} — Pendiente de publicación`;

  return (
    <main>
      <PageHero
        eyebrow="LEGAL"
        title="Aviso de Cookies"
        description="Información sobre el uso de cookies y analítica en BúhoLex."
        status={statusLabel}
      />
      <section className="content-section">
        <div className="container">
          <CookieNoticeV1 />
        </div>
      </section>
    </main>
  );
}
