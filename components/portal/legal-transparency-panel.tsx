"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { siteConfig } from "@/lib/site-config";
import { buildWhatsAppUrl } from "@/lib/contact-links";
import styles from "./dual-portal.module.css";

export function LegalTransparencyPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])') ?? []).filter((element) => !element.hasAttribute("disabled"));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.backdrop}>
      <div ref={dialogRef} className={styles.legalPanel} role="dialog" aria-modal="true" aria-labelledby="legal-panel-title">
        <div className={styles.panelHeader}><div><p>INFORMACIÓN INSTITUCIONAL</p><h2 id="legal-panel-title">Transparencia y marco legal</h2></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar transparencia y marco legal">×</button></div>
        <div className={styles.legalColumns}>
          <section><h3>BúhoLex LegalTech</h3><p>Plataforma jurídica de orientación, información y soluciones documentales.</p><dl><div><dt>Titular de la plataforma</dt><dd>EMCCON</dd></div><div><dt>Razón social</dt><dd>Empresa Constructora, Consultora, Bienes y Servicios en General Julita S.A.C.</dd></div><div><dt>RUC</dt><dd>20571585902</dd></div><div><dt>Marca</dt><dd>BúhoLex LegalTech</dd></div><div><dt>Ubicación general</dt><dd>Perú</dd></div></dl><p className={styles.securityNote}>La plataforma aplica separación entre recursos públicos y activos privados.</p></section>
          <section><h3>Centro legal</h3><ul><li>Política de Privacidad</li><li>Términos y Condiciones</li><li>Política de Cambios y Devoluciones</li><li>Libro de Reclamaciones<br /><small>Canal disponible para el registro de reclamos y quejas.</small></li><li>Aviso de Cookies</li><li>Licencias de uso</li></ul></section>
          <section className={styles.businessInformation}><h3>Información empresarial</h3><dl><div><dt>Información institucional</dt><dd><Link href="/nosotros/">Titular y datos corporativos</Link></dd></div><div><dt>Correo corporativo</dt><dd><a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a></dd></div><div><dt>WhatsApp Business corporativo</dt><dd><a href={buildWhatsAppUrl()}>{siteConfig.contact.whatsapp.display}</a></dd></div><div><dt>Canales institucionales</dt><dd><Link href="/contacto/">Atención al consumidor e información comercial</Link></dd></div></dl></section>
        </div>
        <p className={styles.panelFooter}>Algunas funciones comerciales y canales de atención se habilitarán antes del lanzamiento público.</p>
      </div>
    </div>
  );
}
