// scripts/test-noticias.js
import fetch from "node-fetch";

const BASE = "http://localhost:3000/api";

async function testNoticias(tipo = "general") {
  console.log(`\n=== 📰 Test noticias ${tipo} ===`);
  try {
    const res = await fetch(`${BASE}/noticias?tipo=${tipo}&page=1&limit=5`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    console.log(`Total: ${data.items?.length || 0}`);
    if (data.items?.length) {
      console.log("Primer título:", data.items[0].titulo || "sin titulo");
      console.log("ID:", data.items[0]._id || "sin id");
    }
  } catch (err) {
    console.error(`❌ Error en noticias ${tipo}:`, err.message);
  }
}

(async () => {
  await testNoticias("general");
  await testNoticias("juridica");
})();
