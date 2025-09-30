    // backend/jobs/cleanupLogs.js
import { db } from "#services/myFirebaseAdmin.js";
import cron from "node-cron";

/**
 * 🧹 Job: elimina registros de busquedas_legales mayores a 30 días
 */
function startCleanupLogs() {
  // Corre todos los días a las 2 AM
  cron.schedule("0 2 * * *", async () => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);

      const snapshot = await db
        .collection("busquedas_legales")
        .where("fecha", "<", cutoff)
        .get();

      if (snapshot.empty) {
        console.log("🧹 No hay logs antiguos que limpiar.");
        return;
      }

      const batch = db.batch();
      snapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      console.log(`🧹 Eliminados ${snapshot.size} logs antiguos de busquedas_legales.`);
    } catch (err) {
      console.error("❌ Error limpiando logs:", err.message);
    }
  });
}

export default startCleanupLogs;
