"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { publicNavigation } from "@/data/navigation";

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  return <header className="site-header public-header" data-shell="public">
    <div className="top-ribbon"><div className="container ribbon-inner"><span>Plataforma jurídica de EMCCON</span><span className="ribbon-note">Información pública · Acceso libre</span></div></div>
    <div className="container nav-shell">
      <Link className="brand" href="/" aria-label="BúhoLex, ir al portal"><Image src="/brand/buho-institucional.png" alt="" width={54} height={54} /><span><strong>BúhoLex</strong><small>Información pública</small></span></Link>
      <button className="menu-toggle" type="button" aria-expanded={open} aria-controls="public-navigation" onClick={() => setOpen((current) => !current)}><span className="sr-only">{open ? "Cerrar menú" : "Abrir menú"}</span><span aria-hidden="true">{open ? "×" : "☰"}</span></button>
      <nav id="public-navigation" className={open ? "main-nav public-nav is-open" : "main-nav public-nav"} aria-label="Navegación pública"><ul>{publicNavigation.filter((item) => item.visibility === "visible").map((item) => <li key={item.id}><Link href={item.href} aria-current={item.activeMatch === "exact" ? pathname === item.href.replace(/\/$/, "") || pathname === item.href ? "page" : undefined : pathname.startsWith(item.href.replace(/\/$/, "")) ? "page" : undefined} onClick={() => setOpen(false)}>{item.label}</Link></li>)}</ul></nav>
    </div>
  </header>;
}
