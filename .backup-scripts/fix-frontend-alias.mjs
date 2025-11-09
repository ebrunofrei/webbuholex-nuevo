// scripts/fix-frontend-alias.mjs
import fs from "fs";
import path from "path";

const SRC_DIR = "./src";

// Alias definidos
const ALIASES = {
  "@/components/": "./src/components/",
  "@/pages/": "./src/pages/",
  "@/services/": "./src/services/",
  "@/store/": "./src/store/",
  "@/utils/": "./src/utils/",
  "@/views/": "./src/views/"
};

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  for (const [alias, target] of Object.entries(ALIASES)) {
    // Regex para capturar imports relativos que apunten a esa carpeta
    const regex = new RegExp(`(["'])((\\.\\.?/)+${target.replace("./src/", "")}[^"']+)\\1`, "g");
    content = content.replace(regex, `"${alias}$2".replace("${target.replace("./src/", "")}", "")`);
  }

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`✅ Fixed imports in ${filePath}`);
}

function walkDir(dir) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith(".js") || file.endsWith(".jsx")) {
      fixFile(fullPath);
    }
  }
}

walkDir(SRC_DIR);
console.log("🎉 Todos los imports del frontend fueron normalizados con alias (ej: @/components, @/services).");
