// scripts/fix-replace-imports.cjs
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "../src");

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (/\.(js|jsx)$/.test(file)) {
      let content = fs.readFileSync(fullPath, "utf-8");
      const original = content;

      content = content.replace(
        /from\s+['"]\@pages\/\.\.\/pages\/([^'"]+)['"]/g,
        `from "@pages/$1"`
      );

      content = content.replace(
        /from\s+['"]\@services\/\.\.\/services\/([^'"]+)['"]/g,
        `from "@services/$1"`
      );

      if (content !== original) {
        fs.writeFileSync(fullPath, content, "utf-8");
        console.log(`✅ actualizado: ${fullPath}`);
      }
    }
  }
}

walk(rootDir);
