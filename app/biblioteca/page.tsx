import type { Metadata } from "next";
import { StandardPage } from "@/components/standard-page";
import { createPageMetadata } from "@/lib/metadata";
export const metadata: Metadata = createPageMetadata("Biblioteca jurídica", "Materiales jurídicos cuya licencia y vigencia serán verificadas.", "/biblioteca/");
export default function Page() { return <StandardPage eyebrow="Biblioteca" title="Fuentes para estudiar y decidir con contexto" description="Los materiales se publicarán únicamente después de verificar licencia, procedencia, vigencia y condiciones de acceso." status="Biblioteca en revisión" items={[{ title: "Procedencia", text: "Cada material registrará autor, fuente y permiso o base legal de publicación." }, { title: "Organización", text: "La navegación se estructurará por materia, tipo de fuente y fecha." }, { title: "Acceso", text: "La política de descarga se definirá sin incorporar aún cuentas ni almacenamiento privado." }]} />; }
