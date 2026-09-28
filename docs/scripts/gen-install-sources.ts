// Generates the per-variant install sources the ui section's InstallSection
// renders in its Manual tab. For each registry entry it runs the PUBLIC
// `addComponent` API four times (css/tailwind x jsx/html) inside a throwaway
// project and writes the exact copied file texts to
// `src/generated/install/<entry>.json` — the Manual tab shows what `add`
// writes by construction, with no ui-package import anywhere in site code.
// Usage: bun docs/scripts/gen-install-sources.ts [entry ...]  (no args = all)
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { addComponent, listComponents } from "../../packages/ui/dist/index.js";

const entries = process.argv.slice(2);
const names = entries.length > 0 ? entries : listComponents();

const workspaceRoot = join(import.meta.dir, "../..");
const tmpRoot = join(workspaceRoot, "docs/.tmp/install-sources");
const outDir = join(workspaceRoot, "docs/src/generated/install");

// checkPeers reads this manifest so the adds run without peer warnings; the
// union of both styles' deps covers every entry.
const peers = {
  name: "install-source-gen",
  private: true,
  type: "module",
  dependencies: {
    "@hellajs/core": "*",
    "@hellajs/css": "*",
    "@hellajs/dom": "*",
    clsx: "*",
    "tailwind-merge": "*",
    "tw-animate-css": "*",
  },
};

const variants = [
  { style: "css", format: "jsx", key: "css-jsx", file: (name: string) => `${name}.tsx` },
  { style: "css", format: "html", key: "css-html", file: (name: string) => `${name}.ts` },
  { style: "tailwind", format: "jsx", key: "tailwind-jsx", file: (name: string) => `${name}.tsx` },
  { style: "tailwind", format: "html", key: "tailwind-html", file: (name: string) => `${name}.ts` },
] as const;

rmSync(tmpRoot, { recursive: true, force: true });
mkdirSync(join(tmpRoot, "src/components"), { recursive: true });
writeFileSync(join(tmpRoot, "package.json"), JSON.stringify(peers, null, 2) + "\n");
mkdirSync(outDir, { recursive: true });

for (const name of names) {
  const sources: Record<string, string> = {};
  for (const variant of variants) {
    addComponent([name], { dir: tmpRoot, style: variant.style, format: variant.format, overwrite: true });
    sources[variant.key] = readFileSync(join(tmpRoot, "src/components", variant.file(name)), "utf8");
  }
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(sources, null, 2) + "\n");
  console.log(`[gen-install-sources] ${name} -> src/generated/install/${name}.json`);
}

rmSync(tmpRoot, { recursive: true, force: true });
