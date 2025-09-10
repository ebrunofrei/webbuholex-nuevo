import fs from "fs";
import path from "path";

const FIREBASE_FILE = path.resolve("./src/firebase.js");

// Funciones a categorizar por módulo
const FIRESTORE_FUNCS = ["doc","collection","query","where","getDoc","getDocs","setDoc","updateDoc","deleteDoc","addDoc","onSnapshot","orderBy","limit","startAfter","Timestamp","serverTimestamp"];
const STORAGE_FUNCS = ["getStorage","uploadBytes","deleteObject","getDownloadURL"];
const AUTH_FUNCS = ["getAuth","onAuthStateChanged"];
const MESSAGING_FUNCS = ["getMessaging","isSupported","getToken","onMessage"];

// --- Cargar firebase.js ---
let content = fs.readFileSync(FIREBASE_FILE, "utf8");

// --- Import updater ---
function ensureImport(module, funcs) {
  const regex = new RegExp(`from ["']${module}["']`);
  if (!regex.test(content)) {
    // No hay import del módulo → lo agregamos
    content =
      `import { ${funcs.join(", ")} } from "${module}";\n` + content;
  } else {
    // Sí hay → añadimos los faltantes
    content = content.replace(
      new RegExp(`import {([^}]*)} from ["']${module}["']`),
      (match, group) => {
        let items = group.split(",").map((i) => i.trim()).filter(Boolean);
        funcs.forEach((f) => {
          if (!items.includes(f)) items.push(f);
        });
        return `import { ${items.join(", ")} } from "${module}"`;
      }
    );
  }
}

// --- Export updater ---
function ensureExports(funcs) {
  content = content.replace(/export\s*{([^}]*)}/s, (match, group) => {
    let items = group.split(",").map((i) => i.trim()).filter(Boolean);
    funcs.forEach((f) => {
      if (!items.includes(f)) items.push(f);
    });
    return `export {\n  ${items.join(",\n  ")}\n}`;
  });
}

// --- Aplicamos ---
ensureImport("firebase/firestore", FIRESTORE_FUNCS);
ensureImport("firebase/storage", STORAGE_FUNCS);
ensureImport("firebase/auth", AUTH_FUNCS);
ensureImport("firebase/messaging", MESSAGING_FUNCS);

ensureExports([...FIRESTORE_FUNCS, ...STORAGE_FUNCS, ...AUTH_FUNCS, ...MESSAGING_FUNCS]);

// --- Guardamos ---
fs.writeFileSync(FIREBASE_FILE, content, "utf8");
console.log("✅ firebase.js sincronizado con todas las funciones necesarias");
