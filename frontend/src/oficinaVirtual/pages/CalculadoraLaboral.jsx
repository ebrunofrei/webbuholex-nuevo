import React, { useState } from "react";
import { Calendar, User, DollarSign, RefreshCcw, CheckCircle } from "lucide-react";

// Utilidades para cálculos
function diasEntreFechas(inicio, fin) {
  const di = new Date(inicio), df = new Date(fin);
  return Math.max(0, Math.round((df - di) / (1000 * 60 * 60 * 24)));
}

function mesesEntreFechas(inicio, fin) {
  const di = new Date(inicio), df = new Date(fin);
  let meses = (df.getFullYear() - di.getFullYear()) * 12 + (df.getMonth() - di.getMonth());
  if (df.getDate() >= di.getDate()) meses += 1;
  return Math.max(1, meses);
}

const motivosCese = [
  "Renuncia voluntaria",
  "Despido arbitrario",
  "Vencimiento de contrato",
  "Mutuo acuerdo",
  "Cese colectivo",
  "Muerte del trabajador",
];

const PASOS = [
  "Datos personales",
  "Datos de relación laboral",
  "Beneficios sociales",
  "Resumen",
];

export default function CalculadoraLaboral() {
  const [paso, setPaso] = useState(0);
  const [form, setForm] = useState({
    nombre: "",
    fechaIngreso: "",
    fechaCese: "",
    sueldo: "",
    motivo: motivosCese[0],
    vacacionesTomadas: false,
    gratificacionesPendientes: false,
    ctsPendiente: false,
  });
  const [resultado, setResultado] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const calcularBeneficios = () => {
    const { fechaIngreso, fechaCese, sueldo, motivo, vacacionesTomadas, gratificacionesPendientes, ctsPendiente } = form;
    if (!fechaIngreso || !fechaCese || !sueldo) return null;

    const diasTrabajados = diasEntreFechas(fechaIngreso, fechaCese) + 1;
    const mesesTrabajados = mesesEntreFechas(fechaIngreso, fechaCese);

    const vacaciones = vacacionesTomadas ? 0 : Math.round((diasTrabajados / 360) * sueldo * 1);
    const gratificacion = gratificacionesPendientes ? Math.round((mesesTrabajados / 12) * sueldo) : 0;
    const cts = ctsPendiente ? Math.round((mesesTrabajados / 12) * sueldo / 2) : 0;

    let indemnizacion = 0;
    if (motivo === "Despido arbitrario") {
      indemnizacion = Math.round(mesesTrabajados / 12 * sueldo * 1.5);
    }

    const total = vacaciones + gratificacion + cts + indemnizacion;

    return {
      diasTrabajados,
      mesesTrabajados,
      vacaciones,
      gratificacion,
      cts,
      indemnizacion,
      total,
    };
  };

  const esPasoValido = () => {
    if (paso === 0) return form.nombre.trim().length > 2;
    if (paso === 1) return form.fechaIngreso && form.fechaCese && Number(form.sueldo) > 0;
    if (paso === 2) return true;
    return true;
  };

  const avanzar = () => {
    if (paso === PASOS.length - 2) {
      const r = calcularBeneficios();
      setResultado(r);
    }
    setPaso((p) => Math.min(p + 1, PASOS.length - 1));
  };
  const retroceder = () => setPaso((p) => Math.max(0, p - 1));

  const reiniciar = () => {
    setPaso(0);
    setForm({
      nombre: "",
      fechaIngreso: "",
      fechaCese: "",
      sueldo: "",
      motivo: motivosCese[0],
      vacacionesTomadas: false,
      gratificacionesPendientes: false,
      ctsPendiente: false,
    });
    setResultado(null);
  };

  // Función para copiar resultado (solo el detalle)
  const copiarDetalle = () => {
    const el = document.getElementById('detalle-beneficio-laboral');
    if (el) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      try {
        document.execCommand('copy');
        selection.removeAllRanges();
        alert('¡Detalle copiado al portapapeles!');
      } catch (e) {
        alert('No se pudo copiar el texto automáticamente.');
      }
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-xl shadow-lg p-4 sm:p-8 mt-4 mb-8 border border-[#ffd6cb]" style={{ minWidth: 0 }}>
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="text-[#b03a1a]" size={34} />
        <h2 className="text-2xl font-bold text-[#b03a1a]">Calculadora de Beneficios Sociales</h2>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {PASOS.map((p, i) => (
          <span key={i} className={`px-2 py-1 rounded text-xs sm:text-base ${paso === i ? "bg-[#b03a1a] text-white" : "bg-gray-100 text-gray-500"}`}>{p}</span>
        ))}
      </div>

      {/* Paso 0 */}
      {paso === 0 && (
        <div>
          <label className="block mb-2 text-sm font-semibold">Nombre del trabajador</label>
          <div className="flex items-center gap-2 mb-4">
            <User className="text-[#b03a1a]" />
            <input type="text" className="border rounded px-3 py-2 w-full" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ejemplo: Juan Pérez" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="bg-[#b03a1a] text-white px-5 py-2 rounded font-semibold" onClick={avanzar} disabled={!esPasoValido()}>Siguiente</button>
          </div>
        </div>
      )}

      {/* Paso 1 */}
      {paso === 1 && (
        <div>
          <label className="block mb-1 text-sm font-semibold">Fecha de ingreso</label>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-[#b03a1a]" />
            <input type="date" className="border rounded px-3 py-2 w-full" name="fechaIngreso" value={form.fechaIngreso} onChange={handleChange} />
          </div>
          <label className="block mb-1 text-sm font-semibold">Fecha de cese</label>
          <input type="date" className="border rounded px-3 py-2 w-full mb-4" name="fechaCese" value={form.fechaCese} onChange={handleChange} />

          <label className="block mb-1 text-sm font-semibold">Remuneración mensual (S/)</label>
          <input type="number" min="0" step="0.01" className="border rounded px-3 py-2 w-full mb-4" name="sueldo" value={form.sueldo} onChange={handleChange} placeholder="Ejemplo: 1500" />

          <label className="block mb-1 text-sm font-semibold">Motivo de cese</label>
          <select className="border rounded px-3 py-2 w-full mb-4" name="motivo" value={form.motivo} onChange={handleChange}>
            {motivosCese.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <div className="flex justify-between gap-2">
            <button className="px-5 py-2 rounded font-semibold border border-[#b03a1a] text-[#b03a1a] bg-white" onClick={retroceder}>Anterior</button>
            <button className="bg-[#b03a1a] text-white px-5 py-2 rounded font-semibold" onClick={avanzar} disabled={!esPasoValido()}>Siguiente</button>
          </div>
        </div>
      )}

      {/* Paso 2 */}
      {paso === 2 && (
        <div>
          <label className="block mb-2 text-sm font-semibold">Beneficios pendientes</label>
          <div className="flex flex-col gap-3 mb-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="vacacionesTomadas" checked={form.vacacionesTomadas} onChange={handleChange} />
              ¿El trabajador ya tomó todas sus vacaciones?
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="gratificacionesPendientes" checked={form.gratificacionesPendientes} onChange={handleChange} />
              ¿Tiene gratificaciones pendientes de pago?
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="ctsPendiente" checked={form.ctsPendiente} onChange={handleChange} />
              ¿Tiene CTS pendiente de pago?
            </label>
          </div>
          <div className="flex justify-between gap-2">
            <button className="px-5 py-2 rounded font-semibold border border-[#b03a1a] text-[#b03a1a] bg-white" onClick={retroceder}>Anterior</button>
            <button className="bg-[#b03a1a] text-white px-5 py-2 rounded font-semibold" onClick={avanzar}>Calcular</button>
          </div>
        </div>
      )}

      {/* Paso 3 - RESUMEN */}
      {paso === 3 && resultado && (
        <div>
          <div id="detalle-beneficio-laboral" className="w-full max-w-lg mx-auto bg-white rounded-xl shadow-lg p-4 sm:p-8 border border-[#ffd6cb]" style={{ minWidth: 0 }}>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="text-green-600" /> <span className="font-semibold text-lg text-[#b03a1a]">Resumen de Beneficios Sociales</span>
            </div>
            <table className="w-full text-sm mb-4 border overflow-x-auto block">
              <tbody>
                <tr className="bg-[#f9e5df]">
                  <td className="font-semibold py-1 px-2">Días trabajados</td>
                  <td className="py-1 px-2 text-right">{resultado.diasTrabajados}</td>
                </tr>
                <tr>
                  <td className="font-semibold py-1 px-2">Vacaciones truncas</td>
                  <td className="py-1 px-2 text-right">S/ {resultado.vacaciones.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="font-semibold py-1 px-2">Gratificaciones truncas</td>
                  <td className="py-1 px-2 text-right">S/ {resultado.gratificacion.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="font-semibold py-1 px-2">CTS trunca</td>
                  <td className="py-1 px-2 text-right">S/ {resultado.cts.toLocaleString()}</td>
                </tr>
                <tr className="bg-[#f9e5df]">
                  <td className="font-semibold py-1 px-2">Indemnización</td>
                  <td className="py-1 px-2 text-right">S/ {resultado.indemnizacion.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="font-bold py-2 px-2 text-[#b03a1a]">TOTAL A PAGAR</td>
                  <td className="font-bold py-2 px-2 text-[#b03a1a] text-xl text-right">S/ {resultado.total.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {/* EXPLICACIÓN LEGAL + TIPS */}
            <div className="bg-[#fff6f0] border-l-4 border-[#b03a1a] rounded px-4 py-3 text-sm text-gray-700 mb-2 mt-3">
              <div className="font-bold mb-2 text-[#b03a1a]">Fundamento del cálculo de beneficios sociales</div>
              <p className="mb-2">
                Este resultado se ha generado aplicando la normativa laboral peruana vigente y la información que usted ingresó. Cada concepto se calcula así:
              </p>
              <ul className="list-disc pl-5 space-y-1 mb-2">
                <li>
                  <b>Días trabajados:</b> Se cuentan desde la fecha de ingreso hasta la fecha de cese, conforme al cómputo civil de plazos (<i>art. 183 Código Civil</i>).
                  <br />
                  <span className="text-xs text-gray-500">
                    <b>Tip:</b> Verifique que las fechas coincidan con las de su contrato y boletas de pago, para evitar omisiones.
                  </span>
                </li>
                <li>
                  <b>Vacaciones truncas:</b> Si no se disfrutaron todas las vacaciones ganadas, se liquida el saldo proporcional según <i>D. Leg. 713</i> (remuneración mensual × días laborados / 360).
                  <br />
                  <span className="text-xs text-gray-500">
                    <b>Tip:</b> Corresponde pago incluso por vacaciones no gozadas si fue despedido o renunció.
                  </span>
                </li>
                <li>
                  <b>Gratificaciones truncas:</b> Si tiene gratificaciones pendientes (julio/diciembre), se calcula la parte proporcional (<i>Ley N.º 27735</i>: remuneración mensual × meses laborados / 12).
                  <br />
                  <span className="text-xs text-gray-500">
                    <b>Tip:</b> Las gratificaciones deben ser incluidas aún si no se trabajó el semestre completo.
                  </span>
                </li>
                <li>
                  <b>CTS trunca:</b> Aplica cuando no se depositó todo lo correspondiente. Se calcula conforme al <i>DS 001-97-TR</i>: (remuneración mensual × meses laborados / 12) ÷ 2.
                  <br />
                  <span className="text-xs text-gray-500">
                    <b>Tip:</b> Si su CTS no fue depositada en la entidad financiera, puede reclamar intereses legales.
                  </span>
                </li>
                <li>
                  <b>Indemnización por despido arbitrario:</b> Procede si el cese fue sin causa legal (<i>D. Leg. 728, art. 38</i>). Es 1.5 sueldos por cada año, proporcional a los meses laborados.
                  <br />
                  <span className="text-xs text-gray-500">
                    <b>Tip:</b> Exija carta de despido. Si no la recibió, presuma despido arbitrario para exigir este pago.
                  </span>
                </li>
                <li>
                  <b>Total a pagar:</b> Es la suma de todos los beneficios calculados.
                  <br />
                  <span className="text-xs text-gray-500">
                    <b>Tip:</b> Guarde este detalle e imprímalo para sustentar su reclamo o anexarlo a un expediente.
                  </span>
                </li>
              </ul>
              <div className="mt-2 text-xs text-gray-600">
                <b>Nota legal:</b> Este resultado es una referencia orientativa. Puede variar según el régimen, acuerdos colectivos, convenios o jurisprudencia aplicable. Para casos especiales o controversias, consulte con su asesor legal.
              </div>
            </div>

            {/* BOTONES IMPRESIÓN Y COPIAR */}
            <div className="flex gap-2 mt-3 mb-1 no-print">
              <button
                onClick={() => window.print()}
                className="bg-[#b03a1a] text-white px-4 py-2 rounded font-semibold hover:bg-[#a87247]"
                title="Imprimir o guardar en PDF"
              >
                Imprimir PDF
              </button>
              <button
                onClick={copiarDetalle}
                className="border border-[#b03a1a] text-[#b03a1a] px-4 py-2 rounded font-semibold bg-white hover:bg-[#ffe5dc]"
                title="Copiar detalle para expediente"
              >
                Copiar resultado
              </button>
            </div>
          </div>
          <div className="flex justify-between gap-2 mt-4">
            <button className="px-5 py-2 rounded font-semibold border border-[#b03a1a] text-[#b03a1a] bg-white" onClick={reiniciar}>
              <RefreshCcw className="inline mr-2" size={16} /> Nuevo cálculo
            </button>
          </div>
        </div>
      )}

      {/* Paso 3 - sin resultado (falla) */}
      {paso === 3 && !resultado && (
        <div className="text-center text-red-600 py-8">
          <p>Error en el cálculo. Revisa los datos ingresados.</p>
          <button className="px-5 py-2 rounded font-semibold border border-[#b03a1a] text-[#b03a1a] bg-white mt-4" onClick={reiniciar}>
            <RefreshCcw className="inline mr-2" size={16} /> Nuevo cálculo
          </button>
        </div>
      )}
    </div>
  );
}
