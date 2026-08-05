import type { Metadata } from "next";
import { CommercialHome } from "@/components/home/commercial-home";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata(
  "Soluciones jurídicas y empresariales",
  "Evaluación profesional, revisión documental y soluciones empresariales con respaldo y claridad.",
  "/",
);

export default function PortalPage() {
  return <CommercialHome />;
}
