// litisbot/chat-pro/hooks/useAnalysisLifecycle.js

export default function useAnalysisLifecycle({
  usuarioId,
  contextId,
  analysisId,
  setAnalysisId,
  createAnalysisFn,
  buildTitle,
  preventNextResetRef,
  bumpAnalyses,
}) {
  function handleIntent({ intent, seedText }) {
    if (analysisId) return;

    if (intent !== "analysis.start") return;

    if (preventNextResetRef?.current) return;

    preventNextResetRef.current = true;

    const title = buildTitle(seedText);

    const { created } = createAnalysisFn({
      usuarioId,
      contextId,
      title,
    });

    setAnalysisId(created.id);

    if (bumpAnalyses) bumpAnalyses();
  }

  return { handleIntent };
}