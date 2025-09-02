// scan-missing.js
import fs from "fs";
import path from "path";

// --- Configuración ---
const rootDir = process.cwd(); // directorio actual
const excludeDirs = ["node_modules", ".git", "dist", "public", "__backups__", ".vercel"];
const excludeFiles = [
  "src/firebase.js",
  "src/firebase.dev.js",
  "backend/services/firebaseAdmin.js",
  "src/assets/index-"
];

function searchInDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Excluir carpetas
    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) {
        searchInDir(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      // Excluir archivos específicos
      if (!excludeFiles.some(f => fullPath.includes(f))) {
        const content = fs.readFileSync(fullPath, "utf8");

        if (!content.includes("initializeApp(")) {
          console.log(`⚠️  ${fullPath.replace(rootDir, ".")}`);
        }
      }
    }
  }
}

// --- Ejecutar ---
console.log("🚀 Escaneando proyecto en busca de archivos SIN initializeApp...");
searchInDir(rootDir);
console.log("✅ Escaneo finalizado");
