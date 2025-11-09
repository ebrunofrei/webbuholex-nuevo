// scripts/test-backend.js
import dotenv from "dotenv";
import fetch from "node-fetch";

// Cargar variables de entorno
dotenv.config({ path: ".env.production" }); // o .env.local si pruebas en dev

// Base URL dinámica
const BASE =
  process.env.API_URL || `http://localhost:${process.env.PORT || 4000}/api`;

async function testIA() {
  console.log("\n=== 🤖 Test IA ===");
  try {
    const res = await fetch(`${BASE}/ia`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Hola IA, prueba rápida" }),
    });
    const data = await res.json();
    console.log("Respuesta IA:", data?.respuesta || JSON.stringify(data));
  } catch (err) {
    console.error("❌ Error IA:", err.message);
  }
}

async function testNoticias(tipo = "noticias") {
  console.log(`\n=== 📰 Test ${tipo} ===`);
  try {
    const res = await fetch(`${BASE}/${tipo}?page=1&limit=5`);
    const data = await res.json();
    console.log(
      `Noticias recibidas: ${data?.items?.length || 0}`,
      data?.items?.length ? "\nPrimer título: " + data.items[0].titulo : ""
    );
  } catch (err) {
    console.error(`❌ Error ${tipo}:`, err.message);
  }
}

(async () => {
  await testIA();
  await testNoticias("noticias");
  await testNoticias("noticias-juridicas");
})();
