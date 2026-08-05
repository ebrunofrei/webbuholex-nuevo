import { PageHero } from "@/components/page-hero";

interface StandardPageProps {
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  items: ReadonlyArray<{ title: string; text: string }>;
  note?: string;
}

export function StandardPage({ eyebrow, title, description, status, items, note }: StandardPageProps) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} description={description} {...(status ? { status } : {})} />
      <section className="content-section">
        <div className="container content-grid">
          {items.map((item) => <article className="content-card" key={item.title}><h2>{item.title}</h2><p>{item.text}</p></article>)}
        </div>
        {note ? <div className="container"><p className="placeholder-banner">{note}</p></div> : null}
      </section>
    </>
  );
}
