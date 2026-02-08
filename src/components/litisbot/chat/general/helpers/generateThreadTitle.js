/* ============================================================================
   R7.7++ — SUPREME THREAD TITLE GENERATOR
   Responsibility: Produce a clean, professional and semantic short title
   Style: ChatGPT-like, concise, zero-noise
============================================================================ */

const GENERIC_PATTERNS = [
  /^hola[\s!.?,]*$/i,
  /^buenas[\s!.?,]*$/i,
  /^buenas tardes[\s!.?,]*$/i,
  /^buenos días[\s!.?,]*$/i,
  /^ayuda$/i,
  /^consulta$/i,
  /^tengo una consulta/i,
  /^necesito ayuda/i,
];

/**
 * Clean, semantic, ultra-short title
 */
export function generateThreadTitle(text) {
  // 🔒 Defensive: guarantee string input
  if (typeof text !== "string") {
    return "Nueva consulta jurídica";
  }

  if (!text.trim()) return "Nueva consulta jurídica";

  // Normalize whitespace and remove line breaks  
  let sanitized = text
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Detect trivial greetings / non-informative prompts  
  if (GENERIC_PATTERNS.some((rx) => rx.test(sanitized))) {
    return "Nueva consulta jurídica";
  }

  // Remove polite filler commonly used in legal context  
  sanitized = sanitized
    .replace(/^(hola|buenas|buenas tardes|buenos días)[,.\s]+/i, "")
    .replace(/^(por favor|gracias)[,.\s]+/i, "")
    .trim();

  // Extract first meaningful ~10 words  
  const words = sanitized.split(" ").filter(Boolean);
  let short = words.slice(0, 10).join(" ");

  // Remove trailing punctuation  
  short = short.replace(/[.,;:!?]$/, "");

  // If the original text was short enough, no ellipsis  
  const needsEllipsis = words.length > 10;

  let finalTitle = needsEllipsis ? `${short}…` : short;

  // Sidebar hard limit  
  if (finalTitle.length > 60) {
    finalTitle = finalTitle.slice(0, 57).trim() + "…";
  }

  // Capitalize first letter  
  return finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1);
}

