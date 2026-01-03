export async function calcularPlazo({
  cantidad,
  tipo = "habiles",
  tz = "America/Lima",
  startUnix,     // recomendado: usa el "server now" unix
  startISO,
  ajusteInhabil = true,
}) {
  const res = await fetch("/api/plazos/calcular", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cantidad, tipo, tz, startUnix, startISO, ajusteInhabil }),
  });
  if (!res.ok) throw new Error("No se pudo calcular el plazo");
  return res.json();
}
const dueLocalDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: out.tz,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date(out.result.endISO));
