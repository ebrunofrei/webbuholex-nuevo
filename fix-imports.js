// fix-imports.js
import fs from "fs";
import path from "path";

const rootDir = path.join(process.cwd(), "src");
const targetImport = "@/firebase";

// Mapeo de imports de Firebase a "@/firebase"
const replacements = [
  { match: /from\s+["']firebase\/firestore["']/g, replace: `from "${targetImport}"` },
  { match: /from\s+["']firebase\/auth["']/g, replace: `from "${targetImport}"` },
  { match: /from\s+["']firebase\/storage["']/g, replace: `from "${targetImport}"` },
  { match: /from\s+["']firebase\/messaging["']/g, replace: `from "${targetImport}"` },
  { match: /from\s+["']firebase\/app["']/g, replace: `from "${targetImport}"` }
];

// Función para recorrer archivos
function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      let content = fs.readFileSync(fullPath, "utf8");
      let updated = content;

      replacements.forEach(r => {
        updated = updated.replace(r.match, r.replace);
      });

      if (updated !== content) {
        fs.writeFileSync(fullPath, updated, "utf8");
        console.log(`✅ Actualizado: ${fullPath}`);
      }
    }
  }
}

// Ejecutar
console.log("🚀 Corrigiendo imports de Firebase...");
scanDir(rootDir);
console.log("🎉 Limpieza finalizada.");
