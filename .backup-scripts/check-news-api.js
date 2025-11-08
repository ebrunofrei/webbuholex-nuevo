// scripts/check-news-api.js
import fetch from "node-fetch";

const BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3000/api";

async function checkNoticias(tipo = "general", limit = 5) {
  const url = `${BASE_URL}/noticias?tipo=${tipo}&limit=${limit}`;
  console.log(`\n🌐 Probando: ${url}`);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    console.log(`✅ Recibidas ${data.items.length} noticias de tipo "${tipo}"`);
    data.items.forEach((n, i) => {
      console.log(`   ${i + 1}. ${n.titulo} (${n.fuente})`);
    });
  } catch (err) {
    console.error(`❌ Error probando noticias [${tipo}]:`, err.message);
  }
}

async function checkNoticiasGuardadas(userId) {
  if (!userId) {
    console.log("\n⚠️ No se probó noticias guardadas (falta userId).");
    return;
  }
  const url = `${BASE_URL}/noticias-guardadas?userId=${userId}`;
  console.log(`\n🌐 Probando: ${url}`);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    console.log(`✅ Usuario ${userId} tiene ${data.length} noticias guardadas.`);
    data.forEach((n, i) => {
      console.log(`   ${i + 1}. ${n.titulo} (${n.fuente})`);
    });
  } catch (err) {
    console.error("❌ Error probando noticias guardadas:", err.message);
  }
}

(async () => {
  console.log("=== 📰 Check Noticias API ===");

  await checkNoticias("general", 5);
  await checkNoticias("juridica", 5);

  // 👇 Cambia por un UID real para probar guardadas
  await checkNoticiasGuardadas("UID_DE_PRUEBA");
})();
