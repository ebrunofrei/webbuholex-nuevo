// importarNormasFirestore.js
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import normas from "./csvjson.json" assert { type: "json" };

// --- Inicializa Firebase Admin solo una vez ---
if (!getApps().length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error("❌ Falta la variable FIREBASE_SERVICE_ACCOUNT_JSON en el entorno");
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

async function importarNormas() {
  try {
    for (const norma of normas) {
      await db.collection("normas_eleperuano").add(norma); // Cambia el nombre de la colección si lo deseas
      console.log("✔️ Norma agregada:", norma.titulo || norma.nombre || "(sin título)");
    }
    console.log("✅ Importación finalizada");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error al importar normas:", err.message);
    process.exit(1);
  }
}

importarNormas();
