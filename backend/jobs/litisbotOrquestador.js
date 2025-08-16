// backend/jobs/litisbotOrquestador.js
import { fetchBoletinesIDH } from "../services/scrapingBoletines.js";
import { analizarContenidoLegal } from "../services/litisbotAI.js";
import { enviarNotificacionesInteligentes } from "../services/litisbotNotificaciones.js";
import { db } from "../firebaseAdmin.js";

async function rutinaLitisBot() {
  // 1. Scraping automático
  const boletines = await fetchBoletinesIDH();
  for (const boletin of boletines) {
    // 2. Análisis inteligente (resumen, relevancia, premium, tags)
    const analisis = await analizarContenidoLegal(boletin);

    // 3. Guardar en Firestore con metadata de LitisBot
    await db.collection("boletinesJuridicos").add({
      ...boletin,
      ...analisis, // resumenIA, premium, jurisprudenciaRelacionada, etc.
      creadoPor: "LitisBot",
      fechaAnalisis: new Date().toISOString(),
    });

    // 4. Notificación automática
    await enviarNotificacionesInteligentes({
      titulo: analisis.tituloSugerido,
      mensaje: analisis.resumenIA,
      url: boletin.url,
      destinatarios: analisis.sugeridos,
    });
  }
}

rutinaLitisBot();
