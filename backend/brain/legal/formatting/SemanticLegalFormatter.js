// ============================================================================
// 📚 SemanticLegalFormatter
// Transforma retórica jurídica en jerarquía Markdown
// No analiza, solo estructura visual
// ============================================================================

export function formatUltraPremiumLegal(raw = "") {
  let text = raw.trim();

  // SUMILLA
  text = text.replace(
    /^SUMILLA[:\-]?\s*(.+)$/gmi,
    (_, c) => `> **SUMILLA:** *${c.trim()}*\n`
  );

  // PETITORIO
  text = text.replace(
    /^(PETITORIO|PRETENSIÓN|PEDIDO)\b/gmi,
    "\n---\n## ⚖️ PETITORIO\n"
  );

  // FUNDAMENTOS
  text = text.replace(
    /^(FUNDAMENTOS?(?:\s+DE?\s+\w+)*)$/gmi,
    "\n***\n## 📚 $1\n"
  );

  // Artículos
  text = text.replace(
    /^(Art(?:ículo|\.)?\s*\d+[\w\-\.]*)[\s.:]+(.+)$/gmi,
    (_, art, content) =>
      `\n> **${art.toUpperCase()}**\n>\n> ${content}\n`
  );

  return text;
}