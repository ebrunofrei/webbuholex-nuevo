// ============================================================================
// 🦉 date utils — cálculo de tiempo estable (años/meses/días)
// ----------------------------------------------------------------------------
// Importante: evita el clásico bug de "meses negativos" y "días raros".
// ============================================================================
function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function diffYMD(fechaIngreso, fechaCese) {
  const fi = new Date(fechaIngreso);
  const fc = new Date(fechaCese);

  if (Number.isNaN(fi.getTime()) || Number.isNaN(fc.getTime())) {
    return { años: 0, meses: 0, dias: 0 };
  }

  let años = fc.getFullYear() - fi.getFullYear();
  let meses = fc.getMonth() - fi.getMonth();
  let dias = fc.getDate() - fi.getDate();

  if (dias < 0) {
    meses -= 1;
    dias += daysInMonth(fc.getFullYear(), fc.getMonth() - 1);
  }

  if (meses < 0) {
    años -= 1;
    meses += 12;
  }

  if (años < 0) return { años: 0, meses: 0, dias: 0 };
  return { años, meses, dias };
}

// meses computables (proporcionalidad simple): años*12 + meses + (dias>0 ? 1 : 0)
export function mesesComputables(tiempoYMD) {
  const { años, meses, dias } = tiempoYMD || { años: 0, meses: 0, dias: 0 };
  return años * 12 + meses + (dias > 0 ? 1 : 0);
}
