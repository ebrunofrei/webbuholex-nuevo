// Genera una key estable y única dentro de una lista.
// scope: string corto para diferenciar listas (opcional).
export function keyOf(n, idx, scope = "list") {
  const id = n?.id ?? n?.enlace ?? n?.url ?? n?.titulo ?? "";
  // Normaliza y limita
  const norm = String(id).trim().slice(0, 120);
  // Sufija el índice solo para romper empates entre duplicados
  return `${scope}-${norm || "item"}-${idx}`;
}
