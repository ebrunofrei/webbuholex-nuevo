// scripts/fix-all.mjs
import { execSync } from "child_process";

const scripts = [
  "scripts/fix-imports.mjs",
  "scripts/fix-alias.mjs",
  "scripts/fix-db.mjs"
];

for (const script of scripts) {
  console.log(`\n🚀 Ejecutando ${script} ...`);
  execSync(`node ${script}`, { stdio: "inherit" });
}

console.log("\n🎉 Todos los fixes aplicados (imports, alias, db).");
