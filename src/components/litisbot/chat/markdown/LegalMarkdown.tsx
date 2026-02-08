import ReactMarkdown from "react-markdown";

/* ============================================================================
   LegalMarkdown — CANONICAL R7.7++
   - Optimizado para lectura de dictámenes y análisis normativo.
   - Tipografía balanceada para evitar fatiga visual en consultas largas.
============================================================================ */

export default function LegalMarkdown({ content = "" }) {
  if (!content) return null;

  return (
    <div className="legal-markdown-container text-inherit">
      <ReactMarkdown
        components={{
          // Párrafos con espaciado óptimo para lectura legal
          p: ({ children }) => (
            <p className="mb-4 last:mb-0 leading-[1.7] font-medium text-[15px] md:text-[16px]">
              {children}
            </p>
          ),
          // Listas con bullets de alta visibilidad
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-5 space-y-2 marker:text-slate-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-5 space-y-2 marker:text-slate-900 marker:font-black">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1">{children}</li>
          ),
          // Énfasis profesional
          strong: ({ children }) => (
            <strong className="font-black text-slate-900 tracking-tight">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic opacity-90">{children}</em>
          ),
          // Bloques de cita para jurisprudencia
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-slate-900 pl-4 py-1 my-4 italic text-slate-600 bg-slate-50 rounded-r-lg">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}