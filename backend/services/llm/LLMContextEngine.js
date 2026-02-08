// ============================================================================
// 🧠 LLM CONTEXT ENGINE — R7.6 (2026)
// Orquestador cognitivo desacoplado del LLM.
// - NO construye prompts
// - NO ejecuta lógica jurídica
// - Respeta autoridad del TurnContextResolver
// ============================================================================

export function buildLLMContext({
  prompt,
  adjuntos = [],
  turnContext,
  lastContext = {},
  bridges = {},
}) {
  if (!turnContext) {
    throw new Error("LLMContextEngine requiere turnContext resuelto");
  }

  const {
    hierTags,
    affinity,
    turnCount,
    action,
    analysisReset,
    hardReset,
  } = turnContext;

  // --------------------------------------------------
  // 🔥 RESET EPISTÉMICO (autoridad externa)
  // --------------------------------------------------
  const resetAll = hardReset === true;
  const resetAnalysis = analysisReset === true;

  // --------------------------------------------------
  // 🧱 Contextos base (heredables)
  // --------------------------------------------------
  let analysisContext = resetAnalysis
    ? []
    : lastContext.analysisContext || [];

  let memoryContext = resetAll
    ? []
    : lastContext.memoryContext || [];

  let proceduralContext = resetAll
    ? []
    : lastContext.proceduralContext || [];

  // --------------------------------------------------
  // 🔌 Bridges (si existen)
  // --------------------------------------------------
  if (bridges.AnalysisBridge && !resetAnalysis) {
    const block = bridges.AnalysisBridge({ prompt, hierTags, affinity });
    if (block) analysisContext.push(block);
  }

  if (bridges.ProceduralBridge) {
    const block = bridges.ProceduralBridge({ prompt, hierTags });
    if (block) proceduralContext.push(block);
  }

  if (bridges.PDFBridge) {
    const block = bridges.PDFBridge({ adjuntos });
    if (block) memoryContext.push(block);
  }

  if (bridges.LTMBridge && !resetAll) {
    const block = bridges.LTMBridge({ hierTags, affinity });
    if (block) memoryContext.push(block);
  }

  // --------------------------------------------------
  // 🧼 Normalización (anti-ruido)
  // --------------------------------------------------
  analysisContext = analysisContext.slice(-3);
  memoryContext = memoryContext.slice(-5);
  proceduralContext = proceduralContext.slice(-2);

  // --------------------------------------------------
  // 📦 Salida canónica (NO prompt)
  // --------------------------------------------------
  return {
    systemBlocks: {
      tags: hierTags,
      affinity,
      turnCount,
      action,
    },

    analysisContext,
    memoryContext,
    proceduralContext,

    meta: {
      resetAll,
      resetAnalysis,
      action,
      affinity,
      turnCount,
    },
  };
}

export default buildLLMContext;
