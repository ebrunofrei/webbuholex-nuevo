// importarNormasFirestore.js
const admin = require("firebase-admin");
const normas = require("./csvjson.json"); // Ajusta al nombre de tu archivo de normas
const serviceAccount = require("./firebase-service-account.json"); // Ajusta al nombre de tu JSON de credenciales

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function importarNormas() {
  for (const norma of normas) {
    await db.collection("normas_eleperuano").add(norma); // Puedes cambiar el nombre aquí si prefieres otro
    console.log("Norma agregada:", norma.titulo || norma.nombre || "(sin título)");
  }
  console.log("Importación finalizada");
  process.exit(0);
}

importarNormas();
