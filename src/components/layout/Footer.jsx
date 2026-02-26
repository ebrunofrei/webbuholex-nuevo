import React from "react";

const LEGAL_LINKS = [
  ["terminos", "Términos y Condiciones"],
  ["privacidad", "Política de Privacidad"],
  ["devoluciones", "Política de Cambios y Devoluciones"],
  ["reclamaciones", "Libro de Reclamaciones"],
  ["cookies", "Aviso de Cookies"],
];

export default function Footer({ docked = false, onOpenLegal }) {
  // ✅ Dock fijo (para páginas largas)
  if (docked) {
    return (
      <div className="fixed left-0 right-0 bottom-0 z-[90]">
        {/* Glow */}
        <div className="pointer-events-none absolute inset-0 -top-6 bg-gradient-to-t from-[#4b2e19]/20 via-transparent to-transparent" />

        <div
          className="mx-auto max-w-7xl px-4 sm:px-6"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
        >
          <div className="mb-3 rounded-2xl border border-[#e7d6cc] bg-white/90 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.12)]">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-9 w-9 rounded-xl bg-[#b03a1a]/10 flex items-center justify-center">
                  <span className="text-[#b03a1a] font-black">§</span>
                </div>

                <div>
                  <p className="text-sm font-extrabold text-[#4b2e19] leading-tight">
                    Centro Legal BúhoLex
                  </p>
                  <p className="text-xs text-gray-600">
                    Acceso rápido a políticas, términos y reclamaciones.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => onOpenLegal?.("terminos")}
                  className="px-3 py-2 rounded-full bg-[#4b2e19] text-white text-xs font-bold hover:opacity-90 transition"
                >
                  Ver marco institucional
                </button>

                <button
                  type="button"
                  onClick={() => onOpenLegal?.("privacidad")}
                  className="px-3 py-2 rounded-full border border-[#e7d6cc] text-[#b03a1a] text-xs font-bold hover:bg-[#fff6f6] transition"
                >
                  Privacidad
                </button>

                <a
                  href="https://www.facebook.com/litisbotlegaltech/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-full bg-[#b03a1a]/10 text-[#b03a1a] text-xs font-bold hover:bg-[#b03a1a] hover:text-white transition"
                >
                  Facebook
                </a>

                <a
                  href="https://www.youtube.com/channel/UC9soi-UZohvJbNSpVIS8W1g"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-full bg-[#b03a1a]/10 text-[#b03a1a] text-xs font-bold hover:bg-[#b03a1a] hover:text-white transition"
                >
                  YouTube
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Footer “normal” (para cuando sí se llega al final)
  return (
    <footer className="mt-20 border-t bg-[#f9f6f3] py-12 text-sm">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-10">
        {/* Marca */}
        <div>
          <h3 className="font-bold text-[#4b2e19] text-lg">BúhoLex</h3>
          <p className="text-gray-600 mt-3 leading-relaxed">
            Plataforma jurídica digital para abogados y ciudadanos. Jurisprudencia,
            herramientas, Oficina Virtual y LitisBot.
          </p>

          <button
            type="button"
            onClick={() => onOpenLegal?.("terminos")}
            className="mt-4 text-[#b03a1a] font-semibold hover:underline"
          >
            Ver marco institucional completo →
          </button>
        </div>

        {/* Centro Legal */}
        <div>
          <h4 className="font-semibold text-[#4b2e19] mb-4">Centro Legal</h4>

          <ul className="space-y-2">
            {LEGAL_LINKS.map(([key, label]) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onOpenLegal?.(key)}
                  className="text-gray-600 hover:text-[#b03a1a] transition"
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Contacto */}
        <div>
          <h4 className="font-semibold text-[#4b2e19] mb-4">Contacto</h4>

          <p className="text-gray-600 mb-2">📍 Barranca, Perú</p>

          <a
            href="mailto:eduardo@buholex.com"
            className="text-gray-600 hover:text-[#b03a1a] transition"
          >
            📧 eduardo@buholex.com
          </a>

          <div className="mt-5 flex gap-2 flex-wrap">
            <a
              href="https://www.facebook.com/litisbotlegaltech/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-full bg-[#b03a1a]/10 text-[#b03a1a] text-xs font-semibold hover:bg-[#b03a1a] hover:text-white transition"
            >
              Facebook
            </a>

            <a
              href="https://www.youtube.com/channel/UC9soi-UZohvJbNSpVIS8W1g"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-full bg-[#b03a1a]/10 text-[#b03a1a] text-xs font-semibold hover:bg-[#b03a1a] hover:text-white transition"
            >
              YouTube
            </a>
          </div>
        </div>
      </div>

      <div className="mt-12 pt-6 border-t border-[#e6d8cf] text-center text-gray-500 text-xs">
        © {new Date().getFullYear()} BúhoLex. Todos los derechos reservados.
      </div>
    </footer>
  );
}