"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { authNavigation } from "@/data/navigation";
import { LegalTransparencyPanel } from "@/components/portal/legal-transparency-panel";

export function AuthHeader() {
  const [legalOpen, setLegalOpen] = useState(false);
  const publicReturn = authNavigation[0];
  return <>
    <header className="auth-header" data-shell="auth"><div className="container auth-header-inner">
      <Link className="brand" href="/" aria-label="BúhoLex, ir al portal"><Image src="/brand/buho-institucional.png" alt="" width={48} height={48} /><span><strong>BúhoLex</strong><small>Acceso al espacio inteligente</small></span></Link>
      <nav aria-label="Navegación de acceso">{publicReturn ? <Link href={publicReturn.href}>{publicReturn.label}</Link> : null}<button type="button" onClick={() => setLegalOpen(true)} aria-haspopup="dialog">Transparencia y marco legal</button></nav>
    </div></header>
    <LegalTransparencyPanel open={legalOpen} onClose={() => setLegalOpen(false)} />
  </>;
}
