import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* ============================================================================
   🏛 LegalMarkdown — Renderer Institucional Definitivo
   ----------------------------------------------------------------------------
   - Render puro
   - Compatible con ALRE (motor retórico)
   - Compatible con motores de análisis (externos)
   - Numeración romana automática
   - Sin lógica jurídica
   - Sin análisis estructural
   - Sin llamadas externas
============================================================================ */

/* ============================================================
   Utilidad interna: Numeración romana
   (Responsabilidad visual, no jurídica)
============================================================ */

function toRoman(num) {
  const map = [
    ["M", 1000],
    ["CM", 900],
    ["D", 500],
    ["CD", 400],
    ["C", 100],
    ["XC", 90],
    ["L", 50],
    ["XL", 40],
    ["X", 10],
    ["IX", 9],
    ["V", 5],
    ["IV", 4],
    ["I", 1],
  ];

  let result = "";
  for (const [letter, value] of map) {
    while (num >= value) {
      result += letter;
      num -= value;
    }
  }
  return result;
}

export default function LegalMarkdown({ content = "", className = "" }) {
  const text = String(content || "").trim();
  if (!text) return null;

  return (
    <article
      className={`prose prose-litis max-w-none ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          /* ======================================================
             TÍTULOS (delegados a Tailwind Typography)
          ====================================================== */
          h1: ({ children }) => <h1>{children}</h1>,
          h2: ({ children }) => <h2>{children}</h2>,
          h3: ({ children }) => <h3>{children}</h3>,

          /* ======================================================
             PÁRRAFOS
          ====================================================== */
          p: ({ children }) => <p>{children}</p>,

          /* ======================================================
             LISTA NO ORDENADA
          ====================================================== */
          ul: ({ children }) => <ul>{children}</ul>,

          /* ======================================================
             LISTA ORDENADA
             → Numeración romana institucional
             (solo nivel superior)
          ====================================================== */
          ol: ({ children }) => {
            const items = React.Children.toArray(children);

            return (
              <ol className="list-none pl-0 space-y-4">
                {items.map((child, index) => {
                  if (!React.isValidElement(child)) return null;

                  return (
                    <li
                      key={index}
                      className="flex gap-3 items-start"
                    >
                      <span className="font-semibold text-litis-900 min-w-[32px]">
                        {toRoman(index + 1)}.
                      </span>

                      <div className="flex-1">
                        {child.props.children}
                      </div>
                    </li>
                  );
                })}
              </ol>
            );
          },

          /* ======================================================
             LIST ITEM (fallback interno)
          ====================================================== */
          li: ({ children }) => <li>{children}</li>,

          /* ======================================================
             ÉNFASIS
          ====================================================== */
          strong: ({ children }) => <strong>{children}</strong>,
          em: ({ children }) => <em>{children}</em>,

          /* ======================================================
             CITA
          ====================================================== */
          blockquote: ({ children }) => (
            <blockquote>{children}</blockquote>
          ),

          /* ======================================================
             ENLACES
          ====================================================== */
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),

          /* ======================================================
             CÓDIGO
          ====================================================== */
          code: ({ className: codeClassName, children }) => {
            const isBlock =
              codeClassName && codeClassName.includes("language-");

            if (!isBlock) {
              return (
                <code className={codeClassName}>
                  {children}
                </code>
              );
            }

            return (
              <pre className={codeClassName}>
                <code>{children}</code>
              </pre>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </article>
  );
}