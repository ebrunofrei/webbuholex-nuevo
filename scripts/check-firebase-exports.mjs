import fs from "fs";
import path from "path";

const ROOT = path.resolve("./src/services");
const FIREBASE_FILE = path.resolve("./src/firebase.js");

// Lee firebase.js y extrae exports
const firebaseContent = fs.readFileSync(FIREBASE_FILE, "utf8");
const exportRegex = /export\s*{([^}]*)}/gs;
let firebaseExports = new Set();

for (const match of firebaseContent.matchAll(exportRegex)) {
  const items = match[1]
    .split(",")
    .map((i) => i.trim())
    .filter(Boolean);
  items.forEach((item) => firebaseExports.add(item));
}

// Escanea servicios
function walk(dir) {
  let results = [];
  fs.readdirSync(dir).forEach((file) => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith(".js") || file.endsWith(".jsx")) {
      results.push(file);
    }
  });
  return results;
}

const serviceFiles = walk(ROOT);

// Busca imports desde "@/firebase"
let missing = [];

for (const file of serviceFiles) {
  const content = fs.readFileSync(file, "utf8");
  const importRegex = /import\s*{([^}]*)}\s*from\s*["']@?\/?firebase["']/g;

  for (const match of content.matchAll(importRegex)) {
    const items = match[1]
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    items.forEach((imp) => {
      if (!firebaseExports.has(imp)) {
        missing.push({ file, imp });
      }
    });
  }
}

// Reporte
if (missing.length) {
  console.log("❌ Faltan exports en firebase.js:");
  missing.forEach((m) => console.log(`  - ${m.imp} usado en ${m.file}`));
} else {
  console.log("✅ Todos los imports de Firebase están cubiertos en firebase.js");
}
