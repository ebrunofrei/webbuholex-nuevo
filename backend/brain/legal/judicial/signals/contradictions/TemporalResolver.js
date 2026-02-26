// brain/legal/judicial/signals/contradictions/TemporalResolver.js
export function parseDatesFromText(text) {
  const dates = [];

  // dd/mm/yyyy
  const re1 = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g;
  let m;
  while ((m = re1.exec(text)) !== null) {
    const dd = pad2(m[1]), mm = pad2(m[2]), yyyy = normalizeYear(m[3]);
    dates.push(`${yyyy}-${mm}-${dd}`);
  }

  // “10 de enero de 2024”
  const re2 = /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})\b/gi;
  while ((m = re2.exec(text)) !== null) {
    const dd = pad2(m[1]);
    const mm = monthToNum(m[2]);
    const yyyy = m[3];
    dates.push(`${yyyy}-${mm}-${dd}`);
  }

  return dates;
}

function pad2(x) { return String(x).padStart(2, "0"); }
function normalizeYear(y) { return y.length === 2 ? `20${y}` : y; }
function monthToNum(name) {
  const n = name.toLowerCase();
  const map = {
    enero:"01", febrero:"02", marzo:"03", abril:"04", mayo:"05", junio:"06",
    julio:"07", agosto:"08", setiembre:"09", septiembre:"09", octubre:"10", noviembre:"11", diciembre:"12"
  };
  return map[n] || "01";
}