import fs from "fs";
import path from "path";

const apiDir = path.join(process.cwd(), "api");

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  const replacements = [
    { from: /from\s+["']backend\/api\//g, to: "from \"../backend/" },
  ];

  replacements.forEach(rep => {
    content = content.replace(rep.from, rep.to);
  });

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`✅ Fixed imports in ${filePath}`);
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith(".js")) {
      fixImportsInFile(fullPath);
    }
  });
}

walkDir(apiDir);
