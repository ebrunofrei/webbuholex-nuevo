// ============================================================
// 🧮 Control de cuota diaria de análisis PDF para usuarios FREE
// - FREE: 1 PDF por día
// - PRO: ilimitado
// ============================================================

const KEY = "pdfQuota";

export function canAnalyzePdf(isPro) {
  if (isPro) return true;

  const data = JSON.parse(localStorage.getItem(KEY) || "{}");
  const today = new Date().toISOString().slice(0, 10);

  if (data.date !== today) {
    return true; // nuevo día → permitido
  }

  return data.count < 1; // FREE → solo 1
}

export function registerPdfAnalysis(isPro) {
  if (isPro) return;

  const today = new Date().toISOString().slice(0, 10);
  const data = JSON.parse(localStorage.getItem(KEY) || "{}");

  if (data.date !== today) {
    localStorage.setItem(KEY, JSON.stringify({ date: today, count: 1 }));
  } else {
    const n = data.count || 0;
    localStorage.setItem(KEY, JSON.stringify({ date: today, count: n + 1 }));
  }
}
