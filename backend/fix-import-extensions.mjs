// fix-import-extensions.mjs
import fs from "fs";
import path from "path";

const BASE_DIR = process.cwd();

function fixImportExtensionsInFile(filePath) {
  let code = fs.readFileSync(filePath, "utf8");
  // Corrige import ... from "./algo"
  code = code.replace(
    /from\s+['"](\.[^'"]+?)(?<!\.js)['"]/g,
    (match, p1) => `from '${p1}.js'`
  );
  fs.writeFileSync(filePath, code, "utf8");
  console.log(`✅ Fix import ext: ${filePath}`);
}

function traverseAndFix(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory() && file !== "node_modules") {
      traverseAndFix(fullPath);
    } else if (fullPath.endsWith(".js")) {
      fixImportExtensionsInFile(fullPath);
    }
  });
}

console.log(`🔧 Corrigiendo imports locales en: ${BASE_DIR}`);
traverseAndFix(BASE_DIR);
console.log("✔️ Listo. Revisa los imports y prueba el backend en modo ESM.");
