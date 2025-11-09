// scripts/fix-db.mjs
import fs from "fs";
import path from "path";

const SERVICES_DIR = "./backend/services";

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  // Reemplaza cualquier declaración de MongoDB "const db = client.db(...)"
  content = content.replace(
    /const\s+db\s*=\s*client\.db\(/g,
    "const mongoDb = client.db("
  );

  // Reemplaza usos posteriores de esa conexión si hacen db.collection
  content = content.replace(/db\.collection\(/g, "mongoDb.collection(");

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`✅ Fixed db conflicts in ${filePath}`);
}

function walkDir(dir) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith(".js")) {
      fixFile(fullPath);
    }
  }
}

walkDir(SERVICES_DIR);
console.log("🎉 Todos los conflictos 'db' de MongoDB fueron renombrados a 'mongoDb'.");
