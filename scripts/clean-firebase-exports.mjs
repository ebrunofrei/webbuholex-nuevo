import fs from "fs";
import path from "path";

const firebaseFile = path.resolve("./src/firebase.js");

// 📌 Limpiar y ordenar exportaciones en firebase.js
function cleanFirebase() {
  if (!fs.existsSync(firebaseFile)) {
    console.error("❌ No encontré src/firebase.js");
    return;
  }

  let content = fs.readFileSync(firebaseFile, "utf8");

  const exportMatch = content.match(/export\s*{([^}]*)}/s);
  if (!exportMatch) {
    console.error("❌ No encontré el bloque de export en firebase.js");
    return;
  }

  // Obtener lista actual de exports
  let exports = exportMatch[1]
    .split(",")
    .map(f => f.trim())
    .filter(Boolean);

  // Eliminar duplicados y ordenar alfabéticamente
  let cleaned = Array.from(new Set(exports)).sort();

  let newExports = cleaned.join(",\n  ");

  // Reemplazar en el archivo
  let updated = content.replace(/export\s*{([^}]*)}/s, `export {\n  ${newExports}\n}`);

  fs.writeFileSync(firebaseFile, updated, "utf8");
  console.log("✨ firebase.js limpiado y ordenado");
}

// 🚀 Ejecutar limpieza
cleanFirebase();
