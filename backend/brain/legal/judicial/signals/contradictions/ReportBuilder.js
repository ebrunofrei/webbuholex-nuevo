// brain/legal/judicial/signals/contradictions/ReportBuilder.js
import { severityFor } from "./Severity.js";
import { clamp01 } from "./utils.js";

export function buildReport(findings, { claims, groups, meta } = {}) {
  const contradictions = findings.map((f) => {
    const severity = severityFor(f);
    const { whyItMatters, fixSuggestion } = narrativeFor(f);

    return {
      id: f.id,
      type: f.type,
      severity,
      topic: f.topic,
      claims: f.claims.map(toClaimRef),
      whyItMatters,
      fixSuggestion,
      confidence: clamp01(f.confidence),
    };
  });

  const summary = summarize(contradictions);

  return {
    contradictions,
    summary,
    debug: { claimCount: claims.length, groups: groups.length },
  };
}

function toClaimRef(c) {
  return {
    text: c.rawText,
    section: c.sectionId,
    start: c.start,
    end: c.end,
    time: c.time || null,
    amount: c.amount || null,
    polarity: c.polarity,
  };
}

function summarize(list) {
  const s = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const x of list) s[x.severity]++;

  // riskIndex: ponderación simple (v1)
  const risk = Math.min(
    100,
    s.critical * 30 + s.high * 18 + s.medium * 10 + s.low * 4
  );

  return { ...s, riskIndex: risk };
}

function narrativeFor(f) {
  switch (f.type) {
    case "direct":
      return {
        whyItMatters: "Hay versiones incompatibles del mismo hecho. Esto degrada coherencia y credibilidad.",
        fixSuggestion: "Unifica la versión. Si existen escenarios alternativos, decláralos como pretensión principal/subsidiaria y amárralos a evidencia.",
      };
    case "temporal":
      return {
        whyItMatters: "La cronología no cierra. Un juez huele esto como inconsistencia material.",
        fixSuggestion: "Fija una línea de tiempo única (fecha + acto + documento). Si hay error material, corrígelo y susténtalo.",
      };
    case "numeric":
      return {
        whyItMatters: "Las cuantías divergentes abren flanco de improcedencia o reducciones por falta de precisión.",
        fixSuggestion: "Define un solo monto por concepto. Si hay componentes, desagrega (base + intereses + criterios) y evita dobles cifras.",
      };
    case "role":
      return {
        whyItMatters: "La atribución del acto cambia de sujeto. Eso puede destruir causalidad y carga probatoria.",
        fixSuggestion: "Aclara quién ejecutó el acto, con referencia a documento/medio probatorio. Si es relato de parte, identifícalo como tal.",
      };
    default:
      return { whyItMatters: "Inconsistencia interna detectada.", fixSuggestion: "Revisa y alinea el relato con fundamentos y evidencia." };
  }
}