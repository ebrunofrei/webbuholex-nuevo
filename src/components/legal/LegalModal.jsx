import { useState, useEffect, useMemo } from "react";

import TerminosContent from "./content/terminos-y-condiciones";
import PrivacidadContent from "./content/politica-de-privacidad";
import DevolucionesContent from "./content/politica-de-devoluciones";
import ReclamacionesContent from "./content/libro-de-reclamaciones";
import CookiesContent from "./content/aviso-cookies";

const LEGAL_SECTIONS = {
  terminos: {
    label: "Términos y Condiciones",
    Component: TerminosContent,
  },
  privacidad: {
    label: "Política de Privacidad",
    Component: PrivacidadContent,
  },
  devoluciones: {
    label: "Política de Cambios y Devoluciones",
    Component: DevolucionesContent,
  },
  reclamaciones: {
    label: "Libro de Reclamaciones",
    Component: ReclamacionesContent,
  },
  cookies: {
    label: "Aviso de Cookies",
    Component: CookiesContent,
  },
};

export default function LegalModal({
  onClose,
  initialSection = "terminos",
}) {
  const [section, setSection] = useState(initialSection);

  // 🔁 Sincronizar si cambia desde el padre
  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  // 🔒 Bloqueo de scroll global
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous || "";
    };
  }, []);

  // 🧠 Evita recalcular en cada render
  const active = useMemo(() => {
    return LEGAL_SECTIONS[section] ?? LEGAL_SECTIONS.terminos;
  }, [section]);

  const ActiveComponent = active.Component;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-[95%] max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <aside className="w-64 bg-[#f6f7f9] p-6 border-r border-gray-200">
          <h3 className="font-bold text-[#4b2e19] mb-6">
            Centro Legal
          </h3>

          <nav className="space-y-3 text-sm">
            {Object.entries(LEGAL_SECTIONS).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={`block text-left w-full transition ${
                  section === key
                    ? "text-[#b03a1a] font-semibold"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                {value.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-10 overflow-y-auto">
          <h2 className="text-2xl font-bold text-[#4b2e19] mb-6">
            {active.label}
          </h2>

          <div className="text-gray-700 leading-relaxed">
            <ActiveComponent />
          </div>
        </main>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-6 right-8 text-sm text-gray-500 hover:text-black"
        >
          ✕
        </button>
      </div>
    </div>
  );
}