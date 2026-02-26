// LegalContradictionEngine.js
// ============================================================================
// 🧠 LegalContradictionEngine — Contradicciones internas (CANÓNICO)
// ----------------------------------------------------------------------------
// - NO UI
// - Usa claims (oraciones relevantes) y detecta pares contradictorios.
// - Heurística: negaciones fuertes y cuantificadores absolutos.
// ============================================================================

function norm(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function keyify(s) {
  // firma ligera para agrupar afirmaciones “sobre lo mismo”
  return norm(s)
    .toUpperCase()
    .replace(/[^\wÁÉÍÓÚÑÜ\s]/g, "")
    .replace(/\b(EL|LA|LOS|LAS|UN|UNA|DE|DEL|Y|EN|POR|PARA|QUE)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function isNegated(s) {
  const u = s.toUpperCase();
  return (
    /\bNO\b/.test(u) ||
    /\bNUNCA\b/.test(u) ||
    /\bJAMÁS\b/.test(u) ||
    /\bIMPROCEDE\b/.test(u) ||
    /\bINEXISTE\b/.test(u)
  );
}

function isAffirmativeStrong(s) {
  const u = s.toUpperCase();
  return (
    /\bSIEMPRE\b/.test(u) ||
    /\bEXISTE\b/.test(u) ||
    /\bPROCEDE\b/.test(u) ||
    /\bSE ACREDITA\b/.test(u) ||
    /\bRESULTA\b/.test(u)
  );
}

function overlapScore(a, b) {
  // solapamiento simple por tokens
  const ta = new Set(keyify(a).split(" ").filter(Boolean));
  const tb = new Set(keyify(b).split(" ").filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.max(ta.size, tb.size);
}

export function detectInternalContradictions(claims = []) {
  const c = Array.isArray(claims) ? claims.map(norm).filter(Boolean) : [];
  if (c.length < 2) return [];

  const contradictions = [];

  for (let i = 0; i < c.length; i++) {
    for (let j = i + 1; j < c.length; j++) {
      const a = c[i];
      const b = c[j];

      // deben tratar “sobre lo mismo” para que valga la pena
      const ov = overlapScore(a, b);
      if (ov < 0.45) continue;

      const aNeg = isNegated(a);
      const bNeg = isNegated(b);

      // patrón básico: uno niega fuerte, el otro afirma fuerte
      if ((aNeg && isAffirmativeStrong(b)) || (bNeg && isAffirmativeStrong(a))) {
        contradictions.push({
          kind: "negation_conflict",
          a,
          b,
          overlap: ov,
          hint:
            "Hay tensión interna: una parte niega y otra afirma sobre un mismo punto. Unifique la tesis o distinga supuestos/tiempos/pruebas.",
        });
      }

      // patrón absolutos: nunca vs siempre (o similares)
      const ua = a.toUpperCase();
      const ub = b.toUpperCase();
      if (
        (ua.includes("NUNCA") && ub.includes("SIEMPRE")) ||
        (ub.includes("NUNCA") && ua.includes("SIEMPRE"))
      ) {
        contradictions.push({
          kind: "absolute_conflict",
          a,
          b,
          overlap: ov,
          hint:
            "Se detecta contradicción por absolutos (nunca/siempre). Reduzca absolutos o precise el ámbito temporal/material.",
        });
      }
    }
  }

  // Dedup ligera
  const seen = new Set();
  return contradictions.filter((x) => {
    const k = keyify(x.a) + "||" + keyify(x.b) + "||" + x.kind;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}