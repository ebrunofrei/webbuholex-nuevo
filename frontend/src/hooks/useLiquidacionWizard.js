import { useState } from "react";

// Utilidades de fecha y cálculo
function tiempoTrabajado(ingreso, cese) {
  const fi = new Date(ingreso), fc = new Date(cese);
  let years = fc.getFullYear() - fi.getFullYear();
  let months = fc.getMonth() - fi.getMonth();
  let days = fc.getDate() - fi.getDate();
  if (days < 0) { months--; days += new Date(fc.getFullYear(), fc.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  return { years, months, days };
}
function monthsBetween(from, to) {
  const start = new Date(from), end = new Date(to);
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  let days = end.getDate() - start.getDate();
  if (days < 0) { months--; days += new Date(end.getFullYear(), end.getMonth(), 0).getDate(); }
  return { months, days };
}
function calcularCTS(remu, meses, dias) { return (remu / 12) * meses + (remu / 360) * dias; }
function calcularVacaciones(remu, meses, dias) { return (remu / 12) * meses + (remu / 360) * dias; }
function calcularGrati(remu, meses, dias) { return (remu / 6) * meses + (remu / 180) * dias; }
function calcularRemPendiente(remu, dias) { return (remu / 30) * dias; }
function calcularIndemnizacion(remu, años, meses) { return (remu * 1.5) * años + ((remu * 1.5) / 12) * meses; }

export function useLiquidacionWizard({ onFinish }) {
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState({
    ingreso: "",
    cese: "",
    remu: "",
    diasPend: "",
    despido: false,
  });

  const preguntas = [
    {
      tipo: "date",
      label: "¿Cuál es la **fecha de ingreso laboral**? (YYYY-MM-DD)",
      key: "ingreso",
    },
    {
      tipo: "date",
      label: "¿Cuál es la **fecha de cese**? (YYYY-MM-DD)",
      key: "cese",
    },
    {
      tipo: "number",
      label: "¿Cuál es tu **remuneración computable** mensual? (S/.)",
      key: "remu",
    },
    {
      tipo: "number",
      label: "¿Cuántos días pendientes de pago tienes en el último mes?",
      key: "diasPend",
      ayuda: "(Si no corresponde, pon 0)",
    },
    {
      tipo: "boolean",
      label: "¿El cese fue por **despido arbitrario**? (sí/no)",
      key: "despido",
    },
  ];

  function handleUserInput(input) {
    const actual = preguntas[paso];
    let value = input;

    if (actual.tipo === "boolean") {
      value = /^(si|sí|yes|y)$/i.test(input.trim()) ? true : false;
    }
    if (actual.tipo === "number") {
      value = parseFloat(input.replace(",", "."));
      if (isNaN(value)) value = 0;
    }
    setDatos(d => ({ ...d, [actual.key]: value }));

    if (paso < preguntas.length - 1) {
      setPaso(paso + 1);
    } else {
      // Calcular y devolver resumen
      const { ingreso, cese, remu, diasPend, despido } = { ...datos, [actual.key]: value };
      const tiempo = tiempoTrabajado(ingreso, cese);
      const { months, days } = monthsBetween(ingreso, cese);
      const remuNum = parseFloat(remu);
      const cts = calcularCTS(remuNum, months, days);
      const vacaciones = calcularVacaciones(remuNum, months, days);
      const grati = calcularGrati(remuNum, months, days);
      const remPend = diasPend ? calcularRemPendiente(remuNum, diasPend) : 0;
      const indemnizacion = despido ? calcularIndemnizacion(remuNum, tiempo.years, tiempo.months) : 0;
      const total = cts + vacaciones + grati + remPend + indemnizacion;

      onFinish &&
        onFinish({
          tiempo,
          months,
          days,
          cts,
          vacaciones,
          grati,
          remPend,
          indemnizacion,
          total,
          datos: { ingreso, cese, remu, diasPend, despido },
        });
      setPaso(0); // Reset para nuevo cálculo
      setDatos({
        ingreso: "",
        cese: "",
        remu: "",
        diasPend: "",
        despido: false,
      });
    }
  }

  return {
    paso,
    preguntaActual: preguntas[paso],
    handleUserInput,
    datos,
    reset: () => {
      setPaso(0);
      setDatos({
        ingreso: "",
        cese: "",
        remu: "",
        diasPend: "",
        despido: false,
      });
    },
  };
}

