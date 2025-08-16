const fs = require("fs");
const path = require("path");

// Ajusta aquí tus rutas de reemplazo
const replaceFrom = 'buholex-backend/services/';
const replaceTo   = 'buholex-backend-nuevo/services/';

// Directorio base (ajusta si tu backend tiene otro nombre)
const BASE_DIR = path.resolve(__dirname, "buholex-backend-nuevo");

function fixImportsInFile(filePath) {
    let data = fs.readFileSync(filePath, "utf8");
    if (data.includes(replaceFrom)) {
        const newData = data.replace(new RegExp(replaceFrom, "g"), replaceTo);
        fs.writeFileSync(filePath, newData, "utf8");
        console.log(`✔️  Fixed imports in: ${filePath}`);
    }
}

function traverseAndFix(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverseAndFix(fullPath);
        } else if (fullPath.endsWith(".js")) {
            fixImportsInFile(fullPath);
        }
    });
}

// ---- ¡EJECUCIÓN! ----
console.log(`🔎 Buscando imports para reemplazar en: ${BASE_DIR}`);
traverseAndFix(BASE_DIR);
console.log("✅ Proceso completado.");
