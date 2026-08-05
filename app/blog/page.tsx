import type { Metadata } from "next";
import { StandardPage } from "@/components/standard-page";
import { createPageMetadata } from "@/lib/metadata";
export const metadata: Metadata = createPageMetadata("Blog jurídico", "Artículos jurídicos y empresariales en proceso de revisión editorial.", "/blog/");
export default function Page() { return <StandardPage eyebrow="Contenido jurídico" title="Análisis que explica antes de concluir" description="Los artículos migrados se someterán a revisión de autoría, vigencia, fuentes y utilidad para el lector." status="Publicaciones en revisión" items={[{ title: "Explicaciones", text: "Contenido comprensible con límites y fuentes claramente identificados." }, { title: "Actualidad", text: "Análisis de novedades relevantes sin confundir información con asesoría." }, { title: "Guías prácticas", text: "Materiales orientados a reconocer problemas y preparar una consulta." }]} />; }
