// ======================================================================
// 🧠 LLMContextEngine.js — R7.7 (Canonical Final)
// ----------------------------------------------------------------------
// CONTEXT ORCHESTRATOR FOR THE LLM
//
// RESPONSIBILITIES:
// - Transform TurnContext signals into LLM context blocks
// - Invoke passive bridges (Analysis / Procedural / PDF / LTM / Agenda)
// - Enforce epistemic reset semantics (hard vs soft)
// - Normalize accumulated context (anti-noise)
// ======================================================================

export function buildLLMContext({
  turnContext,
  lastLLMContext = {},
  bridges = {},
  prompt = "",
  adjuntos = [],
  agendaData = null,
  agendaPeriod = null,
}) {
  if (!turnContext) {
    throw new Error("LLMContextEngine requires a valid turnContext.");
  }

  const {
    action,
    hardReset,
    softReset,
    analysisReset,
    hierTags,
    affinity,
    turnCount,
  } = turnContext;

  // --------------------------------------------------
  // 1. Reset semantics (authoritative)
  // --------------------------------------------------
  const resetAll = hardReset === true;
  const resetAnalysis = analysisReset === true || resetAll;

  // Inheritance allowed ONLY if MERGE_CONTEXT (R7.7 rule)
  const allowInheritance = action === "MERGE_CONTEXT";

  // --------------------------------------------------
  // 2. Context inheritance
  // --------------------------------------------------
  let analysisContext =
    resetAnalysis || !allowInheritance
      ? []
      : lastLLMContext.analysisContext || [];

  let memoryContext =
    resetAll || !allowInheritance
      ? []
      : lastLLMContext.memoryContext || [];

  let proceduralContext =
    resetAll || !allowInheritance
      ? []
      : lastLLMContext.proceduralContext || [];

  // --------------------------------------------------
  // 3. Passive Bridges
  // (Bridges themselves contain zero decision-making)
  // --------------------------------------------------

  // Procedural
  if (bridges.ProceduralBridge) {
    const proc = bridges.ProceduralBridge({
      hierTags,
      affinity,
      turnCount,
      adjuntos,
    });
    if (proc && Object.keys(proc).length) {
      proceduralContext.push(proc);
    }
  }

  // Analysis (blocked when analysisReset = true)
  if (bridges.AnalysisBridge && !resetAnalysis) {
    const a = bridges.AnalysisBridge({
      hierTags,
      affinity,
      turnCount,
    });
    if (a && Object.keys(a).length) {
      analysisContext.push(a);
    }
  }

  // LTM — suppressed by hard reset
  if (bridges.LTMBridge && !resetAll) {
    const mem = bridges.LTMBridge({
      hierTags,
      affinity,
      turnCount,
    });
    if (mem && Object.keys(mem).length) {
      memoryContext.push(mem);
    }
  }

  // PDF extraction
  if (bridges.PDFBridge) {
    const pdf = bridges.PDFBridge({ adjuntos, hierTags });
    if (pdf && Object.keys(pdf).length) {
      memoryContext.push(pdf);
    }
  }

  // Agenda (new)
  if (bridges.AgendaBridge && agendaPeriod) {
    const agendaBlock = bridges.AgendaBridge({
      agendaData: agendaData || [],
      period: agendaPeriod,
      status: "connected",
    });
    if (agendaBlock && Object.keys(agendaBlock).length) {
      memoryContext.push(agendaBlock);
    }
  }

  // --------------------------------------------------
  // 4. Anti-noise normalization
  // --------------------------------------------------
  analysisContext = analysisContext.slice(-3);
  memoryContext = memoryContext.slice(-5);
  proceduralContext = proceduralContext.slice(-2);

  // --------------------------------------------------
  // 5. Final system block for Kernel
  // --------------------------------------------------
  const systemBlocks = {
    tags: hierTags,
    affinity,
    turnCount,
    action,
    softReset,
    hardReset,
  };

  return {
    systemBlocks,

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

// ------------------------------------------------------------------
// Canonical export
// ------------------------------------------------------------------
export default buildLLMContext;
