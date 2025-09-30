// scripts/fix-imports.js
import fs from "fs";
import path from "path";

const rootDir = path.resolve("./src");

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith(".js") || fullPath.endsWith(".jsx")) {
      let content = fs.readFileSync(fullPath, "utf-8");

      // Reemplazos seguros
      content = content.replace(/@\/components/g, "@components");
      content = content.replace(/@\/pages/g, "@pages");
      content = content.replace(/@\/services/g, "@services");
      content = content.replace(/@\/store/g, "@store");
      content = content.replace(/@\/utils/g, "@utils");
      content = content.replace(/@\/views/g, "@views");

      fs.writeFileSync(fullPath, content, "utf-8");
      console.log(`✅ actualizado: ${fullPath}`);
    }
  }
}

walk(rootDir);
