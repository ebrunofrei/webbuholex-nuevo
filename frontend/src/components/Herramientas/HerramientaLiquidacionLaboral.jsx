import React, { useState, useRef } from "react";

function calcularTiempo(ingreso, cese) {
  const fi = new Date(ingreso), fc = new Date(cese);
  let años = fc.getFullYear() - fi.getFullYear();
  let meses = fc.getMonth() - fi.getMonth();
  let dias = fc.getDate() - fi.getDate();
  if (dias < 0) { meses--; dias += new Date(fc.getFullYear(), fc.getMonth(), 0).getDate(); }
  if (meses < 0) { años--; meses += 12; }
  return { años, meses, dias };
}

export default function HerramientaLiquidacionLaboral({ onClose }) {
  const [ingreso, setIngreso] = useState("");
  const [cese, setCese] = useState("");
  const [remu, setRemu] = useState("");
  const [diasUltimoMes, setDiasUltimoMes] = useState("");
  const [despido, setDespido] = useState(false);
  const [result, setResult] = useState(null);

  function calcular() {
    if (!ingreso || !cese || !remu) return setResult({ error: "Completa todos los campos obligatorios." });
    const tiempo = calcularTiempo(ingreso, cese);
    const fechaIni = new Date(ingreso), fechaFin = new Date(cese);
    const meses = differenceInMonths(fechaFin, fechaIni) + (differenceInDays(fechaFin, fechaIni) % 30 > 0 ? 1 : 0);
    const remuMensual = parseFloat(remu);
    // CTS (1/12 de remuneración por mes completo + 1/30 por cada día adicional)
    const ctsMeses = Math.floor(meses / 12) * remuMensual;
    const ctsRestante = ((meses % 12) / 12) * remuMensual;
    const vacaciones = (meses / 12) * remuMensual; // 1 remuneración por año, proporcional
    const gratificacion = (meses / 12) * (remuMensual / 2) * 2; // gratif julio y dic
    const pendiente = diasUltimoMes ? (remuMensual / 30) * diasUltimoMes : 0;
    const indemnizacion = despido ? Math.round(((meses/12) * 1.5 * remuMensual)*100)/100 : 0;
    const total = ctsMeses + ctsRestante + vacaciones + gratificacion + pendiente + indemnizacion;

    setResult({
      tiempo, cts: ctsMeses + ctsRestante, vacaciones, gratificacion,
      pendiente, indemnizacion, total
    });
  }
  
console.log("Entrando a HerramientaLiquidacionLaboral");

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-lg font-bold mb-2 text-yellow-900">Calculadora de Beneficios Laborales</h2>
      <a href="#" onClick={e => { e.preventDefault(); onClose && onClose(); }} className="text-xs text-yellow-700 underline mb-2 block">← Volver a herramientas</a>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <label>Fecha ingreso
          <input type="date" value={ingreso} onChange={e => setIngreso(e.target.value)} className="border rounded px-2 py-1 w-full" />
        </label>
        <label>Fecha cese
          <input type="date" value={cese} onChange={e => setCese(e.target.value)} className="border rounded px-2 py-1 w-full" />
        </label>
        <label>Remun. computable S/.
          <input type="number" value={remu} onChange={e => setRemu(e.target.value)} className="border rounded px-2 py-1 w-full" min={0} />
        </label>
        <label>Días últimos mes (opcional)
          <input type="number" value={diasUltimoMes} onChange={e => setDiasUltimoMes(e.target.value)} className="border rounded px-2 py-1 w-full" min={0} max={31} />
        </label>
      </div>
      <div className="flex gap-3 items-center mb-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={despido} onChange={e => setDespido(e.target.checked)} /> Despido arbitrario
        </label>
      </div>
      <button
        className="w-full bg-green-700 text-white py-2 rounded font-bold"
        onClick={calcular}
      >Calcular beneficios</button>

      {/* RESULTADO */}
      {result && (
        <div className="mt-4 bg-yellow-50 p-4 rounded-xl shadow text-brown-800">
          {result.error ? (
            <div className="text-red-600">{result.error}</div>
          ) : (
            <>
              <div className="mb-2 text-sm">
                <b>Tiempo laborado:</b> {result.tiempo.años} años, {result.tiempo.meses} meses, {result.tiempo.dias} días
              </div>
              <ul className="mb-2 text-[16px] leading-6">
                <li>• <b>CTS proporcional:</b> S/. {result.cts.toFixed(2)}</li>
                <li>• <b>Vacaciones truncas:</b> S/. {result.vacaciones.toFixed(2)}</li>
                <li>• <b>Gratificación trunca:</b> S/. {result.gratificacion.toFixed(2)}</li>
                <li>• <b>Remuneración pendiente:</b> S/. {result.pendiente.toFixed(2)}</li>
                {despido && (
                  <li>• <b>Indemnización despido:</b> S/. {result.indemnizacion.toFixed(2)}</li>
                )}
                <li className="mt-2 text-lg"><b>Total:</b> S/. {result.total.toFixed(2)}</li>
              </ul>
              <div className="text-xs text-gray-500 mt-2">
                * Valores referenciales. Verifica con la legislación laboral vigente y posibles descuentos de ley.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
