// brain/legal/judicial/signals/RhetoricEngine.js

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function splitSentences(text) {
  return String(text || "").split(/(?<=[\.\?\!])\s+/).filter(Boolean);
}

function splitParagraphs(text) {
  return String(text || "").split(/\n\s*\n/).filter(Boolean);
}

const CONNECTORS = [
  "por tanto",
  "en consecuencia",
  "por ello",
  "así",
  "sin embargo",
  "no obstante",
  "además",
  "por otro lado",
  "en ese sentido",
  "en efecto",
  "por consiguiente",
];

function countConnectors(text) {
  const t = text.toLowerCase();
  return CONNECTORS.reduce((acc, c) => acc + (t.includes(c) ? 1 : 0), 0);
}

function longSentenceRatio(sentences) {
  const long = sentences.filter(s => s.split(" ").length > 40);
  return sentences.length ? long.length / sentences.length : 0;
}

function longParagraphRatio(paragraphs) {
  const long = paragraphs.filter(p => p.split(" ").length > 180);
  return paragraphs.length ? long.length / paragraphs.length : 0;
}

export function runRhetoricEngine({ text } = {}) {
  const source = String(text || "");
  if (!source.trim()) return { findings: [], summary: {} };

  const sentences = splitSentences(source);
  const paragraphs = splitParagraphs(source);

  const connectorCount = countConnectors(source);
  const connectorDensity = sentences.length
    ? connectorCount / sentences.length
    : 0;

  const rhythmIndex = 1 - longSentenceRatio(sentences);
  const structureIndex = 1 - longParagraphRatio(paragraphs);

  const score =
    clamp(
      (0.4 * rhythmIndex) +
      (0.3 * structureIndex) +
      (0.3 * connectorDensity),
      0,
      1
    ) * 100;

  const findings = [];

  if (longSentenceRatio(sentences) > 0.35) {
    findings.push({
      type: "long_sentences",
      severity: "medium",
      message: "Exceso de oraciones extensas afecta el ritmo argumentativo.",
    });
  }

  if (longParagraphRatio(paragraphs) > 0.30) {
    findings.push({
      type: "dense_paragraphs",
      severity: "medium",
      message: "Párrafos extensos reducen claridad y fuerza persuasiva.",
    });
  }

  if (connectorDensity < 0.15) {
    findings.push({
      type: "low_connectors",
      severity: "low",
      message: "Baja densidad de conectores lógicos.",
    });
  }

  return {
    findings,
    summary: {
      score: Math.round(score),
      rhythmIndex: Number(rhythmIndex.toFixed(2)),
      connectorDensity: Number(connectorDensity.toFixed(2)),
      structureIndex: Number(structureIndex.toFixed(2)),
    },
  };
}