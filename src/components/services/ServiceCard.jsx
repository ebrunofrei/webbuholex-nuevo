// src/components/services/ServiceCard.jsx
import React from "react";
import { Link } from "react-router-dom";
import { CTA_WHATSAPP, formatPrice } from "@/services/servicesApi";

export default function ServiceCard({ s }) {
  if (!s) return null;

  const price = formatPrice(s);
  const waText = `Hola, quiero ${s.title} (BúhoLex).`;

  return (
    <div className="rounded-xl bg-white border shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition">
      <div>
        <h3 className="font-semibold text-[#5C2E0B] text-base leading-snug">
          {s.title}
        </h3>
        {s.excerpt && (
          <p className="text-gray-600 text-sm mt-1">{s.excerpt}</p>
        )}
        <div className="mt-2 text-sm font-medium text-[#5C2E0B]">
          {price}
          {s.duration && <span className="text-gray-500"> · {s.duration}</span>}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Link
          to={`/servicios/${s.slug}`}
          className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-700"
        >
          Ver detalle
        </Link>
        <a
          href={CTA_WHATSAPP(waText)}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
        >
          Consultar
        </a>
      </div>
    </div>
  );
}
