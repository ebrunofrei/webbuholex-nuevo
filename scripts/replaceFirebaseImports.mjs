import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta de servicios y de backups
const servicesPath = path.resolve(__dirname, "../src/services");
const backupPath = path.resolve(__dirname, "../../__backups__");
if (!fs.existsSync(backupPath)) fs.mkdirSync(backupPath);

// Regex de importaciones antiguas de firebase
const firebaseImportRegex = /import\s+.*?from\s+["'](@?firebase|\.\/firebase|\.\/firebaseConfig|firebaseConfig)["'];?/gm;

function updateFirebaseImports(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");

  const hasOldImport = firebaseImportRegex.test(content);
  if (!hasOldImport) return;

  // Crear respaldo
  const filename = path.basename(filePath);
  const backupFile = path.join(backupPath, filename);
  fs.writeFileSync(backupFile, content, "utf-8");

  // Limpiar imports antiguos
  const updatedContent = content
    .replace(firebaseImportRegex, "")
    .replace(/^\s*[\r\n]/gm, "") // líneas vacías
    .trimStart();

  const newImport = `import { db, auth, storage } from "@/firebase";\n\n`;
  fs.writeFileSync(filePath, newImport + updatedContent, "utf-8");
  console.log(`✅ Actualizado: ${filePath}`);
}

// Ejecutar para todos los servicios .js
fs.readdirSync(servicesPath).forEach((file) => {
  if (file.endsWith(".js")) {
    const fullPath = path.join(servicesPath, file);
    updateFirebaseImports(fullPath);
  }
});
