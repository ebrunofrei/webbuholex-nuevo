import fetch from "node-fetch";
import dotenv from "dotenv";

// Cargar variables desde backend/.env
dotenv.config({ path: "./backend/.env" });

const API_KEY = process.env.GNEWS_API_KEY;

async function testNoticias() {
  console.log("\n=== 📰 Test Noticias ===");
  try {
    const res = await fetch("https://gnews.io/api/v4/top-headlines?lang=es&country=pe&max=5&apikey=" + API_KEY);
    const data = await res.json();

    console.log("Noticias recibidas:", data.articles?.length || 0);
    if (data.articles?.length) {
      console.log("Primer título:", data.articles[0].title);
    } else {
      console.log("Respuesta cruda:", JSON.stringify(data));
    }
  } catch (err) {
    console.error("❌ Error noticias:", err.message);
  }
}

await testNoticias();
