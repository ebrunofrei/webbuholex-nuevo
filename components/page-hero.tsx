import Link from "next/link";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  action?: { label: string; href: string };
}

export function PageHero({ eyebrow, title, description, status, action }: PageHeroProps) {
  return (
    <section className="page-hero">
      <div className="container page-hero-inner">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
          {action ? <Link className="button" href={action.href}>{action.label}</Link> : null}
        </div>
        {status ? <aside className="status-card" aria-label="Disponibilidad de esta sección"><span>Disponibilidad</span><strong>{status}</strong></aside> : null}
      </div>
    </section>
  );
}
