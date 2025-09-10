// scripts/fix-firebase-imports.mjs
import fs from "fs";
import path from "path";

const rootDir = path.resolve("src/services");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith(".js")) {
      results.push(file);
    }
  });
  return results;
}

function fixImports(file) {
  let content = fs.readFileSync(file, "utf8");
  let modified = false;

  // Reemplazar imports de firestore, auth, storage, messaging por "@/firebase"
  const regex = /from\s+["']firebase\/(firestore|auth|storage|messaging)["']/g;

  if (regex.test(content)) {
    content = content.replace(regex, 'from "@/firebase"');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(file, content, "utf8");
    console.log(`✅ Corregido: ${file}`);
  }
}

// Ejecutar
console.log("🚀 Escaneando y corrigiendo imports de Firebase...");
const files = walk(rootDir);
files.forEach(fixImports);
console.log("🎉 Limpieza finalizada.");
