/* ============================================================
   🧠 LITISBOT — MICROKERNEL JURÍDICO (FRONTEND)
   ============================================================
   Rol:
   - Normaliza texto y contexto
   - Detecta fuente (PDF / juris / texto)
   - Deriva sessionId CANÓNICO
   - Envía payload limpio al backend
   ============================================================ */

/* =========================
   IDENTIDAD / ESTILO (LEGACY)
========================= */
export const BASE_IDENTITY = `
ASISTENTE JURÍDICO DE APOYO (BúhoLex / LitisBot).
Salida en texto plano.
La personalidad y el razonamiento profundo se definen en el backend.
`.trim();

export const BASE_REASONING = `
Análisis jurídico racional, ordenado y coherente.
`.trim();

export const BASE_STYLE = `
Texto claro y directo. Pregunta solo si falta información esencial.
`.trim();

/* =========================
   Helpers
========================= */
function clean(str = "") {
  return String(str ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clampText(str = "", max = 12000) {
  const s = clean(str);
  return s.length > max ? s.slice(0, max) : s;
}

function looksLikeSimpleDefinition(texto = "") {
  const t = clean(texto).toLowerCase();
  return t.length < 90 && /^(que|qué)\s+es\s+/.test(t);
}

function detectMateriaLigera(texto = "") {
  const t = clean(texto).toLowerCase();
  if (/penal|fiscal|delito|cpp/.test(t)) return "penal";
  if (/civil|contrato|posesi[oó]n|prescripci[oó]n/.test(t)) return "civil";
  if (/laboral|despido|sunafil/.test(t)) return "laboral";
  if (/administrativo|lpag|tupa|nulidad/.test(t)) return "administrativo";
  return "general";
}

/* =========================
   FUENTE
========================= */
export function detectSource({ pdfCtx, jurisDoc, texto }) {
  if (pdfCtx?.jurisTextoBase) return "pdfUsuario";
  if (jurisDoc) return "repositorioInterno";
  if (texto) return "textoLibre";
  return "desconocido";
}

/* =========================
   JURIS → TEXTO PLANO
========================= */
export function buildJurisPlainText(j) {
  if (!j) return "";
  const out = [];

  if (j.titulo) out.push(`TÍTULO: ${j.titulo}`);
  if (j.numeroExpediente) out.push(`EXPEDIENTE: ${j.numeroExpediente}`);
  if (j.organo || j.sala) out.push(`ÓRGANO: ${(j.organo || "")} ${(j.sala || "")}`);
  if (j.fechaResolucion) out.push(`FECHA: ${j.fechaResolucion}`);
  if (j.sumilla) out.push(`SUMILLA:\n${clean(j.sumilla)}`);

  return clampText(out.join("\n\n"), 12000);
}

/* =========================
   KERNEL RATIO (CONDICIONAL)
========================= */
export function applyKernelRatio({ baseText, materia }) {
  return clean(`
CONTEXTO DOCUMENTAL:
${baseText || "Sin documento base."}

MATERIA: ${materia}

Instrucción: análisis jurídico claro y estratégico.
`);
}

/* ============================================================
   BUILD PAYLOAD — CANÓNICO
============================================================ */
export function buildPayload({
  prompt,
  usuarioId = "invitado",
  caseId,                 // 🔒 OBLIGATORIO
  pdfCtx = null,
  jurisDoc = null,
  materia = null,
}) {
  if (!caseId) {
    throw new Error("Kernel: caseId requerido (no se puede inferir)");
  }

  const sessionId = `case_${caseId}`;
  const promptSafe = clampText(prompt || "", 8000);
  const materiaSafe = materia || detectMateriaLigera(promptSafe);

  const fuente = detectSource({ pdfCtx, jurisDoc, texto: promptSafe });

  let textoBase = "";
  if (fuente === "pdfUsuario") {
    textoBase = clampText(pdfCtx?.jurisTextoBase || "", 12000);
  } else if (fuente === "repositorioInterno") {
    textoBase = buildJurisPlainText(jurisDoc);
  }

  const esSimple = looksLikeSimpleDefinition(promptSafe);
  const hayDocumento = Boolean(textoBase);

  const razonamiento =
    esSimple && !hayDocumento
      ? null
      : applyKernelRatio({ baseText: textoBase, materia: materiaSafe });

  return {
    // 🔒 Identidad canónica
    usuarioId,
    caseId,
    sessionId,

    // Texto
    prompt: promptSafe,
    materia: materiaSafe,

    // Contexto
    fuente,
    jurisTextoBase: hayDocumento ? textoBase : null,

    // Legacy compat
    identidad: BASE_IDENTITY,
    razonamiento,
  };
}

export default {
  buildPayload,
};
