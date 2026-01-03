export function shouldRunAnalysis({ prompt, cognitive, toolMode }) {
  if (toolMode === "analysis") return true;

  if (cognitive?.profile?.controlDeFalacias) return true;

  return /nulidad|motivación|falacia|agravio|coherencia|lógica/i.test(prompt);
}
