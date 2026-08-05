import Image from "next/image";

export function CatalogHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <section className="catalog-hero">
      <div className="container catalog-hero-inner">
        <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p><div className="catalog-hero-proof"><span>Perú</span><span>Control de versión</span><span>Alcance explícito</span></div></div>
        <div className="catalog-hero-mark" aria-hidden="true"><Image src="/brand/buho-institucional.png" alt="" width={210} height={240} priority /><span>BúhoLex</span><small>Criterio jurídico</small></div>
      </div>
    </section>
  );
}
