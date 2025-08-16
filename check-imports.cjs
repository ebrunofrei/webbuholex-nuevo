// check-imports.js
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, "src");

function getAllSourceFiles(dir, fileList = []) {
  // Nombres de carpetas a ignorar
  const ignoreDirs = ['node_modules', '.git', '.vscode', '$Recycle.Bin'];
  const files = fs.readdirSync(dir, { withFileTypes: true });

  files.forEach(file => {
    // Ignora directorios del sistema y ocultos
    if (ignoreDirs.includes(file.name) || file.name.startsWith('.')) return;
    const filePath = path.join(dir, file.name);

    if (file.isDirectory()) {
      getAllSourceFiles(filePath, fileList);
    } else if (file.name.endsWith('.js') || file.name.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function validateImports(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const importRegex = /import .* from ['"](\..*?)['"]/g;
  const errors = [];
  let match;

  while ((match = importRegex.exec(fileContent)) !== null) {
    const importPath = match[1];
    // Resuelve la ruta absoluta del import relativo
    let resolvedPath = path.resolve(path.dirname(filePath), importPath);
    // Añade .js y .jsx si no existe extensión
    if (!fs.existsSync(resolvedPath) && fs.existsSync(resolvedPath + ".js")) {
      resolvedPath = resolvedPath + ".js";
    } else if (!fs.existsSync(resolvedPath) && fs.existsSync(resolvedPath + ".jsx")) {
      resolvedPath = resolvedPath + ".jsx";
    }
    // Si no existe el archivo, lo marca como error
    if (!fs.existsSync(resolvedPath)) {
      errors.push(`❌ [${filePath}] importa ruta no encontrada: ${importPath}`);
    }
  }
  return errors;
}

// --- Script principal ---
console.log('\n🔎 Analizando imports relativos en archivos fuente...\n');
const allFiles = getAllSourceFiles(SRC);
let totalErrors = 0;

allFiles.forEach(file => {
  const errors = validateImports(file);
  errors.forEach(e => console.log(e));
  totalErrors += errors.length;
});

if (totalErrors === 0) {
  console.log('\n✅ Todos los imports relativos apuntan a archivos existentes!');
} else {
  console.log(`\n❌ Se encontraron ${totalErrors} imports inválidos. Revisa los avisos arriba.`);
}

