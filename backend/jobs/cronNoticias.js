// backend/jobs/cronNoticias.js
import cron from "node-cron";
import { actualizarNoticias } from "#services/noticiasService.js";

/**
 * 📰 Job: actualiza noticias cada 3 horas
 */
export function cronNoticias() {
  cron.schedule("0 */3 * * *", async () => {
    try {
      console.log("⏳ Ejecutando cron de noticias...");
      await actualizarNoticias();
      console.log("✅ Noticias actualizadas correctamente.");
    } catch (err) {
      console.error("❌ Error en cron de noticias:", err.message);
    }
  });
}
