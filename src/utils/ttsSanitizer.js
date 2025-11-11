// utils/ttsSanitizer.js
// Limpia Markdown/HTML y genera SSML amigable para voz (ES)
// - Quita símbolos: **, __, #, `, [], (), ![]()
// - Omite URLs y correos
// - Convierte encabezados/listas en frases con pausas
// - Inserta pausas en [1], [2] (citas) y al final de párrafos
// - Normaliza espacios y signos

const URL_RE = /\b((https?:\/\/|www\.)[^\s)<>"]+)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/gi;

export function stripMarkdownAndHtml(src = "") {
  let s = String(src);

  // Quitar HTML
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|li|h[1-6])>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");

  // Quitar bloques/code
  s = s.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/`[^`]+`/g, " ");

  // Imágenes y enlaces markdown
  s = s.replace(/!\[[^\]]*]\([^)]+?\)/g, " ");
  s = s.replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1");

  // Negritas/cursivas/subrayados markdown
  s = s.replace(/(\*\*|__)(.*?)\1/g, "$2");
  s = s.replace(/(\*|_)(.*?)\1/g, "$2");

  // Encabezados markdown ⇒ texto plano
  s = s.replace(/^\s{0,3}#{1,6}\s*/gm, "");

  // Citas markdown
  s = s.replace(/^\s{0,3}>\s?/gm, "");

  // Listas ⇒ viñetas verbales
  s = s.replace(/^\s*[-*+]\s+/gm, "• ");

  // Números de lista "1. " ⇒ viñeta verbal
  s = s.replace(/^\s*\d+\.\s+/gm, "• ");

  // Citas tipo [1], [2] ⇒ pausa breve (luego las manejamos en SSML)
  // Aquí las dejamos como [n] para detectarlas después
  // Quitar URLs/correos
  s = s.replace(URL_RE, " ");

  // Normalizar espacios y saltos
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.replace(/[ ]{2,}/g, " ");
  s = s.trim();

  // Evitar leer símbolos sueltos
  s = s.replace(/[#`_*~^=]{1,}/g, " ");

  return s;
}

function escapeSsml(text = "") {
  // Escapa XML básico
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Genera SSML limpio:
 * - Párrafos => <p>, oraciones => <s>
 * - [n] (citas) => pausa breve
 * - Abreviaturas comunes (art., num., inc.) con <sub>
 */
export function toSSML(text = "") {
  const clean = stripMarkdownAndHtml(text);

  // Abreviaturas legales comunes
  let t = clean
    .replace(/\bart\.\b/gi, '<sub alias="artículo">art.</sub>')
    .replace(/\bnum\.\b/gi, '<sub alias="número">num.</sub>')
    .replace(/\binc\.\b/gi, '<sub alias="inciso">inc.</sub>')
    .replace(/\bpág\.\b/gi, '<sub alias="página">pág.</sub>');

  // Citas [n] ⇒ pausa
  t = t.replace(/\[\d+\]/g, '<break time="300ms"/>');

  // Partir en párrafos y oraciones
  const paragraphs = t.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const ssmlParas = paragraphs.map(p => {
    const sent = p
      // dividir de forma simple por final de oración
      .split(/([.!?]+)(\s+|$)/)
      .reduce((acc, chunk, i, arr) => {
        if (!chunk.trim()) return acc;
        // reagrupar "frase + separador"
        if (/[.!?]+/.test(chunk) && arr[i - 1]) {
          acc[acc.length - 1] = `${acc[acc.length - 1]}${chunk}`;
        } else {
          acc.push(chunk);
        }
        return acc;
      }, []);
    const ss = sent.map(s => `<s>${escapeSsml(s)}</s>`).join("");
    return `<p>${ss}<break time="350ms"/></p>`;
  }).join("");

  return `<speak xml:lang="es-PE">${ssmlParas}</speak>`;
}

/** API principal: devuelve { plain, ssml } */
export function sanitizeForTTS(text = "") {
  const plain = stripMarkdownAndHtml(text);
  const ssml = toSSML(text);
  return { plain, ssml };
}
