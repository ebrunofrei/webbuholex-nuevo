import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { createPageMetadata } from "@/lib/metadata";
import { ComplaintForm } from "./components/complaint-form";

export const metadata: Metadata = createPageMetadata("Libro de Reclamaciones", "Libro de Reclamaciones de BúhoLex en preparación.", "/libro-de-reclamaciones/");

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Atención al consumidor" title="Libro de Reclamaciones" description="Canal oficial para registrar sus reclamos y quejas de manera segura." />
      <section className="content-section complaints-section">
        <article className="container">
          <ComplaintForm />
        </article>
      </section>
    </>
  );
}
