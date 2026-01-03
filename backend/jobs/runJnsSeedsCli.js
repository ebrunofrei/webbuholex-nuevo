// backend/jobs/runJnsSeedsCli.js
// ============================================================
// 🦉 BúhoLex | Runner de seeds JNS (carga masiva secuencial)
// ------------------------------------------------------------
// - Toma la lista de jnsSeeds y ejecuta el scraper JNS por cada query
// - Usa el CLI existente:  node backend/scrapers/jurisprudenciaNacional.js "query"
// - Respeta una pausa entre seeds para no abusar del portal del PJ
// ============================================================

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import jnsSeeds from "./jnsSeeds.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta absoluta al scraper actual (NO la cambiamos)
const scraperPath = path.resolve(
  __dirname,
  "../scrapers/jurisprudenciaNacional.js"
);

// Pequeña ayuda para esperar entre seeds
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ejecuta el scraper JNS para una seed concreta usando el CLI existente.
 * Respeta stdio: "inherit" para ver logs en tiempo real.
 */
function runSeedCli(seed) {
  return new Promise((resolve, reject) => {
    console.log(
      `\n[JNS-SEEDS] Ejecutando seed: ${seed.id} | materia=${seed.materia} | query="${seed.query}"`
    );

    const child = spawn("node", [scraperPath, seed.query], {
      stdio: "inherit",
      shell: false,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        console.log(`[JNS-SEEDS] Seed completada OK: ${seed.id}`);
        resolve();
      } else {
        console.error(
          `[JNS-SEEDS] Seed con error (code=${code}): ${seed.id}`
        );
        reject(new Error(`Seed ${seed.id} exited with code ${code}`));
      }
    });

    child.on("error", (err) => {
      console.error(`[JNS-SEEDS] Error al lanzar seed ${seed.id}:`, err);
      reject(err);
    });
  });
}

/**
 * Runner principal: recorre todas las seeds en orden.
 * Puedes filtrar o limitar usando variables de entorno si hace falta.
 */
async function main() {
  console.log("============================================================");
  console.log("🦉 BúhoLex | Runner de seeds JNS (carga masiva)");
  console.log("============================================================");

  for (const seed of jnsSeeds) {
    try {
      await runSeedCli(seed);
    } catch (err) {
      console.error(`[JNS-SEEDS] Falló seed ${seed.id}:`, err.message);
      // seguimos con la siguiente para que no se caiga todo el batch
    }

    // Pausa de cortesía entre seeds (por ej. 15 segundos)
    console.log("[JNS-SEEDS] Pausa de 15 segundos antes de la siguiente seed…");
    await delay(15000);
  }

  console.log("============================================================");
  console.log("✅ JNS-SEEDS: Proceso terminado. Revisa MongoDB para ver la carga.");
  console.log("============================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("[JNS-SEEDS] Error fatal en runner:", err);
  process.exit(1);
});
