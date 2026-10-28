import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { createPageMetadata } from "@/lib/metadata";
import { LEGAL_DOCUMENTS } from "@/lib/legal/legal-documents";
import { TermsAndConditionsV1 } from "@/lib/legal/terms/v1";

const doc = LEGAL_DOCUMENTS.terms;

export const metadata: Metadata = createPageMetadata(
  doc.title,
  "Términos y condiciones de uso de BúhoLex.",
  doc.canonicalPath
);

export default function TermsPage() {
  const statusLabel = doc.publishedAt
    ? `Versión ${doc.version}`
    : `Versión ${doc.version} — Pendiente de publicación`;

  return (
    <main>
      <PageHero
        eyebrow="LEGAL"
        title="Términos y Condiciones"
        description="Condiciones de uso de la plataforma BúhoLex."
        status={statusLabel}
      />
      <section className="content-section">
        <div className="container">
          <TermsAndConditionsV1 />
        </div>
      </section>
    </main>
  );
}
