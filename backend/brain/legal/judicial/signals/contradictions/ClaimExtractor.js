// brain/legal/judicial/signals/contradictions/ClaimExtractor.js

import { normalizeText, simpleHash } from "./utils.js";
import { parseDatesFromText } from "./TemporalResolver.js";
import { parseAmountsFromText } from "./NumericResolver.js";
import { detectNegation } from "./Negation.js";

const EVENT_PATTERNS = [
  // firma de contrato
  { topic: "firma_contrato", re: /(contrato|convenio).{0,40}(firm(ó|ado)|suscribi(ó|to))/i, predicate: "firmado", subject: "contrato" },
  // notificación
  { topic: "notificacion", re: /(notific(ó|ado|ación)).{0,60}(resoluci(ó|on)|auto|sentencia|acto)/i, predicate: "notificado", subject: "notificacion" },
  // vínculo laboral
  { topic: "vinculo_laboral", re: /(v[ií]nculo|relaci[oó]n).{0,20}(laboral|trabajo)/i, predicate: "existe", subject: "vinculo_laboral" },
  // pago
  { topic: "pago", re: /(pag(ó|ado|o)|abon(ó|o)).{0,60}(monto|s\/|soles|d[oó]lares|usd|\$)/i, predicate: "pago", subject: "pago" },
];

export function extractClaims({ text, sections, meta }) {
  const claims = [];
  for (const sec of sections) {
    const chunk = text.slice(sec.start, sec.end);
    const sentences = splitSentences(chunk, sec.start);

    for (const s of sentences) {
      const raw = s.text;
      const norm = normalizeText(raw);

      // 1) Eventos por patrones
      for (const p of EVENT_PATTERNS) {
        if (p.re.test(raw)) {
          const neg = detectNegation(raw);
          const dates = parseDatesFromText(raw);
          const amounts = parseAmountsFromText(raw);

          // claim principal (evento)
          claims.push({
            id: simpleHash(`${sec.id}:${s.start}:${p.topic}`),
            type: "fact",
            topicKey: p.topic,
            subject: p.subject,
            predicate: p.predicate,
            object: inferObject(raw, p.topic),
            polarity: !neg,
            time: dates[0] ? { date: dates[0] } : null,
            amount: amounts[0] || null,
            scope: inferScope(raw),
            sectionId: sec.id,
            start: s.start,
            end: s.end,
            rawText: raw,
          });

          // claim adicional si hay monto (para contradicción numérica)
          if (amounts.length) {
            claims.push({
              id: simpleHash(`${sec.id}:${s.start}:${p.topic}:amount`),
              type: "amount",
              topicKey: `${p.topic}__${inferScope(raw) || "general"}`,
              subject: p.subject,
              predicate: "monto",
              object: inferScope(raw) || "general",
              polarity: true,
              time: dates[0] ? { date: dates[0] } : null,
              amount: amounts[0],
              scope: inferScope(raw),
              sectionId: sec.id,
              start: s.start,
              end: s.end,
              rawText: raw,
            });
          }
        }
      }
    }
  }
  return claims;
}

// --- helpers (v1) ---
function splitSentences(text, globalOffset) {
  // simple split; v2 lo mejora
  const parts = text.split(/(?<=[\.\?\!])\s+/);
  let cursor = globalOffset;
  return parts
    .map((t) => {
      const start = cursor;
      const end = cursor + t.length;
      cursor = end + 1;
      return { text: t.trim(), start, end };
    })
    .filter((x) => x.text.length > 0);
}

function inferScope(raw) {
  const r = raw.toLowerCase();
  if (r.includes("daño moral") || r.includes("dano moral")) return "daño_moral";
  if (r.includes("lucro cesante")) return "lucro_cesante";
  if (r.includes("daño emergente") || r.includes("dano emergente")) return "daño_emergente";
  if (r.includes("indemniz")) return "indemnizacion";
  if (r.includes("plazo")) return "plazo";
  return null;
}

function inferObject(raw, topic) {
  const r = raw.toLowerCase();
  if (topic === "notificacion") {
    if (r.includes("sentencia")) return "sentencia";
    if (r.includes("resoluc")) return "resolucion";
    if (r.includes("auto")) return "auto";
    return "acto";
  }
  if (topic === "firma_contrato") return "contrato";
  return null;
}