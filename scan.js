// scan.js
import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const excludeDirs = ["node_modules", ".git", "__backups__"];
const excludeFiles = [
  "src/firebase.js",
  "src/firebase.dev.js",
  "backend/services/firebaseAdmin.js"
];

function searchInDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) {
        searchInDir(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      if (!excludeFiles.some(f => fullPath.endsWith(f))) {
        const content = fs.readFileSync(fullPath, "utf8");
        const lines = content.split("\n");

        lines.forEach((line, idx) => {
          if (line.includes("initializeApp(")) {
            console.log(`🔍 ${fullPath}:${idx + 1} -> ${line.trim()}`);
          }
        });
      }
    }
  }
}

console.log("🚀 Escaneando proyecto en busca de 'initializeApp('...");
searchInDir(rootDir);
console.log("✅ Escaneo finalizado");
