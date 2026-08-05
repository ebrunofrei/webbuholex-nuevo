import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "Página no encontrada", robots: { index: false, follow: false } };
export default function NotFound() { return <section className="page-hero"><div className="container page-hero-inner"><div><p className="eyebrow">Error 404</p><h1>Esta página no está en el expediente</h1><p>La dirección puede haber cambiado o todavía no formar parte de BúhoLex v2.</p><Link className="button" href="/">Volver al inicio</Link></div><aside className="status-card"><span>Ruta no encontrada</span><strong>404</strong><p>No se ha cargado contenido alternativo ni una página ficticia.</p></aside></div></section>; }
