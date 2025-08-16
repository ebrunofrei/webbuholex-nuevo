// migrar-requires-a-import.mjs
import fs from "fs";
import path from "path";

// Carpeta base donde migrar (ajusta si es necesario)
const BASE_DIR = process.cwd(); // Carpeta actual

// Función para migrar require() a import en un archivo
function migrarArchivo(filePath) {
  let code = fs.readFileSync(filePath, "utf8");

  // Cambia require() por import simple (no destructurado)
  code = code.replace(
    /const\s+(\w+)\s*=\s*require\(["'`](.+?)["'`]\);?/g,
    'import $1 from "$2";'
  );

  // Cambia require() por import destructurado
  code = code.replace(
    /const\s+{([^}]+)}\s*=\s*require\(["'`](.+?)["'`]\);?/g,
    'import { $1 } from "$2";'
  );

  // Cambia module.exports por export default
  code = code.replace(
    /module\.exports\s*=\s*(\w+);?/g,
    "export default $1;"
  );

  // Cambia exports.<name> por export const <name>
  code = code.replace(
    /exports\.(\w+)\s*=\s*(\w+);?/g,
    "export const $1 = $2;"
  );

  fs.writeFileSync(filePath, code, "utf8");
  console.log(`✅ Migrado a import: ${filePath}`);
}

// Recorre la carpeta recursivamente
function traverseAndMigrate(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseAndMigrate(fullPath);
    } else if (fullPath.endsWith(".js")) {
      migrarArchivo(fullPath);
    }
  });
}

// --- EJECUCIÓN ---
console.log(`🔄 Migrando require() a import en: ${BASE_DIR}`);
traverseAndMigrate(BASE_DIR);
console.log("✔️ Migración básica completada. Revisa imports complejos o destructurados manualmente.");
