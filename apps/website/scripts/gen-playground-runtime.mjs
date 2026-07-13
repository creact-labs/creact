// Snapshots the built @creact-labs/creact package (package.json + dist JS)
// into a JSON the playground mounts into the WebContainer's node_modules, so
// a CReact app runs with `node` and no npm install. Run after building creact.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const creactDir = join(here, "../../../packages/creact");
const distDir = join(creactDir, "dist");
const outFile = join(here, "../public/creact-runtime.json");

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

// CReact's dist uses extensionless relative imports (fine under tsx, rejected
// by plain Node ESM). Add `.js` so the mounted package runs under `node`,
// keeping each module a separate file so the shared core stays one instance.
function addJsExtensions(code) {
  return code.replace(
    /((?:from|import)\s+["'])(\.\.?\/[^"']+)(["'])/g,
    (match, open, path, close) =>
      /\.(js|mjs|cjs|json)$/.test(path)
        ? match
        : `${open}${path}.js${close}`,
  );
}

const files = { "package.json": readFileSync(join(creactDir, "package.json"), "utf8") };
for (const file of walk(distDir)) {
  files[relative(creactDir, file)] = addJsExtensions(readFileSync(file, "utf8"));
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(files));
console.log(
  `wrote ${outFile} (${Object.keys(files).length} files, ${(JSON.stringify(files).length / 1024).toFixed(0)}kb)`,
);
