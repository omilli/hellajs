// Regenerates the install-source files the docs ui section's InstallSection
// renders in its Manual tab. For each registry component it runs the PUBLIC
// `addComponent` API once per generated variant (css-jsx, css-html,
// tailwind-jsx, tailwind-html) inside a throwaway project and copies the
// canonical file into `docs/src/generated/install/<variant>/` — the Manual
// tab shows what `add` writes by construction, as real greppable files.
// Usage: bun install-sources [entry ...]  (no args = all components)
import { copyFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { addComponent, loadRegistry } from "../packages/ui/dist/index.js";
import { ensureDir, logger, projectRoot, writeJson } from "./utils/index.js";

/** Generated variants: style x format combos addComponent produces a canonical file for. */
const variants = [
  { style: "css", format: "jsx", dir: "css-jsx", file: (name: string) => `${name}.tsx` },
  { style: "css", format: "html", dir: "css-html", file: (name: string) => `${name}.ts` },
  { style: "tailwind", format: "jsx", dir: "tailwind-jsx", file: (name: string) => `${name}.tsx` },
  { style: "tailwind", format: "html", dir: "tailwind-html", file: (name: string) => `${name}.ts` },
] as const;

/**
 * Component names: registry entries that ship canonical component files.
 * The top-level `files` key is the discriminator — `theme` and `cn` lack it.
 * @returns Sorted component names.
 */
function componentNames(): string[] {
  const { entries } = loadRegistry();
  return Object.entries(entries)
    .filter(([, entry]) => Object.hasOwn(entry, "files"))
    .map(([name]) => name)
    .sort();
}

/**
 * Validates CLI entry names against the component set.
 * @param args Entry names from the command line.
 * @returns The names, unchanged, when all are valid.
 */
function resolveNames(args: string[]): string[] {
  const valid = componentNames();
  const invalid = args.filter((name) => !valid.includes(name));
  if (invalid.length > 0) {
    logger.error(`Unknown ui entry: ${invalid.join(", ")}. Valid entries: ${valid.join(", ")}`);
    process.exit(1);
  }
  return args;
}

/**
 * Runs addComponent per variant in the scratch project and copies the
 * canonical file into its variant dir. Dependency files addComponent writes
 * alongside are ignored — only the entry's own file ships.
 * @param name Component name.
 * @param scratchDir Throwaway project addComponent copies into.
 * @param outRoot Generation root (`docs/src/generated/install`).
 */
async function generateEntry(name: string, scratchDir: string, outRoot: string): Promise<void> {
  for (const variant of variants) {
    addComponent([name], { dir: scratchDir, style: variant.style, format: variant.format, overwrite: true });
    const targetDir = join(outRoot, variant.dir);
    await ensureDir(targetDir);
    copyFileSync(join(scratchDir, "src/components", variant.file(name)), join(targetDir, variant.file(name)));
  }
  logger.info(`[install-sources] ${name} -> docs/src/generated/install`);
}

/** CLI entry: parse args, prepare scratch + output dirs, generate, report. */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const names = args.length > 0 ? resolveNames(args) : componentNames();
  const scratchDir = join(projectRoot, "docs/.tmp/install-sources");
  const outRoot = join(projectRoot, "docs/src/generated/install");

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

  rmSync(scratchDir, { recursive: true, force: true });
  await ensureDir(join(scratchDir, "src/components"));
  await writeJson(join(scratchDir, "package.json"), peers);
  if (args.length === 0) {
    for (const variant of variants) {
      rmSync(join(outRoot, variant.dir), { recursive: true, force: true });
    }
  }
  try {
    for (const name of names) {
      await generateEntry(name, scratchDir, outRoot);
    }
    logger.success(`install-sources: ${names.length} ${names.length === 1 ? "entry" : "entries"} written`);
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  main().catch((error: Error) => {
    logger.error("install-sources failed", error);
    process.exit(1);
  });
}
