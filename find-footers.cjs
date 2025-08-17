// find-footers.js
const fs = require('fs');
const path = require('path');

const EXCLUDE = [
  path.normalize('src/components/Footer.jsx'),
  path.normalize('src/components/LegalLinks.jsx'),
  path.normalize('src/oficinaVirtual/components/Footer.jsx')
];

function findInFile(file, regex) {
  const content = fs.readFileSync(file, 'utf8');
  let result = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    result.push({ index: match.index, match: match[0] });
  }
  return result;
}

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, callback);
    } else {
      callback(filepath);
    }
  });
}

console.log("🔎 Buscando imports y footers sospechosos...\n");

let count = 0;
walk('src', (file) => {
  // Solo revisa archivos JSX o JS
  if (!file.endsWith('.jsx') && !file.endsWith('.js')) return;
  // Excluye los footers permitidos
  if (EXCLUDE.some(ex => file.endsWith(ex))) return;

  // Busca importaciones peligrosas
  const importFooter = findInFile(file, /import\s+Footer\s+from\s+["'][^"']+["']/g);
  const importLegalLinks = findInFile(file, /import\s+LegalLinks\s+from\s+["'][^"']+["']/g);
  const linkUsage = findInFile(file, /<Link\b/g);
  const footerTag = findInFile(file, /<footer\b/g);

  if (importFooter.length || importLegalLinks.length || linkUsage.length || footerTag.length) {
    console.log(`⚠️  Encontrado en: ${file}`);
    importFooter.forEach(m => console.log(`  - Import Footer: ${m.match}`));
    importLegalLinks.forEach(m => console.log(`  - Import LegalLinks: ${m.match}`));
    linkUsage.forEach(m => console.log(`  - Uso de <Link>: línea ${m.index}`));
    footerTag.forEach(m => console.log(`  - Uso de <footer>: línea ${m.index}`));
    console.log('');
    count++;
  }
});

if (!count) {
  console.log('✅ No se encontraron footers ni imports sospechosos fuera de los permitidos.');
} else {
  console.log(`\nTotal de archivos con posibles conflictos: ${count}`);
}
