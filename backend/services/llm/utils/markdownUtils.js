export function normalizeWhites(str = "") {
  return str
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function cleanMarkdown(str = "") {
  return str
    .replace(/[*]{3,}/g, "**") // evita triple negrita
    .replace(/^#+\s*$/gm, "")  // elimina títulos vacíos
    .trim();
}
