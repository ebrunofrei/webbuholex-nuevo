// scripts/fix-imports.mjs
import fs from "fs";
import path from "path";

const SERVICES_DIR = "./backend/services";

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  // Reemplaza imports incorrectos de myFirebaseAdmin
  content = content.replace(
    /import\s+firestore\s+from\s+["'].*myFirebaseAdmin\.js["'];?/g,
    'import { db, auth, storage } from "#services/myFirebaseAdmin.js";'
  );

  // Reemplaza cualquier import default viejo
  content = content.replace(
    /import\s+.*myFirebaseAdmin\.js["'];?/g,
    'import { db, auth, storage } from "#services/myFirebaseAdmin.js";'
  );

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`✅ Fixed imports in ${filePath}`);
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

// Ejecuta
walkDir(SERVICES_DIR);
console.log("🎉 Todos los imports en /services fueron normalizados.");
