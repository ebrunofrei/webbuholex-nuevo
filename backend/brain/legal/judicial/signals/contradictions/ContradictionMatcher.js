// brain/legal/judicial/signals/contradictions/ContradictionMatcher.js
import { diffDays, sameDay, amountClose } from "./utils.js";

export function findContradictions(groups, { meta } = {}) {
  const findings = [];

  for (const g of groups) {
    const items = g.items;

    // Comparación por pares (v1). Si crece, optimizamos.
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];

        // 1) Directa: misma idea, polaridad opuesta
        if (isSameEvent(a, b) && a.polarity !== b.polarity) {
          findings.push(makeFinding("direct", g.topicKey, a, b, 0.85));
        }

        // 2) Temporal: mismo evento, fechas distintas relevantes
        if (isSameEvent(a, b) && a.time?.date && b.time?.date && !sameDay(a.time.date, b.time.date)) {
          const d = Math.abs(diffDays(a.time.date, b.time.date));
          if (d >= 1) findings.push(makeFinding("temporal", g.topicKey, a, b, d >= 7 ? 0.8 : 0.7));
        }

        // 3) Numérica: mismo concepto, montos distintos
        if (a.type === "amount" && b.type === "amount" && sameAmountConcept(a, b)) {
          if (!amountClose(a.amount, b.amount)) findings.push(makeFinding("numeric", g.topicKey, a, b, 0.75));
        }

        // 4) Rol: sujeto/atribución incompatible (v1: heurístico simple)
        if (isRoleConflict(a, b)) {
          findings.push(makeFinding("role", g.topicKey, a, b, 0.65));
        }
      }
    }
  }

  return findings;
}

function isSameEvent(a, b) {
  return a.subject === b.subject && a.predicate === b.predicate && (a.object || null) === (b.object || null);
}

function sameAmountConcept(a, b) {
  return a.subject === b.subject && (a.scope || "general") === (b.scope || "general");
}

function isRoleConflict(a, b) {
  // V1: si en el rawText aparece “demandante” vs “demandada” y comparten topicKey
  const ta = a.rawText.toLowerCase();
  const tb = b.rawText.toLowerCase();
  const aPla = ta.includes("demandante");
  const aDef = ta.includes("demandada") || ta.includes("demandado");
  const bPla = tb.includes("demandante");
  const bDef = tb.includes("demandada") || tb.includes("demandado");

  // si uno atribuye al demandante y el otro a la demandada para el mismo evento → conflicto
  return (aPla && bDef) || (aDef && bPla);
}

function makeFinding(type, topic, a, b, confidence) {
  return {
    id: `${type}:${topic}:${a.id}:${b.id}`,
    type,
    topic,
    claims: [a, b],
    confidence
  };
}