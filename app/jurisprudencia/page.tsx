import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";
import { JurisprudencePublicPage } from "@/components/jurisprudence/jurisprudence-public-page";
import { searchLocalVerifiedJurisprudenceAction } from "@/lib/jurisprudence/local-verified-jurisprudence-public-actions";

export const metadata: Metadata = createPageMetadata(
  "Jurisprudencia",
  "El corpus jurisprudencial se encuentra actualmente en fase de preparación y revisión. Consulta resoluciones incorporadas al catálogo público de BúhoLex.",
  "/jurisprudencia/",
);

export default function JurisprudencePage() {
  return <JurisprudencePublicPage searchAction={searchLocalVerifiedJurisprudenceAction} />;
}
