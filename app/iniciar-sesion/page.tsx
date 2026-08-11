import type { Metadata } from "next";
import Link from "next/link";
import { FutureAccessPage } from "@/components/portal/future-access-page";
import { accessBoundaries } from "@/data/access-boundaries";
import { createPageMetadata } from "@/lib/metadata";
import { sanitizeWorkspaceReturnTo } from "@/lib/auth/return-to";

export const metadata: Metadata = createPageMetadata("Acceso al Espacio Virtual Inteligente", "Acceso futuro al entorno personal de BúhoLex.", "/iniciar-sesion/");

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function LoginPreparationPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const rawReturnTo = typeof searchParams.returnTo === "string" ? searchParams.returnTo : "/app";
  const safeReturnTo = sanitizeWorkspaceReturnTo(rawReturnTo);

  const loginAction = (
    <Link href={`/auth/login?returnTo=${encodeURIComponent(safeReturnTo)}`} className="primary-button" data-primary-cta>
      ENTRAR
    </Link>
  );

  return <FutureAccessPage eyebrow="ACCESO PERSONAL" title="Acceso al Espacio Virtual Inteligente" description="La autenticación permitirá conservar proyectos, documentos, preferencias y análisis en un entorno personal." status="Acceso habilitado" boundaries={accessBoundaries} mode="login" loginAction={loginAction} />;
}
