// scripts/replaceFirebaseImports.js

const fs = require("fs");
const path = require("path");

const BASE_DIR = path.resolve(__dirname, "../src");

const VALID_EXTENSIONS = [".js", ".jsx"];

const TARGET_IMPORTS = [
  "firebase",
  "firebase.js",
  "@/firebase",
  "@/firebase.js",
  "../firebase",
  "../../firebase",
  "../../../firebase",
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, callback);
    } else {
      callback(fullPath);
    }
  });
}

function normalizeImportLine(line) {
  const regex = /from\s+["'](.+?)["']/;
  const match = line.match(regex);
  if (!match) return false;
  const pathValue = match[1];
  return TARGET_IMPORTS.some((target) => pathValue.includes(target));
}

function replaceFirebaseImport(content) {
  const lines = content.split("\n");
  const newLines = [];

  for (let line of lines) {
    if (
      line.includes("from") &&
      normalizeImportLine(line) &&
      line.includes("{")
    ) {
      // reemplazar cualquier import de firebase por la forma estándar
      newLines.push(`import { auth, db, storage } from "@/firebase.js";`);
    } else {
      newLines.push(line);
    }
  }

  return newLines.join("\n");
}

walkDir(BASE_DIR, (filePath) => {
  const ext = path.extname(filePath);
  if (!VALID_EXTENSIONS.includes(ext)) return;

  const content = fs.readFileSync(filePath, "utf8");
  if (!content.includes("firebase")) return;

  const updatedContent = replaceFirebaseImport(content);
  if (updatedContent !== content) {
    fs.writeFileSync(filePath, updatedContent, "utf8");
    console.log(`✅ Corregido: ${filePath}`);
  }
});
