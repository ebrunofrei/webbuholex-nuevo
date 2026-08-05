import type { Metadata } from "next";
import { StandardPage } from "@/components/standard-page";
import { createPageMetadata } from "@/lib/metadata";
export const metadata: Metadata = createPageMetadata("Códigos", "Normativa organizada con fuente y fecha de actualización.", "/codigos/");
export default function Page() { return <StandardPage eyebrow="Normativa" title="Códigos organizados con trazabilidad" description="La sección distinguirá texto normativo, fuente oficial, fecha de consulta y notas editoriales." status="Contenido en validación" items={[{ title: "Texto normativo", text: "El contenido deberá conservar estructura y referencias de su fuente autorizada." }, { title: "Actualizaciones", text: "Toda modificación requerirá fecha, procedencia y control de versión." }, { title: "Uso responsable", text: "La consulta informativa no sustituirá el análisis de vigencia y aplicación al caso." }]} />; }
