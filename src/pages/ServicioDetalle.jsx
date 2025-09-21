// src/pages/ServicioDetalle.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getServiceBySlug, WA } from "@/services/servicesApi";
import Gallery from "@/components/services/Gallery";
import VideoEmbed from "@/components/services/VideoEmbed";
import { formatPrice } from "@/services/servicesApi";

export default function ServicioDetalle() {
  const { slug } = useParams();
  const [s, setS] = useState(null);

  useEffect(() => {
    getServiceBySlug(slug).then(setS);
  }, [slug]);

  const waLink = useMemo(() => {
    const msg = encodeURIComponent(`Hola, quiero ${s?.title} (BúhoLex).`);
    return `https://wa.me/${WA}?text=${msg}`;
  }, [s]);

  if (!s) {
    return <div className="max-w-3xl mx-auto px-4 py-10">Cargando…</div>;
  }

  const price = formatPrice(s);

  return (
    <section className="min-h-[100dvh] bg-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-4 text-sm">
          <Link to="/servicios" className="underline text-[#5C2E0B]">
            ← Volver a servicios
          </Link>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-[#5C2E0B]">
          {s.title}
        </h1>
        {s.excerpt && <p className="text-gray-700 mt-2">{s.excerpt}</p>}

        <div className="mt-3 font-bold text-[#5C2E0B]">
          {price}
          {s.duration && <span className="text-sm text-gray-600"> · {s.duration}</span>}
        </div>

        {/* Galería */}
        <div className="mt-5">
          <Gallery images={s.gallery || []} />
        </div>

        {/* Video (primer elemento si existe) */}
        {s.videos?.[0] && (
          <div className="mt-4">
            <VideoEmbed video={s.videos[0]} />
          </div>
        )}

        {/* Cuerpo HTML opcional */}
        {s.body && (
          <div
            className="prose max-w-none mt-6"
            dangerouslySetInnerHTML={{ __html: s.body }}
          />
        )}

        {/* CTAs */}
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={waLink}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold"
            target="_blank"
            rel="noreferrer"
          >
            Consultar por WhatsApp
          </a>
          <a
            href="/servicios#consultas-planes"
            className="bg-amber-600 text-white px-4 py-2 rounded-xl font-semibold"
          >
            Ver planes
          </a>
        </div>
      </div>
    </section>
  );
}
