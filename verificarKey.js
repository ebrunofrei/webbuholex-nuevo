// verificarKey.js
/* eslint-env node */
// deja el resto del archivo igual

import fetch from "node-fetch";

const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const testUrl = `https://firestore.googleapis.com/v1/projects/tu-proyecto/databases/(default)/documents/test`;

async function verificarKey() {
  try {
    const res = await fetch(`${testUrl}?key=${API_KEY}`);
    if (res.status === 403) {
      console.log("❌ API Key bloqueada por restricciones de dominio");
    } else if (res.status === 200) {
      console.log("✅ API Key válida y accesible");
    } else {
      console.log(`⚠️ Respuesta inesperada: ${res.status}`);
    }
  } catch (e) {
    console.error("Error verificando la API Key:", e.message);
  }
}

verificarKey();
