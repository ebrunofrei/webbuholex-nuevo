import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, "../src");

const EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];
const BACKUP_DIR = path.resolve(__dirname, "../__backups__");

const PATTERNS = [
  {
    regex: /(["'`])@\/firebase\.js\1/g,
    replacement: "$1./firebase.js$1",
  },
  {
    regex: /(["'`])src\/firebase\.js\1/g,
    replacement: "$1./firebase.js$1",
  },
  {
    regex: /(["'`])\.\.\/firebase\.js\1/g,
    replacement: "$1./firebase.js$1",
  },
];

function createBackup(filePath, content) {
  const relative = path.relative(projectDir, filePath);
  const backupPath = path.join(BACKUP_DIR, relative + ".bak");

  if (!fs.existsSync(path.dirname(backupPath))) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  }

  if (!fs.existsSync(backupPath)) {
    fs.writeFileSync(backupPath, content, "utf8");
  }
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  let modified = content;

  for (const { regex, replacement } of PATTERNS) {
    modified = modified.replace(regex, replacement);
  }

  if (modified !== content) {
    createBackup(filePath, content);
    fs.writeFileSync(filePath, modified, "utf8");
    console.log(`✅ Corregido: ${filePath}`);
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (EXTENSIONS.includes(path.extname(fullPath))) {
      processFile(fullPath);
    }
  });
}

console.log("🔎 Buscando rutas Firebase mal formateadas...");
walkDir(projectDir);
console.log("✅ Reemplazo completado.");
