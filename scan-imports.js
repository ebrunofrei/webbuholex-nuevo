// scan-imports.js
import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const excludeDirs = ["node_modules", "dist", ".git", "__backups__"];
const badImports = ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/storage", "firebase/messaging"];

function searchInDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) {
        searchInDir(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      const content = fs.readFileSync(fullPath, "utf8");

      badImports.forEach(pkg => {
        if (content.includes(`"${pkg}"`) || content.includes(`'${pkg}'`)) {
          console.log(`🚨 Import directo de ${pkg} en: ${fullPath}`);
        }
      });
    }
  }
}

console.log("🔎 Escaneando imports indebidos de Firebase...");
searchInDir(rootDir);
console.log("✅ Escaneo finalizado");
