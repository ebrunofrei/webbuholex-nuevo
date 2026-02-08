// backend/routes/ia/bubble/bubbleCognitiveGuard.js

export function applyCognitiveGovernance({
  reply,
  intent,
}) {
  if (intent !== "real_case_decision") {
    return {
      reply,
      redirected: false,
    };
  }

  // If user crossed into decision mode, we DO NOT continue strategy.
  // We keep the descriptive analysis and prepare a contextual closure.
  return {
    reply,
    redirected: true,
  };
}
