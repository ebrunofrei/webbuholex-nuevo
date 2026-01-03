// ============================================================================
// 🧠 BotMessageRenderer — Markdown jurídico profesional (UX-4.4 CONSOLIDADO)
// ============================================================================

import React from "react";
import ReactMarkdown from "react-markdown";
import SelectableTextLayer from "./SelectableTextLayer.jsx";

/* ===============================
   Utilidades semánticas
=============================== */
function getText(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node.children)) {
    return node.children.map(getText).join("");
  }
  return "";
}

function classifyBlockquote(text = "") {
  const t = text.toLowerCase();
  if (t.startsWith("norma:")) return "norma";
  if (t.startsWith("jurisprudencia:")) return "jurisprudencia";
  return "cita";
}

function isConclusionParagraph(text = "") {
  return /^(en conclusión|en consecuencia|por tanto|cabe precisar|debe tenerse en cuenta)/i
    .test(text.trim());
}

function isWarning(text = "") {
  return /^(advertencia|atención|importante)/i.test(text.trim());
}

// ===============================
// Limpieza de delimitadores
// ===============================
function stripDelimiters(md = "") {
  return md
    .replace(/:::CHAT|:::DOCUMENTO|:::NOTAS/gi, "")
    .trim();
}

export default function BotMessageRenderer({ content = "" }) {
  if (!content) return null;

  return (
    <SelectableTextLayer>
      <ReactMarkdown
        components={{
          /* ===============================
             TÍTULOS
          =============================== */
          h1: ({ children }) => (
            <h1 className="mt-10 mb-5 text-[23px] md:text-[24px] lg:text-[26px] font-semibold text-black">
              {children}
            </h1>
          ),

          h2: ({ children }) => (
            <h2 className="mt-9 mb-4 text-[20px] md:text-[21px] lg:text-[22px] font-semibold text-black">
              {children}
            </h2>
          ),

          h3: ({ children }) => (
            <h3 className="mt-7 mb-3 text-[18px] md:text-[19px] lg:text-[20px] font-medium text-black">
              {children}
            </h3>
          ),

          /* ===============================
             TEXTO
          =============================== */
          p: ({ children, node }) => {
            const rawText = getText({ children });
            const isFirst = node?.position?.start?.line === 1;
            const isConclusion = isConclusionParagraph(rawText);
            const isWarn = isWarning(rawText);

            return (
              <p
                className={`
                  mb-5
                  ${
                    isFirst
                      ? "text-[17px] md:text-[18px] lg:text-[19px] font-medium"
                      : "text-[16px] md:text-[17px] lg:text-[18px]"
                  }
                  ${isConclusion ? "pt-3 border-t border-black/10 font-medium" : ""}
                  ${isWarn ? "bg-black/5 px-4 py-3 rounded-lg" : ""}
                  leading-[1.75]
                  text-black
                `}
              >
                {children}
              </p>
            );
          },

          /* ===============================
             LISTAS
          =============================== */
          ul: ({ children }) => (
            <ul className="mb-5 pl-7 list-disc space-y-2 text-[16px] md:text-[17px] lg:text-[18px]">
              {children}
            </ul>
          ),

          ol: ({ children }) => (
            <ol className="mb-5 pl-7 list-decimal space-y-3 text-[16px] md:text-[17px] lg:text-[18px] font-medium">
              {children}
            </ol>
          ),

          li: ({ children }) => (
            <li className="leading-relaxed text-black">
              {children}
            </li>
          ),

          /* ===============================
             ÉNFASIS
          =============================== */
          strong: ({ children }) => (
            <strong className="font-semibold text-black">
              {children}
            </strong>
          ),

          em: ({ children }) => (
            <em className="italic text-black/80">
              {children}
            </em>
          ),

          /* ===============================
             ENLACES
          =============================== */
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-[#6b3f2a]/60 hover:decoration-[#6b3f2a] text-black"
            >
              {children}
            </a>
          ),

          /* ===============================
             BLOQUES JURÍDICOS
          =============================== */
          blockquote: ({ children }) => {
            const text = getText({ children });
            const kind = classifyBlockquote(text);

            if (kind === "norma") {
              return (
                <div className="my-6 rounded-xl border border-[#6b3f2a]/30 bg-white px-5 py-4">
                  <div className="mb-2 text-[13px] uppercase tracking-widest text-[#6b3f2a]">
                    Norma
                  </div>
                  <div className="text-[16px] md:text-[17px] lg:text-[18px] leading-relaxed text-black">
                    {children}
                  </div>
                </div>
              );
            }

            if (kind === "jurisprudencia") {
              return (
                <div className="my-6 rounded-xl border-l-4 border-[#6b3f2a] bg-white px-5 py-4">
                  <div className="mb-2 text-[13px] uppercase tracking-widest text-[#6b3f2a]">
                    Jurisprudencia
                  </div>
                  <div className="italic text-[16px] md:text-[17px] lg:text-[18px] leading-relaxed text-black/90">
                    {children}
                  </div>
                </div>
              );
            }

            return (
              <blockquote className="my-6 border-l-4 border-[#6b3f2a]/50 pl-5 italic text-[16px] md:text-[17px] lg:text-[18px] text-black/85 leading-relaxed">
                {children}
              </blockquote>
            );
          },

          /* ===============================
             CÓDIGO (NO TOCAR)
          =============================== */
          code: ({ inline, children }) =>
            inline ? (
              <code className="px-1 py-[2px] rounded bg-black/5 text-[15px] md:text-[16px]">
                {children}
              </code>
            ) : (
              <pre className="my-6 p-5 rounded bg-black/5 text-[15px] md:text-[16px] overflow-x-auto">
                <code>{children}</code>
              </pre>
            ),
        }}
      >
        {stripDelimiters(content)}
      </ReactMarkdown>
    </SelectableTextLayer>
  );
}
