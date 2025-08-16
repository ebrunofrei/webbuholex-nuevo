import admin from "firebase-admin";
import fs from "fs/promises";

// Lee el JSON de credenciales usando fs/promises y JSON.parse
const serviceAccount = JSON.parse(
  await fs.readFile(
    new URL("../firebase-service-account.json", import.meta.url)
  )
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export { db };
