import type { Metadata } from "next";
import { PublicExplore } from "@/components/explore/public-explore";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("Información pública", "Jurisprudencia, legislación, plantillas, productos y servicios de consulta pública.", "/explorar/");

export default function ExplorePage() {
  return <PublicExplore />;
}
