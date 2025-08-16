// update-imports.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, 'src');

// Regex para reemplazar imports relativos a /store/ y /utils/ por alias @
const importRegex = /(from\s+['"])(\.\.\/)+(store|utils)\/([^'"]+)(['"])/g;

function getAllFiles(dir, exts, files = []) {
  fs.readdirSync(dir).forEach((file) => {
    const abs = path.join(dir, file);
    if (fs.statSync(abs).isDirectory()) return getAllFiles(abs, exts, files);
    if (exts.some(ext => file.endsWith(ext))) files.push(abs);
  });
  return files;
}

function replaceImportsInFile(file) {
  let content = fs.readFileSync(file, 'utf-8');
  let newContent = content.replace(importRegex, (match, pre, dots, folder, rest, post) => {
    return `${pre}@/${folder}/${rest}${post}`;
  });
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf-8');
    console.log(`✅ Reemplazado: ${file}`);
  }
}

function main() {
  const files = getAllFiles(SRC_DIR, ['.js', '.jsx', '.ts', '.tsx']);
  files.forEach(f => replaceImportsInFile(f));
  console.log('\n✨ Todos los imports relativos a /store y /utils han sido reemplazados por alias @.\n');
}

main();
