import Link from "next/link";
import { buildWhatsAppUrl } from "@/lib/contact-links";
import { siteConfig } from "@/lib/site-config";

const footerGroups = [
  {
    title: "Explorar",
    links: [
      { label: "Servicios", href: "/servicios/" },
      { label: "Jurisprudencia", href: "/jurisprudencia/" },
    ],
  },
  {
    title: "Atención",
    links: [
      { label: "Asistente Legal", href: "/asistente/" },
      { label: "Consulta profesional", href: "/consulta-profesional/" },
      { label: "Contacto", href: "/contacto/" },
    ],
  },
  {
    title: "Legal",
    links: [{ label: "Privacidad", href: "/privacidad/" }, { label: "Términos", href: "/terminos/" }],
  },
] as const;

export function SiteFooter() {
  return (
    <footer id="site-footer" className="site-footer">
      <div className="footer-main">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-intro">
              <p className="footer-brand">{siteConfig.tradeName}</p>
              <p>Orientación jurídica, soluciones documentales y acceso responsable a atención profesional.</p>
              <div className="footer-owner" style={{ fontSize: "0.85rem", marginTop: "1rem", opacity: 0.8 }}>
                <p><strong>Una plataforma de {siteConfig.institutionalIdentity}</strong></p>
                <p>{siteConfig.legalName}</p>
                <p>RUC N.° {siteConfig.ruc}</p>
                <p>{siteConfig.legalAddress}</p>
              </div>
            </div>
            {footerGroups.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h2>{group.title}</h2>
                <ul>{group.links.map(({ label, href }) => <li key={label}>{href ? <Link href={href}>{label}</Link> : <span>{label}</span>}</li>)}</ul>
              </nav>
            ))}
            <div className="footer-contact"><h2>Contacto institucional</h2><a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a><a href={buildWhatsAppUrl()}>{siteConfig.contact.whatsapp.display}</a><small>{siteConfig.contact.whatsapp.label}</small></div>
          </div>
          <div className="footer-consumer"><h2>Atención al consumidor</h2><p><strong>Libro de Reclamaciones</strong><span>Canal disponible para el registro de reclamos y quejas.</span></p></div>
        </div>
      </div>
      <div className="footer-lower"><div className="container footer-bottom"><span>© {new Date().getFullYear()} {siteConfig.institutionalIdentity}.</span><span>La información del sitio no sustituye asesoría jurídica individual.</span><span>BúhoLex LegalTech · Perú</span></div></div>
    </footer>
  );
}
