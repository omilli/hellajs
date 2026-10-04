/**
 * Generates per-page CSS for the docs site's ui demo pages into
 * `docs/src/generated/pagecss/<page>.css` (gitignored; read by each ui
 * page's frontmatter and inlined by MainLayout behind the `site-head` id —
 * deliberately NOT the css runtime's adopted `hella-css` id, so hydration
 * never drains the SSR text).
 *
 * Each page collects in a fresh child process: demo wrappers, the shared
 * demo kit, the dark tokens, and registry components register styles at
 * module level, so only a fresh module registry per page reproduces the
 * page's full cssText() — bun's module cache ignores URL queries, so
 * in-process query-busted imports cannot re-execute an already-imported
 * graph after resetCss(). Pages collect sequentially: the pipeline is
 * deterministic regardless of astro's build concurrency. Every path
 * resolves from `import.meta.dir`, never `process.cwd()`: the script runs
 * both from the repo root and from `docs/` (predev/prebuild), where a cwd
 * resolve would anchor one directory too deep.
 *
 * Parent mode (default): `bun scripts/gen-demo-css.ts` — enumerates the ui
 * pages, parses each page's wrapper imports, collects per page, writes one
 * css file per page. Fails loudly on a demo-bearing page without parseable
 * wrapper imports. Child mode (--collect, internal): registers the
 * @registry alias + the hellajs babel transform, imports the page's
 * wrappers fresh, prints cssText() to stdout.
 */

import { transformSync } from "@babel/core";
import babelHellaJS from "babel-plugin-hellajs";
import presetTypeScript from "@babel/preset-typescript";
import { readFileSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cssText } from "@hellajs/css";
import { ensureDir, execCommand, fileExists, logger } from "./utils/index.js";

const docsDir = join(import.meta.dir, "..", "docs");
const pagesDir = join(docsDir, "src", "pages", "ui");
const demosDir = join(docsDir, "src", "demos");
const outDir = join(docsDir, "src", "generated", "pagecss");
const registryDir = join(import.meta.dir, "..", "packages", "ui", "dist", "registry");

/** Wrapper import specifier inside a ui page: `"../../demos/<stem>"` (the `?raw` source import is skipped). */
const DEMO_IMPORT_REGEX = /from "([^"]*\/demos\/[^"]+)"/g;

/**
 * Extracts the demo wrapper module stems a ui page mounts. The `?raw` View
 * Code import is skipped; every remaining demos/ specifier must parse to an
 * existing `<stem>.tsx` wrapper.
 */
async function parseWrapperStems(page: string, source: string): Promise<string[]> {
  const stems: string[] = [];
  for (const match of source.matchAll(DEMO_IMPORT_REGEX)) {
    const specifier = match[1]!;
    if (specifier.includes("?raw")) continue;
    const stem = specifier.split("/").pop()!.replace(/\.tsx$/, "");
    if (!/^[a-z0-9-]+$/.test(stem)) {
      throw new Error(`[gen-demo-css] ${page}: unparseable wrapper import "${specifier}"`);
    }
    const entry = join(demosDir, `${stem}.tsx`);
    if (!(await fileExists(entry))) {
      throw new Error(`[gen-demo-css] ${page}: wrapper module not found: ${entry}`);
    }
    if (!stems.includes(stem)) stems.push(stem);
  }
  if (stems.length === 0) {
    throw new Error(`[gen-demo-css] ${page}: no demo wrapper imports found — every ui page must mount at least one island`);
  }
  return stems;
}

/**
 * Collects one page's css in the child process: fresh module registry, so
 * every module-level style()/vars() registration (wrappers, demo kit,
 * tokens, registry components) runs exactly once for this page. Prints the
 * collected cssText() to stdout — the parent owns all reporting.
 */
async function collect(page: string, stems: string[]): Promise<void> {
  registerLoaderPlugin();
  for (const stem of stems) {
    await import(join(demosDir, `${stem}.tsx`));
  }
  const text = cssText();
  if (text.length === 0) {
    throw new Error(`[gen-demo-css] ${page}: cssText() collected nothing — wrapper imports produced no registrations`);
  }
  process.stdout.write(text);
}

/**
 * Registers the child's module loader: the `@registry/*` alias (ui dist
 * registry output) and the hellajs babel transform for wrapper JSX — the
 * same transform the vite plugin applies, so execution semantics match the
 * built site.
 */
function registerLoaderPlugin(): void {
  Bun.plugin({
    name: "gen-demo-css",
    setup(build) {
      build.onResolve({ filter: /^@registry\// }, (args) => ({
        path: join(registryDir, args.path.slice("@registry/".length)),
      }));
      build.onLoad({ filter: /[\\/]demos[\\/].+\.tsx(\?|$)/ }, (args) => {
        const code = readFileSync(args.path.split("?")[0]!, "utf8");
        const result = transformSync(code, {
          plugins: [babelHellaJS],
          presets: [presetTypeScript],
          filename: args.path,
          ast: false,
          sourceMaps: false,
          configFile: false,
          babelrc: false,
          parserOpts: { plugins: ["jsx"] },
        });
        return { contents: result?.code ?? "", loader: "js" };
      });
    },
  });
}

/**
 * Parent mode: one css file per ui page, collected sequentially through
 * fresh child processes. Throws on the first failing page — a partial
 * generation must not look like a complete one.
 */
async function generateAll(): Promise<void> {
  const pages = (await readdir(pagesDir)).filter((file) => file.endsWith(".astro")).sort();
  if (pages.length === 0) {
    throw new Error(`[gen-demo-css] no ui pages found under ${pagesDir}`);
  }
  await ensureDir(outDir);
  //let totalBytes = 0;
  for (const file of pages) {
    const page = file.replace(/\.astro$/, "");
    const source = await readFile(join(pagesDir, file), "utf8");
    const stems = await parseWrapperStems(page, source);
    const script = join(import.meta.dir, "gen-demo-css.ts");
    const result = await execCommand("bun", [script, "--collect", page, ...stems]);
    await writeFile(join(outDir, `${page}.css`), result.stdout, "utf8");
    //totalBytes += result.stdout.length;
    //logger.info(`${page}: ${result.stdout.length} bytes`);
  }
  //logger.success(`gen-demo-css: ${pages.length} pages -> docs/src/generated/pagecss (${totalBytes} bytes)`);
}

async function main(): Promise<void> {
  const collectIndex = process.argv.indexOf("--collect");
  if (collectIndex !== -1) {
    const page = process.argv[collectIndex + 1];
    const stems = process.argv.slice(collectIndex + 2);
    if (!page || stems.length === 0) {
      throw new Error("[gen-demo-css] --collect requires <page> and at least one wrapper stem");
    }
    await collect(page, stems);
    return;
  }
  await generateAll();
}

main().catch((error: unknown) => {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
