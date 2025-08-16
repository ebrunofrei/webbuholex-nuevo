const fs = require("fs");
const path = require("path");

// Cambia SOLO ESTA línea según tu backend
const BASE_DIR = path.resolve(__dirname, "routes");

function replaceExportsInFile(filePath) {
  let data = fs.readFileSync(filePath, "utf8");
  if (data.includes('module.exports = router')) {
    const newData = data.replace(/module\.exports\s*=\s*router\s*;?/g, 'export default router;');
    fs.writeFileSync(filePath, newData, "utf8");
    console.log(`✅ Fixed export: ${filePath}`);
  }
}

function traverseAndFix(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseAndFix(fullPath);
    } else if (fullPath.endsWith(".js")) {
      replaceExportsInFile(fullPath);
    }
  });
}

console.log("🔄 Reemplazando module.exports = router por export default router...");
traverseAndFix(BASE_DIR);
console.log("🚀 Proceso completado.");
