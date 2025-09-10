import fs from "fs";
import path from "path";

const rootDir = "./src";

// --- Función para recorrer directorios ---
function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      filelist = walk(filepath, filelist);
    } else if (file.endsWith(".js") || file.endsWith(".jsx")) {
      filelist.push(filepath);
    }
  });
  return filelist;
}

// --- Fix de imports ---
function fixImports(file) {
  let content = fs.readFileSync(file, "utf8");
  let modified = false;

  // 🔥 1. Quitar cualquier intento de "@/firebase/firestore"
  if (content.includes('@/firebase/firestore')) {
    content = content.replace(/["@']\/firebase\/firestore["@']/g, '"firebase/firestore"');
    modified = true;
  }

  // 🔥 2. Arreglar imports mezclados de "@/firebase"
  const firestoreFns = [
    "doc",
    "collection",
    "getDoc",
    "setDoc",
    "updateDoc",
    "deleteDoc",
    "getDocs",
    "query",
    "where",
    "orderBy",
    "limit"
  ];

  if (content.includes('from "@/firebase"')) {
    const regex = /import\s*{([^}]+)}\s*from\s*["@']\/firebase["@'];?/g;
    content = content.replace(regex, (match, group) => {
      const imports = group.split(",").map(i => i.trim());
      const keepDb = imports.includes("db");
      const badFns = imports.filter(i => firestoreFns.includes(i));
      
      let newImports = "";
      if (keepDb) newImports += `import { db } from "@/firebase";\n`;
      if (badFns.length > 0) {
        newImports += `import { ${badFns.join(", ")} } from "firebase/firestore";\n`;
      }

      modified = true;
      return newImports;
    });
  }

  if (modified) {
    fs.writeFileSync(file, content, "utf8");
    console.log(`✅ Corregido: ${file}`);
  }
}

// --- Ejecutar ---
console.log("🚀 Escaneando y corrigiendo imports de Firestore...");
const files = walk(rootDir);
files.forEach(fixImports);
console.log("🎉 Limpieza finalizada.");
