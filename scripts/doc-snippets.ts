import fs from "node:fs";
import path from "node:path";
import { logger, packagesDir, projectRoot } from "./utils/index.ts";
import { extractBlocks } from "./snippets/blocks.ts";
import type { MarkdownBlock } from "./snippets/blocks.ts";
import { emitModules, isExecutableBlock, splitImports } from "./snippets/emit.ts";
import { EXTERNAL_IMPORT_RE, LANGS_JS, LANGS_TS } from "./snippets/emit.ts";
import { typecheckDir } from "./snippets/tsc.ts";
import type { TscDiagnostic } from "./snippets/tsc.ts";

/**
 * Audit tool (`vp run doc-snippets`): typechecks every package-doc code block via
 * per-doc concatenation (decision: per-block scoping, js-tagged blocks loose).
 *
 * Fence extraction, module emission, and the tsc driver live in the shared
 * `scripts/snippets/` pipeline; every policy decision stays here: corpus
 * roots, strict/tutorial tiers, skip rules, the relative-TS2307 exemption,
 * AUDITSRC breadcrumbs, and the `.doc-snippets/` scratch lifecycle.
 *
 * Model (user-resolved 2026-08-26):
 * - Per doc, fenced blocks with lang in {typescript, ts, tsx, jsx} are emitted
 *   into ONE `.ts`/`.tsx` module: the doc-wide import union hoisted + merged,
 *   each block wrapped in its own `{ }` scope inside an async IIFE (top-level
 *   `await` stays legal; same-name consts across blocks never collide).
 *   Chaining across blocks is deliberately NOT supported — `guides/docs.md`
 *   mandates self-contained blocks, and per-block scoping enforces it
 *   mechanically.
 * - js-tagged blocks are emitted into a sibling `.js` module with
 *   `checkJs: false` — parsed for grammar, imports resolved, but not
 *   strict-TS-checked. JS examples are idiomatic-untyped by design.
 * - Scratch isolation: each invocation emits into its own
 *   `.doc-snippets/run-<pid>-<suffix>/` dir; dead-run dirs are pruned at
 *   start, so concurrent runs can never wipe each other's corpus mid-flight.
 *
 * Skips (a skipped block is not checked — marking, not fixing):
 * - Blocks containing the ❌ mark (intentional bad-practice examples).
 * - Blocks containing the exercise-blank marker (an empty block comment —
 *   see guides/docs.md §exercise blanks).
 * - Signature-only blocks (type/interface/declare declarations and bare
 *   function signatures — no executable statements).
 * - Blocks importing externals: static imports of bare specifiers other than
 *   `@hellajs/*` (vite/astro/express config examples).
 *
 * Known parser quirks (handled in the shared pipeline, documented for the next reader):
 * - Adjacent JSX element statements false-positive TS2657 ("must have one
 *   parent") — the emitter appends `;` after statement-ending JSX closers and
 *   template-literal closers (tracked by backtick parity so semicolons never
 *   land inside a template string).
 * - TS skips semantic checking of a file while it has parse errors — the run
 *   is two-pass: files with grammar errors are quarantined via config
 *   `exclude`, the rest re-checked so semantic findings surface.
 * - Dynamic `import("./relative")` of notional example modules reports
 *   TS2307; relative-specifier TS2307s are exempt (the module is doc-internal
 *   notation), bare-specifier TS2307s (a real missing dep) still fail.
 * - JSX is compiled with `jsx: preserve` and typed against the global `JSX`
 *   namespace `packages/dom/lib/index.ts` declares — a doc whose blocks use
 *   JSX but never import from `@hellajs/dom` fails until the import is added
 *   (self-containment, enforced mechanically).
 *
 * Strict tier (exit 0/1): every package doc plus site-authored content pages
 * under `docs/src/pages/`. Tutorials (each example's `tutorial.mdx`) are
 * checked informationally — findings print, the exit code ignores them.
 */

interface DocModule {
  doc: string;
  file: string;
  blockCount: number;
}

const ALL_LANGS = new Set([...LANGS_TS, ...LANGS_JS]);
const OUT_DIR = path.join(projectRoot, ".doc-snippets");
const PACKAGES = ["core", "dom", "css", "resource", "router", "store", "ssr"] as const;

/**
 * Recursively collects files under a directory, skipping `node_modules` and
 * `dist`. Same walker the guard scripts use.
 * @param dir The directory to walk
 * @param exts Only collect files with one of these extensions
 * @returns Array of absolute file paths
 */
function collectFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];

  function walk(current: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && exts.includes(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Collects the docs in scope: package docs (strict), site pages (strict — the
 * site-authored content ones carry fences too), and tutorials (informational).
 * @returns Object with strictDocs and tutorialDocs absolute paths
 */
function collectDocs(): { strictDocs: string[]; tutorialDocs: string[] } {
  const strictDocs: string[] = [];
  for (const pkg of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!pkg.isDirectory()) continue;
    strictDocs.push(...collectFiles(path.join(packagesDir, pkg.name, "docs"), [".mdx"]));
  }
  strictDocs.push(...collectFiles(path.join(projectRoot, "docs", "src", "pages"), [".mdx"]));

  const tutorialDocs: string[] = [];
  const examplesDir = path.join(projectRoot, "examples");
  for (const example of fs.readdirSync(examplesDir, { withFileTypes: true })) {
    if (!example.isDirectory()) continue;
    const tutorial = path.join(examplesDir, example.name, "tutorial.mdx");
    if (fs.existsSync(tutorial)) tutorialDocs.push(tutorial);
  }
  return { strictDocs, tutorialDocs };
}

/**
 * Extracts the checkable fenced blocks from an mdx doc, applying every local
 * skip rule (❌ marks, exercise blanks, signature-only, external imports).
 * @param doc Absolute doc path
 * @returns The blocks to check, each with its mdx line number
 */
function extractCheckableBlocks(doc: string): MarkdownBlock[] {
  return extractBlocks(doc, ALL_LANGS).filter((block) => {
    if (block.text.includes("❌") || block.text.includes("/**/")) return false;
    const { imports, body } = splitImports(block.text);
    if (imports.some((statement) => EXTERNAL_IMPORT_RE.test(statement))) return false;
    const bodyLines = body.filter(
      (l) =>
        l.trim() &&
        !l.trim().startsWith("//") &&
        !l.trim().startsWith("*") &&
        !l.trim().startsWith("/*"),
    );
    if (bodyLines.length === 0) return false;
    return isExecutableBlock(bodyLines); // signature-only block
  });
}

/**
 * Checks one tier: emit (one module per doc, `// AUDITSRC` breadcrumbs
 * mapping diagnostics back to mdx line numbers), then the shared two-pass
 * typecheck with the local relative-TS2307 exemption.
 * @param tier "strict" or "tutorial" — namespaced into separate subdirs
 * @param docs The tier's docs
 * @param runDir This run's scratch dir
 * @returns The tier's emitted modules and relevant diagnostics
 */
function checkTier(
  tier: "strict" | "tutorial",
  docs: string[],
  runDir: string,
): { modules: DocModule[]; relevant: TscDiagnostic[] } {
  const modules: DocModule[] = [];
  for (const doc of docs) {
    const blocks = extractCheckableBlocks(doc);
    if (blocks.length === 0) continue;
    const rel = path.relative(projectRoot, doc).replace(/[/\\]/g, "_").replace(/\./g, "_");
    const emitted = emitModules(
      blocks,
      path.join(runDir, tier, rel),
      (block, idx) =>
        `// AUDITSRC ${path.relative(projectRoot, block.source)}:${block.line} block ${idx + 1}`,
    );
    for (const module of emitted) {
      modules.push({ doc, file: module.file, blockCount: module.blockCount });
    }
  }
  if (modules.length === 0) return { modules, relevant: [] };

  const relevant = typecheckDir(
    path.join(runDir, tier),
    PACKAGES,
    (d) =>
      d.code === "TS2307" && /Cannot find module '\.\/|Cannot find module '\.\.\//.test(d.message),
  );
  return { modules, relevant };
}

/** Whether a pid is alive — signal-0 probe; EPERM means alive but not signalable. */
function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * Prunes `.doc-snippets/` down to live runs' scratch dirs: entries not owned
 * by a live pid (dead runs' dirs, legacy `strict/`/`tutorial/` layouts,
 * stray files) are removed; a live sibling run's dir is never touched.
 * @param outDir The `.doc-snippets` root
 */
function pruneStaleRuns(outDir: string): void {
  for (const entry of fs.readdirSync(outDir, { withFileTypes: true })) {
    const owner = Number(entry.name.match(/^run-(\d+)-/)?.[1] ?? Number.NaN);
    const liveSibling =
      entry.isDirectory() && Number.isInteger(owner) && owner !== process.pid && isPidAlive(owner);
    if (liveSibling) continue;
    fs.rmSync(path.join(outDir, entry.name), { recursive: true, force: true });
  }
}

/**
 * Resolves a tsc-reported file (tsc prints paths relative to its cwd) to an
 * absolute path, plus a stable display path: this run's artifacts show their
 * `.doc-snippets/<tier>/…` form with the run-scoped segment stripped (output
 * stays byte-comparable across runs); foreign files show their repo-relative
 * path.
 * @param file The diagnostic's file as tsc printed it
 * @param runDir This run's scratch dir
 * @returns The absolute path and its display form
 */
function resolveDiagnosticFile(file: string, runDir: string): { abs: string; display: string } {
  const abs = path.resolve(projectRoot, file);
  const fromRun = path.relative(runDir, abs);
  const display = fromRun.startsWith("..")
    ? path.relative(projectRoot, abs)
    : path.join(".doc-snippets", fromRun);
  return { abs, display };
}

async function main(): Promise<void> {
  try {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    pruneStaleRuns(OUT_DIR);
    const runDir = fs.mkdtempSync(path.join(OUT_DIR, `run-${process.pid}-`));

    const { strictDocs, tutorialDocs } = collectDocs();
    const strict = checkTier("strict", strictDocs, runDir);
    const tutorial = checkTier("tutorial", tutorialDocs, runDir);

    for (const d of strict.relevant) {
      const { abs, display } = resolveDiagnosticFile(d.file, runDir);
      const srcLine = fs.readFileSync(abs, "utf-8").split("\n")[d.line - 1] ?? "";
      const breadcrumb = srcLine.match(/AUDITSRC (.+)$/)?.[1] ?? "";
      logger.info(
        `${display}(${d.line},${d.col}) ${d.code}: ${d.message}${breadcrumb ? ` — ${breadcrumb}` : ""}`,
      );
    }
    for (const d of tutorial.relevant) {
      const { abs, display } = resolveDiagnosticFile(d.file, runDir);
      const srcLine = fs.readFileSync(abs, "utf-8").split("\n")[d.line - 1] ?? "";
      const breadcrumb = srcLine.match(/AUDITSRC (.+)$/)?.[1] ?? "";
      logger.info(
        `[tutorial] ${display}(${d.line},${d.col}) ${d.code}: ${d.message}${breadcrumb ? ` — ${breadcrumb}` : ""}`,
      );
    }

    const docsChecked = new Set([...strict.modules, ...tutorial.modules].map((m) => m.doc)).size;
    const blocksChecked = [...strict.modules, ...tutorial.modules].reduce(
      (acc, m) => acc + m.blockCount,
      0,
    );
    logger.info(
      `checked ${docsChecked} docs, ${blocksChecked} blocks (${strict.relevant.length} strict, ${tutorial.relevant.length} tutorial findings)`,
    );

    if (strict.relevant.length === 0) {
      logger.success("Doc snippets clean (strict tier)");
      process.exit(0);
    }
    logger.error(`${strict.relevant.length} strict-tier diagnostic(s)`);
    process.exit(1);
  } catch (error) {
    logger.error("Doc-snippets check failed", error as Error);
    process.exit(1);
  }
}

if (process.argv[1] === import.meta.filename) {
  main().catch((error: Error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
