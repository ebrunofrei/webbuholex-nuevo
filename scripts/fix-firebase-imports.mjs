import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcPath = path.resolve(__dirname, "../src");

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  let updated = content;

  // Reemplaza cualquier import con firebaseConfig.js
  updated = updated.replace(/from\s+["'][\.\/]+services\/firebaseConfig["']/g, "from \"@/firebase\"");
  updated = updated.replace(/from\s+["'][\.\/]+services\/firebaseConfig\.js["']/g, "from \"@/firebase\"");

  if (updated !== content) {
    fs.writeFileSync(filePath, updated, "utf-8");
    console.log(`✅ Fixed: ${filePath}`);
  }
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && /\.(jsx?|tsx?)$/.test(entry.name)) {
      replaceInFile(fullPath);
    }
  }
}

console.log("🔎 Buscando imports antiguos de firebaseConfig...");
scanDir(srcPath);
console.log("🎉 Reemplazo completado. Ahora prueba: npm run dev");
