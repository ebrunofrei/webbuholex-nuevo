import type { Metadata } from "next";
import { FutureAccessPage } from "@/components/portal/future-access-page";
import { IntelligentSpaceJurisprudence } from "@/components/jurisprudence/intelligent-space-jurisprudence";
import { IntelligentSpaceOverview } from "@/components/portal/intelligent-space-overview";
import { accessBoundaries } from "@/data/access-boundaries";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("Espacio Virtual Inteligente", "Arquitectura futura para análisis jurídico, proyectos y automatización.", "/espacio/");
export default function IntelligentSpacePage() { return <><FutureAccessPage eyebrow="ESPACIO VIRTUAL INTELIGENTE" title="Análisis, proyectos y documentos en un entorno personalizado" description="Conozca el entorno futuro para Asistente Legal, jurisprudencia asistida, análisis documental, proyectos, automatizaciones, productos y servicios." status="Presentación pública" boundaries={accessBoundaries} mode="space" /><IntelligentSpaceOverview /><IntelligentSpaceJurisprudence /></>; }
