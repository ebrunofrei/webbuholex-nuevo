import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { createPageMetadata } from "@/lib/metadata";
import { LEGAL_DOCUMENTS } from "@/lib/legal/legal-documents";
import { PrivacyPolicyV1 } from "@/lib/legal/privacy/v1";

const doc = LEGAL_DOCUMENTS.privacy;

export const metadata: Metadata = createPageMetadata(
  doc.title,
  "Política de privacidad de BúhoLex y tratamiento de datos personales.",
  doc.canonicalPath
);

export default function PrivacyPage() {
  const statusLabel = doc.publishedAt
    ? `Versión ${doc.version}`
    : `Versión ${doc.version} — Pendiente de publicación`;

  return (
    <main>
      <PageHero
        eyebrow="LEGAL"
        title="Política de Privacidad"
        description="Información sobre el tratamiento de datos personales en BúhoLex."
        status={statusLabel}
      />
      <section className="content-section">
        <div className="container">
          <PrivacyPolicyV1 />
        </div>
      </section>
    </main>
  );
}
