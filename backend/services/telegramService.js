import axios from "axios";
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function enviarTelegram(chatId, mensaje) {
  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: chatId,
    text: mensaje,
    parse_mode: "HTML"
  });
}
export { enviarTelegram };
