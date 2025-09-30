// fix-imports.mjs  (Node 18+)
// Uso: node fix-imports.mjs
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const exts = new Set([".js", ".jsx", ".ts", ".tsx"]);

function fsExistsSync(p) {
  try { return require("node:fs").statSync(p).isFile(); } catch { return false; }
}

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "assets") continue; // saltar assets construidos
      yield* walk(full);
    } else if (exts.has(path.extname(entry.name))) {
      yield full;
    }
  }
}

function fixLine(line, filePath) {
  let out = line;

  // Quita hacks tipo .replace("components/", ...)
  out = out.replace(/\.replace\([^)]*\)/g, "");

  // @services/../../services/X  ->  @services/X
  out = out.replace(/from\s+["'](@services)\/(?:\.\.\/)+/g, 'from "$1/');

  // Colapsa @alias/../alias/ -> @alias/
  out = out.replace(/from\s+["']@([A-Za-z]+)\/(?:\.\.\/)*\1\//g, 'from "@$1/');

  // @pages/oficina/X  ->  @oficinaPages/X si existe; si no, @pages/X
  out = out.replace(/from\s+["']@pages\/oficina\/([^"']+)["']/g, (m, sub) => {
    const oficinaJsx = path.join(SRC, "oficinaVirtual/pages", sub + ".jsx");
    const oficinaJs  = path.join(SRC, "oficinaVirtual/pages", sub + ".js");
    if (fsExistsSync(oficinaJsx) || fsExistsSync(oficinaJs)) return `from "@oficinaPages/${sub}"`;
    return `from "@pages/${sub}"`;
  });

  // Dentro de src/oficinaVirtual/pages/**:
  // @components/../components/X  ->  @oficinaComponents/X si existe; sino @components/X
  if (filePath.includes(path.join("src", "oficinaVirtual", "pages"))) {
    out = out.replace(/from\s+["']@components\/(?:\.\.\/)*components\/([^"']+)["']/g, (m, sub) => {
      const compJsx = path.join(SRC, "oficinaVirtual/components", sub + ".jsx");
      const compJs  = path.join(SRC, "oficinaVirtual/components", sub + ".js");
      if (fsExistsSync(compJsx) || fsExistsSync(compJs)) return `from "@oficinaComponents/${sub}"`;
      return `from "@components/${sub}"`;
    });
    // @components/../../X -> intenta @oficinaComponents
    out = out.replace(/from\s+["']@components\/(?:\.\.\/)+([^"']+)["']/g, (m, sub) => {
      const compJsx = path.join(SRC, "oficinaVirtual/components", sub + ".jsx");
      const compJs  = path.join(SRC, "oficinaVirtual/components", sub + ".js");
      if (fsExistsSync(compJsx) || fsExistsSync(compJs)) return `from "@oficinaComponents/${sub}"`;
      return `from "@components/${sub}"`;
    });
  }

  // Renombrar Exit->Exito
  out = out.replace(/@oficinaPages\/pagos\/ExitUpgrade/g, "@oficinaPages/pagos/ExitoUpgrade");

  return out;
}

async function processFile(file) {
  const src = await fs.readFile(file, "utf8");
  if (!src.includes("import ")) return;
  const fixed = src.split("\n").map(l => fixLine(l, file)).join("\n");
  if (fixed !== src) {
    await fs.writeFile(file, fixed, "utf8");
    console.log("fixed:", path.relative(ROOT, file));
  }
}

(async () => {
  for await (const file of walk(SRC)) await processFile(file);
})();
