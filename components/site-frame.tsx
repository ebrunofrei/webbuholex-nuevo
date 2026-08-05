"use client";

import { usePathname } from "next/navigation";
import { AuthHeader } from "@/components/auth-header";
import { PublicHeader } from "@/components/public-header";
import { SiteFooter } from "@/components/site-footer";
import { IntelligentPreviewHeader } from "@/components/intelligent-preview-header";

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortal = pathname === "/";
  const isAuth = pathname.startsWith("/iniciar-sesion");
  const isWorkspace = pathname === "/app" || pathname.startsWith("/app/");
  const isEditorial = pathname.startsWith("/editorial/");
  const isIntelligentPreview = pathname === "/asistente" || pathname.startsWith("/asistente/");
  const hasPublicShell = !isPortal && !isAuth && !isWorkspace && !isEditorial && !isIntelligentPreview;

  return (
    <>
      {hasPublicShell ? <PublicHeader /> : null}
      {isAuth ? <AuthHeader /> : null}
      {isIntelligentPreview ? <IntelligentPreviewHeader /> : null}
      <main id="contenido">{children}</main>
      {hasPublicShell ? <SiteFooter /> : null}
    </>
  );
}
