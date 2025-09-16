// test-litis-prod.js
import fetch from "node-fetch";

const URL = "https://webbuholex-nuevo.vercel.app/api/ia-litisbotchat";

async function test() {
  const resp = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pregunta: "¿Qué es la prescripción adquisitiva en derecho civil peruano?",
      userId: "test"
    })
  });

  const data = await resp.json();
  console.log("✅ Respuesta:", data);
}

test().catch(console.error);
