import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { createPageMetadata } from "@/lib/metadata";
export const metadata: Metadata = createPageMetadata("Libro de Reclamaciones", "Libro de Reclamaciones de BúhoLex en preparación.", "/libro-de-reclamaciones/");
export default function Page() { return <><PageHero eyebrow="Atención al consumidor" title="Libro de Reclamaciones" description="La versión funcional se habilitará con registro, constancia y canal de respuesta." status="Formulario no habilitado" /><section className="content-section"><article className="container legal-copy"><h2>Implementación prevista</h2><p>El formulario solicitará solo los datos necesarios, distinguirá queja y reclamo, entregará constancia y conservará una traza de atención.</p><p className="placeholder-banner">Esta página todavía no recibe ni registra reclamos.</p></article></section></>; }
