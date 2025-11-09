import fetch from "node-fetch";

async function testNoticias(tipo) {
  try {
    console.log(`\n🌐 Probando noticias tipo: ${tipo}`);
    const res = await fetch(`http://localhost:3001/api/noticias-${tipo}?q=peru`);
    const data = await res.json();
    console.log(`✅ ${tipo}:`, data.length, "items recibidos");
  } catch (err) {
    console.error(`❌ Error en ${tipo}:`, err.message);
  }
}

await testNoticias("juridicas");
await testNoticias("generales");
