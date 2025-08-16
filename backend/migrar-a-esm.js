// migrar-a-esm.js
import fs from "fs";
import path from "path";

const BASE_DIR = process.cwd();

function migrateFile(filePath) {
  let code = fs.readFileSync(filePath, "utf8");
  // Cambia require() por import
  code = code.replace(/const\s+(\w+)\s*=\s*require\(["'](.+)["']\);?/g, 'import $1 from "$2";');
  // Cambia module.exports por export default
  code = code.replace(/module\.exports\s*=\s*(\w+);/g, 'export default $1;');
  fs.writeFileSync(filePath, code, "utf8");
  console.log(`✔️ Migrado a ESM: ${filePath}`);
}

function traverse(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverse(fullPath);
    } else if (fullPath.endsWith(".js")) {
      migrateFile(fullPath);
    }
  });
}

traverse(BASE_DIR);
console.log("✅ Migración básica completada. Revisa los imports locales (.js) manualmente.");
