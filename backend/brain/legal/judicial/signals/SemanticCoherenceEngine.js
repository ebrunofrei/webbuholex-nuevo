// brain/legal/judicial/signals/SemanticCoherenceEngine.js

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return `s${h.toString(16)}`;
}

function splitSentences(text, globalOffset = 0) {
  const parts = String(text || "").split(/(?<=[\.\?\!])\s+/);
  let cursor = globalOffset;
  return parts
    .map((t) => {
      const start = cursor;
      const end = cursor + t.length;
      cursor = end + 1;
      const trimmed = t.trim();
      return trimmed ? { text: trimmed, start, end } : null;
    })
    .filter(Boolean);
}

function getSectionText(text, sec) {
  return text.slice(sec.start, sec.end);
}

function findSection(sections, ids) {
  const set = new Set(ids);
  return (sections || []).find((s) => set.has(String(s.id || "").toLowerCase()));
}

function detectConnectors(sentence) {
  const t = sentence.toLowerCase();
  const connectors = [
    "por tanto",
    "en consecuencia",
    "por ello",
    "así",
    "de modo que",
    "se concluye",
    "corresponde",
    "por ende",
  ];
  return connectors.filter((c) => t.includes(c));
}

function looksLikeConclusion(sentence) {
  return detectConnectors(sentence).length > 0 || /\b(solicito|pido|se\s+declare|se\s+revoque|se\s+reforme)\b/i.test(sentence);
}

function hasSupportSignals(contextText) {
  // señales de soporte: hechos concretos / evidencia / norma aplicada
  return /(anexo|prueba|documento|acta|pericia|informe|constancia|medio\s+probatorio|art\.?\s*\d+|artículo\s*\d+|ley\s+\d+)/i.test(contextText);
}

function isValueJudgment(sentence) {
  // valoraciones típicas sin contenido fáctico
  return /\b(es\s+evidente|claramente|manifiestamente|sin\s+duda|resulta\s+incuestionable|obviamente)\b/i.test(sentence);
}

function isFactualAnchor(sentence) {
  // heurística: números, fechas, nombres de documento, actos
  return /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/.test(sentence) ||
         /\b(anexo|acta|contrato|resoluci[oó]n|notificaci[oó]n|recibo|dep[oó]sito)\b/i.test(sentence) ||
         /\b(S\/|USD|\$)\b/.test(sentence);
}

function hasNormCitations(text) {
  return /(art\.?\s*\d+|artículo\s*\d+|ley\s+\d+|c\.p\.c\.|l\.e\.c\.|c\.p\.c\.f\.)/i.test(text);
}

function hasNormApplicationLanguage(text) {
  // lenguaje de aplicación/subsunión
  return /(resulta\s+aplicable|en\s+el\s+presente\s+caso|se\s+subsum(e|e)\s+en|configura|se\s+acredita|conforme\s+a|en\s+virtud\s+de)/i.test(text);
}

function summarize(findings) {
  const s = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) s[f.severity]++;

  // riskIndex (0–100) v1
  const risk = Math.min(
    100,
    s.critical * 28 + s.high * 18 + s.medium * 10 + s.low * 4
  );

  return { ...s, riskIndex: risk };
}

function mkFinding({ type, severity, confidence, evidence, whyItMatters, fixSuggestion }) {
  const key = `${type}:${severity}:${evidence?.[0]?.start ?? 0}:${evidence?.[0]?.end ?? 0}`;
  return {
    id: simpleHash(key),
    type,
    severity,
    confidence: clamp(confidence, 0, 1),
    evidence: evidence || [],
    whyItMatters,
    fixSuggestion,
  };
}

/**
 * 🧠 Motor de Coherencia Semántica Profunda (v1)
 * Heurístico + explicable. Sin embeddings por ahora.
 */
export function runSemanticCoherenceEngine({ text, sections = [], meta = {} } = {}) {
  const source = String(text || "");
  if (!source.trim()) return { findings: [], summary: summarize([]) };

  const findings = [];

  // Secciones (si existen). Si no, usamos todo el documento.
  const secHechos = findSection(sections, ["hechos", "fundamentos_de_hecho", "hecho", "hechos_relevantes"]);
  const secFund = findSection(sections, ["fundamentos", "fundamentos_de_derecho", "derecho"]);
  const secPet = findSection(sections, ["petitorio", "pretension", "petitorio_pretension"]);

  const full = { id: "full_document", start: 0, end: source.length };
  const hechos = secHechos || full;
  const fund = secFund || full;
  const pet = secPet || full;

  const hechosText = getSectionText(source, hechos);
  const fundText = getSectionText(source, fund);
  const petText = getSectionText(source, pet);

  // ---------------------------------------------------------
  // 1) Inferential gap: conclusiones sin soporte cercano
  // ---------------------------------------------------------
  {
    const sents = splitSentences(source, 0);
    for (let i = 0; i < sents.length; i++) {
      const s = sents[i];
      if (!looksLikeConclusion(s.text)) continue;

      // ventana anterior de soporte (v1)
      const prev = sents.slice(Math.max(0, i - 3), i).map(x => x.text).join(" ");
      const supported = hasSupportSignals(prev) || hasSupportSignals(s.text);

      // si es conclusión y NO hay soporte cercano → hallazgo
      if (!supported) {
        findings.push(mkFinding({
          type: "inferential_gap",
          severity: "high",
          confidence: 0.7,
          evidence: [{
            section: "full_document",
            start: s.start,
            end: s.end,
            text: s.text,
          }],
          whyItMatters: "La conclusión aparece sin puente argumental verificable. En lectura judicial, esto se percibe como afirmación no demostrada.",
          fixSuggestion: "Inserta el puente: (i) hecho acreditado, (ii) medio probatorio, (iii) norma aplicable, (iv) subsunción, y recién (v) conclusión.",
        }));
      }
    }
  }

  // ---------------------------------------------------------
  // 2) Thesis disconnect: petitorio/pretensión sin anclaje
  // ---------------------------------------------------------
  {
    const petSents = splitSentences(petText, pet.start);
    // si hay muchas frases petitorias y casi nada fáctico/normativo alrededor
    const petClaimCount = petSents.filter(s => looksLikeConclusion(s.text)).length;

    const hechosAnchor = hasSupportSignals(hechosText) || hechosText.length > 200;
    const fundAnchor = hasNormCitations(fundText) && hasNormApplicationLanguage(fundText);

    if (petClaimCount > 0 && (!hechosAnchor || !fundAnchor)) {
      findings.push(mkFinding({
        type: "thesis_disconnect",
        severity: (!hechosAnchor && !fundAnchor) ? "critical" : "high",
        confidence: 0.75,
        evidence: [{
          section: pet.id,
          start: pet.start,
          end: Math.min(pet.end, pet.start + 500),
          text: petText.slice(0, 500).trim(),
        }],
        whyItMatters: "El petitorio no aparece suficientemente amarrado a hechos acreditables y/o subsunción normativa. Eso dispara riesgo de improcedencia o desestimación.",
        fixSuggestion: "Vincula cada pedido a: hecho específico + prueba + norma + explicación de por qué corresponde (subsunión).",
      }));
    }
  }

  // ---------------------------------------------------------
  // 3) Normative misalignment: norma citada pero no aplicada
  // ---------------------------------------------------------
  {
    const cites = hasNormCitations(fundText);
    const applies = hasNormApplicationLanguage(fundText);

    if (cites && !applies) {
      findings.push(mkFinding({
        type: "normative_misalignment",
        severity: "medium",
        confidence: 0.7,
        evidence: [{
          section: fund.id,
          start: fund.start,
          end: Math.min(fund.end, fund.start + 550),
          text: fundText.slice(0, 550).trim(),
        }],
        whyItMatters: "Citar norma sin subsunción se percibe como ornamentación. Un juez quiere ver aplicación al caso, no listado de artículos.",
        fixSuggestion: "Añade subsunción explícita: 'En el presente caso, el hecho X configura el supuesto Y del art. Z, por lo que corresponde la consecuencia Q'.",
      }));
    }
  }

  // ---------------------------------------------------------
  // 4) Fact/value mix: valoraciones sin ancla fáctica
  // ---------------------------------------------------------
  {
    const sents = splitSentences(hechosText, hechos.start);
    for (let i = 0; i < sents.length; i++) {
      const s = sents[i];
      if (!isValueJudgment(s.text)) continue;

      // buscar ancla factual cerca (mismo o anterior)
      const prev = sents.slice(Math.max(0, i - 2), i + 1).map(x => x.text).join(" ");
      const anchored = isFactualAnchor(prev) || hasSupportSignals(prev);

      if (!anchored) {
        findings.push(mkFinding({
          type: "fact_value_mix",
          severity: "low",
          confidence: 0.6,
          evidence: [{
            section: hechos.id,
            start: s.start,
            end: s.end,
            text: s.text,
          }],
          whyItMatters: "La valoración sin soporte fáctico/probatorio reduce credibilidad. La sala suele castigar lenguaje concluyente sin sustento.",
          fixSuggestion: "Convierte la valoración en hecho verificable o acompáñala de evidencia: fecha, documento, acto, anexo o inferencia justificable.",
        }));
      }
    }
  }

  // Deduplicación simple (por id)
  const unique = new Map();
  for (const f of findings) unique.set(f.id, f);
  const finalFindings = Array.from(unique.values());

  return {
    findings: finalFindings,
    summary: summarize(finalFindings),
  };
}