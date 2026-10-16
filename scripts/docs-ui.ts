// Regenerates the docs ui section's generated sources — two outputs, both
// canonical PUBLIC `addComponent` output. Per entry × variant (css-jsx,
// tailwind-jsx) it copies the entry's own canonical
// file into `docs/src/ui-install/<variant>/` for the InstallSection
// Manual tab; one css-jsx `addComponent` call over the full name list writes
// the live component set — every `<name>.tsx` + `tokens.ts` — into
// `docs/src/components/ui/`. Usage: vp run docs-ui [entry ...]  (no args = all
// components)
import { copyFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { addComponent, loadRegistry } from "../packages/ui/dist/index.js";
import { ensureDir, logger, projectRoot, writeJson } from "./utils/index.ts";

/** Generated variants: style combos addComponent produces a canonical file for. */
const variants = [
  { style: "css", dir: "css-jsx", file: (name: string) => `${name}.tsx` },
  { style: "tailwind", dir: "tailwind-jsx", file: (name: string) => `${name}.tsx` },
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
 * @param outRoot Generation root (`docs/src/ui-install`).
 */
async function generateEntry(name: string, scratchDir: string, outRoot: string): Promise<void> {
  for (const variant of variants) {
    addComponent([name], { dir: scratchDir, style: variant.style, overwrite: true });
    const targetDir = join(outRoot, variant.dir);
    await ensureDir(targetDir);
    copyFileSync(
      join(scratchDir, "src/components", variant.file(name)),
      join(targetDir, variant.file(name)),
    );
  }
  logger.info(`[docs-ui] ${name} -> docs/src/ui-install`);
}

/** CLI entry: parse args, prepare scratch + output dirs, generate, report. */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const names = args.length > 0 ? resolveNames(args) : componentNames();
  const scratchDir = join(projectRoot, "docs/.tmp/docs-ui");
  const outRoot = join(projectRoot, "docs/src/ui-install");
  const uiDir = join(projectRoot, "docs/src/components/ui");

  // checkPeers reads this manifest so the adds run without peer warnings; the
  // union of both styles' deps covers every entry.
  const peers = {
    name: "docs-ui-gen",
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
    rmSync(uiDir, { recursive: true, force: true });
  }
  try {
    for (const name of names) {
      await generateEntry(name, scratchDir, outRoot);
    }
    // Live set: one addComponent call for the whole name list — dependencies
    // resolve once, checkPeers runs once. It runs after the variant loops, so
    // each scratch `<name>.tsx` is the css-jsx canonical (tailwind-jsx's
    // earlier copy is overwritten); mirror every `<name>.tsx` plus `tokens.ts`
    // out of scratch byte-exact — no post-copy edits, ever.
    addComponent(names, { dir: scratchDir, style: "css", overwrite: true });
    await ensureDir(uiDir);
    for (const name of names) {
      copyFileSync(join(scratchDir, "src/components", `${name}.tsx`), join(uiDir, `${name}.tsx`));
    }
    copyFileSync(join(scratchDir, "src/components", "tokens.ts"), join(uiDir, "tokens.ts"));
    logger.success(
      `docs-ui: ${names.length} ${names.length === 1 ? "entry" : "entries"} written -> docs/src/ui-install + docs/src/components/ui`,
    );
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }
}

if (process.argv[1] === import.meta.filename) {
  main().catch((error: Error) => {
    logger.error("docs-ui failed", error);
    process.exit(1);
  });
}
