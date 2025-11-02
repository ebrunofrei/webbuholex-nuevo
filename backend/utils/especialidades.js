// ============================================================
// 🦉 BúhoLex | Util de especialidades (backend)
// - Unifica slugs usados por frontend y scraper/seed
// - Permite expandir sin romper el filtro
// ============================================================
export const ESPECIALIDADES = {
  todas: ["todas"],
  penal: ["penal"],
  civil: ["civil"],
  laboral: ["laboral", "derecho laboral"],
  constitucional: ["constitucional"],
  familiar: ["familiar", "familia"],
  administrativo: ["administrativo"],
  comercial: ["comercial", "empresarial"],
  tributario: ["tributario"],
  procesal: ["procesal"],
  registral: ["registral"],
  ambiental: ["ambiental"],
  notarial: ["notarial"],
  penitenciario: ["penitenciario"],
  "consumidor": ["consumidor", "protección al consumidor"],
  "seguridad-social": ["seguridad-social", "seguridad_social", "seguridad social"],
};

export function toEspecialidadQuery(slug) {
  const s = String(slug || "").toLowerCase().trim();
  if (!s || s === "todas") return {};
  const arr = ESPECIALIDADES[s];
  if (!arr) return { especialidadSlug: s }; // fallback exacto
  return { especialidadSlug: { $in: arr } };
}
