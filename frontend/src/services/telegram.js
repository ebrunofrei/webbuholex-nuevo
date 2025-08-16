export async function enviarTelegram(mensaje) {
  const token = "8003625388:AAEGOHGcU2rkC8MIL_m7QK08ZvAxmEH4KMI";
  const chat_id = "7568568961";
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id,
      text: mensaje,
      parse_mode: "HTML",
    }),
  });
}
