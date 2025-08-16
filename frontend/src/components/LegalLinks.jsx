import React from "react";

export default function LegalLinks() {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-2 text-xs">
      <a href="/legal/politica-de-privacidad" className="hover:underline text-[#b03a1a]">
        Política de Privacidad
      </a>
      <span className="text-[#b03a1a]">·</span>
      <a href="/legal/terminos-y-condiciones" className="hover:underline text-[#b03a1a]">
        Términos y Condiciones
      </a>
      <span className="text-[#b03a1a]">·</span>
      <a href="/legal/aviso-cookies" className="hover:underline text-[#b03a1a]">
        Aviso de Cookies
      </a>
    </div>
  );
}
