import cron from "node-cron";
import { actualizarNoticiasYJurisprudencia } from "../services/litisbotNoticiasAvanzadas.js";

cron.schedule("0 */3 * * *", async () => { // Cada 3 horas
  const total = await actualizarNoticiasYJurisprudencia();
  console.log(`LitisBot: Noticias y jurisprudencia actualizadas (${total})`);
});

console.log("LitisBot cron job iniciado: se ejecutará cada 3 horas.");
