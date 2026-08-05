import type { Metadata } from "next";
import { FutureAccessPage } from "@/components/portal/future-access-page";
import { accessBoundaries } from "@/data/access-boundaries";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("Acceso al Espacio Virtual Inteligente", "Acceso futuro al entorno personal de BúhoLex.", "/iniciar-sesion/");
export default function LoginPreparationPage() { return <FutureAccessPage eyebrow="ACCESO PERSONAL" title="Acceso al Espacio Virtual Inteligente" description="La autenticación permitirá conservar proyectos, documentos, preferencias y análisis en un entorno personal." status="Acceso en preparación" boundaries={accessBoundaries} mode="login" />; }
