// find-bad-imports.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, 'src');

function getAllFiles(dir, ext, files = []) {
  fs.readdirSync(dir).forEach((file) => {
    const abs = path.join(dir, file);
    if (fs.statSync(abs).isDirectory()) return getAllFiles(abs, ext, files);
    if (file.endsWith(ext)) files.push(abs);
  });
  return files;
}

function scanForBadImports(file) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const issues = [];
  lines.forEach((line, idx) => {
    if (
      line.includes('from "../store/') ||
      line.includes('from "../utils/') ||
      line.includes('from "../../store/') ||
      line.includes('from "../../utils/')
    ) {
      issues.push({ file, line: idx + 1, code: line.trim() });
    }
  });
  return issues;
}

function main() {
  const files = [
    ...getAllFiles(SRC_DIR, '.js'),
    ...getAllFiles(SRC_DIR, '.jsx'),
    ...getAllFiles(SRC_DIR, '.ts'),
    ...getAllFiles(SRC_DIR, '.tsx'),
  ];
  let results = [];
  files.forEach((f) => {
    results = results.concat(scanForBadImports(f));
  });

  if (results.length === 0) {
    console.log('✅ No se encontraron imports relativos problemáticos a /store o /utils.');
  } else {
    console.log('🚨 Imports relativos encontrados:\n');
    results.forEach((r) => {
      console.log(`${r.file}:${r.line} — ${r.code}`);
    });
    console.log('\nReemplázalos por imports con alias @.');
  }
}

main();
