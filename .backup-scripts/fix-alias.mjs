// scripts/fix-alias.mjs
import fs from "fs";
import path from "path";

const DIRECTORIES = ["./backend/routes", "./backend/jobs", "./backend/services"];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  // --- Services ---
  content = content.replace(
    /(["'])\.\.\/services\/([^"']+)\1/g,
    '"#services/$2"'
  );

  content = content.replace(
    /(["'])\.\/services\/([^"']+)\1/g,
    '"#services/$2"'
  );

  // --- Routes ---
  content = content.replace(
    /(["'])\.\.\/routes\/([^"']+)\1/g,
    '"#routes/$2"'
  );

  // --- Jobs ---
  content = content.replace(
    /(["'])\.\.\/jobs\/([^"']+)\1/g,
    '"#jobs/$2"'
  );

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`✅ Fixed imports in ${filePath}`);
}

function walkDir(dir) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith(".js")) {
      fixFile(fullPath);
    }
  }
}

for (const dir of DIRECTORIES) {
  if (fs.existsSync(dir)) {
    walkDir(dir);
  }
}

console.log("🎉 Todos los imports en /routes, /jobs y /services fueron normalizados con alias.");
