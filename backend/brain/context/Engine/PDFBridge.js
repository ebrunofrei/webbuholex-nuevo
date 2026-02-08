// ======================================================================
// 🧠 PDFBridge.js — R7.7 (Canonical)
// ----------------------------------------------------------------------
// Passive documentary bridge for LITIS.
//
// RESPONSIBILITIES:
// - Detect presence of PDF attachments.
// - Emit a minimal internal block describing documentary availability.
// - Never interpret, summarize, parse, or reason about the PDFs.
//
// NON-RESPONSIBILITIES:
// - No content extraction.
// - No legal reasoning.
// - No linkage between PDFs and procedural/analytical signals.
// - No UX or human-readable text.
//
// INTERNAL LANGUAGE: English only
// ======================================================================

/**
 * Extract only valid PDF attachments.
 */
function filterPDFs(adjuntos = []) {
  return adjuntos.filter((a) =>
    a &&
    (
      a.type === "application/pdf" ||
      a.mime === "application/pdf" ||
      /\.pdf$/i.test(a.name || "")
    )
  );
}

/**
 * PDFBridge — R7.7
 *
 * Emits an INTERNAL block only when valid PDFs are attached.
 * Resets disable the bridge entirely.
 */
export function PDFBridge({
  adjuntos = [],
  hardReset = false,
  softReset = false,
  turnCount = 1,
}) {
  // --------------------------------------------------
  // 1. Reset suppression
  // --------------------------------------------------
  if (hardReset || softReset) return null;

  // --------------------------------------------------
  // 2. Identify PDF attachments
  // --------------------------------------------------
  const pdfs = filterPDFs(adjuntos);
  if (pdfs.length === 0) return null;

  // --------------------------------------------------
  // 3. Structured INTERNAL block for SystemContext
  // --------------------------------------------------
  return {
    type: "documentary-context",
    version: "R7.7",
    pdfCount: pdfs.length,
    turnCount,
    note: "INTERNAL — DO NOT DISCLOSE",
  };
}

export default PDFBridge;
