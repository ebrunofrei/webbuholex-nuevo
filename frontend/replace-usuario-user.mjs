import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carpeta raíz donde buscar (puedes ajustar)
const SRC_DIR = path.join(__dirname, 'src');

function getAllFiles(dir, exts, files = []) {
  fs.readdirSync(dir).forEach((file) => {
    const abs = path.join(dir, file);
    if (fs.statSync(abs).isDirectory()) return getAllFiles(abs, exts, files);
    if (exts.some(ext => file.endsWith(ext))) files.push(abs);
  });
  return files;
}

function replaceInFile(file) {
  let content = fs.readFileSync(file, 'utf-8');
  // Reemplaza todas las variables y propiedades `usuario` por `user`
  const newContent = content.replace(/\busuario\b/g, 'user');
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf-8');
    console.log(`✅ Reemplazado en: ${file}`);
  }
}

function main() {
  const files = getAllFiles(SRC_DIR, ['.js', '.jsx', '.ts', '.tsx']);
  files.forEach(replaceInFile);
  console.log('\n✨ Todos los "usuario" han sido reemplazados por "user".\n');
}

main();
