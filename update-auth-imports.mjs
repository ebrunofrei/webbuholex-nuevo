import fs from "fs";
import path from "path";

// Ruta a la carpeta src de tu proyecto
const SRC_DIR = path.resolve("./src");

function getAllJSFiles(dir, files = []) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllJSFiles(fullPath, files);
    } else if (/\.(js|jsx)$/.test(file)) {
      files.push(fullPath);
    }
  });
  return files;
}

function updateImport(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  // Solo buscamos imports de AuthContext
  const regex = /from\s+['"](?:\.{1,2}\/)+context\/AuthContext(?:\.jsx?)?['"]/g;
  let newContent = content;

  // Calcula cuántos niveles ../ necesita desde este archivo hasta src/context/AuthContext
  const relPath = path.relative(path.dirname(filePath), path.join(SRC_DIR, "context", "AuthContext")).replace(/\\/g, "/");
  const importPath = relPath.startsWith(".") ? relPath : "./" + relPath;

  newContent = newContent.replace(regex, `from "${importPath}"`);

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, "utf8");
    console.log("✔️  Actualizado:", filePath, "→", importPath);
  }
}

const files = getAllJSFiles(SRC_DIR);
files.forEach(updateImport);

console.log("🚀 Todos los imports de AuthContext han sido ajustados correctamente.");
