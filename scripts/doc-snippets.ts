import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { logger, packagesDir, projectRoot } from "./utils/index.js";

/**
 * Audit tool (`bun doc-snippets`): typechecks every package-doc code block via
 * per-doc concatenation (decision: per-block scoping, js-tagged blocks loose).
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
 * Known parser quirks (handled here, documented for the next reader):
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

interface Block {
  doc: string;
  line: number;
  lang: string;
  text: string;
}

interface EmittedModule {
  doc: string;
  file: string;
  blockCount: number;
}

interface Diagnostic {
  file: string;
  line: number;
  col: number;
  code: string;
  message: string;
}

const LANGS_TS = new Set(["typescript", "ts", "tsx", "jsx"]);
const LANGS_JS = new Set(["js"]);
const OUT_DIR = path.join(projectRoot, ".doc-snippets");
const PACKAGES = ["core", "dom", "css", "resource", "router", "store", "ssr"] as const;
const CONTINUATION_RE = /^[.([,:?+*&|)}\]]|^(=>|&&|\|\||\?\?)/;
const EXTERNAL_IMPORT_RE = /^import\s[^"']*from\s+["'](?!@hellajs\/)[^"']+["']/;
/** Real assignment `=` — arrows and comparators stripped first. */
const ASSIGN_RE = /(?<![!=<>])=(?!=)/;

/** Strips `=>` and type-parameter lists so arrows and generic defaults (`<T = U>`)
 * never read as assignments. */
function stripArrows(line: string): string {
  return line.replace(/=>/g, "  ").replace(/<[^<>]*>/g, " ");
}
/** Executable-statement markers: declarations, control flow, call statements, JSX. */
const EXECUTABLE_RE = /\b(const|let|var|return|await|new|throw)\b|^[A-Za-z_$][\w$.]*\s*\(|^</;

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
 * Splits block text into import statements (each normalized to one line) and
 * the remaining body lines. Handles multi-line named imports: an `import`
 * line consumes through the line that closes the statement (ends with the
 * module specifier and optional semicolon).
 * @param text The block text
 * @returns The import statements and the body lines
 */
function splitImports(text: string): { imports: string[]; body: string[] } {
  const imports: string[] = [];
  const body: string[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/^import\b/.test(lines[i]!.trim())) {
      body.push(lines[i]!);
      continue;
    }
    const statement: string[] = [lines[i]!.trim()];
    while (
      i + 1 < lines.length &&
      !/(?:from\s+)?["'][^"']+["']\s*;?\s*$/.test(statement[statement.length - 1]!)
    ) {
      i += 1;
      statement.push(lines[i]!.trim());
    }
    imports.push(statement.join(" ").replace(/\s+/g, " "));
  }
  return { imports, body };
}

/**
 * Whether a block holds executable statements (vs. type/interface/declare
 * declarations and bare signatures). Import lines are already stripped.
 * @param bodyLines The block's body lines
 * @returns True if at least one line executes something
 */
function isExecutableBlock(bodyLines: string[]): boolean {
  return bodyLines.some((l) => {
    const t = l.trim();
    if (t.startsWith("declare ") || t.startsWith("type ") || t.startsWith("interface ")) return false;
    if (t.startsWith("}")) return false; // closing a type/declare block
    if (/^(export\s+)?function\b/.test(t) && !t.includes("{")) return false; // signature line (type-param defaults carry `=`)
    if (/^const\s+\w+\s*:\s*[^=]+$/.test(t)) return false; // const signature (no initializer)
    if (/^\w+\s*\(.*\)\s*:\s*[^=]*;$/.test(t)) return false; // type-literal member signature
    return EXECUTABLE_RE.test(t) || ASSIGN_RE.test(stripArrows(t));
  });
}

/**
 * Extracts the checkable fenced blocks from an mdx doc, applying every skip
 * rule (❌ marks, exercise blanks, signature-only, external imports).
 * @param doc Absolute doc path
 * @returns The blocks to check, each with its mdx line number
 */
function extractBlocks(doc: string): Block[] {
  const lines = fs.readFileSync(doc, "utf-8").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i]!.match(/^```(\w+)\s*$/);
    if (m === null || !(LANGS_TS.has(m[1]!) || LANGS_JS.has(m[1]!))) {
      i += 1;
      continue;
    }
    const lang = m[1]!;
    const start = i + 1;
    let j = i + 1;
    while (j < lines.length && !lines[j]!.startsWith("```")) j += 1;
    const text = lines.slice(start, j).join("\n");
    i = j + 1;

    if (text.includes("❌") || text.includes("/**/")) continue;
    const { imports, body } = splitImports(text);
    if (imports.some((statement) => EXTERNAL_IMPORT_RE.test(statement))) continue;
    const bodyLines = body.filter(
      (l) => l.trim() && !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"),
    );
    if (bodyLines.length === 0) continue;
    if (!isExecutableBlock(bodyLines)) continue; // signature-only block
    blocks.push({ doc, line: start, lang, text });
  }
  return blocks;
}

/**
 * Merges a doc's import statements into a deduped module-level union: named
 * imports from the same module combine; bare/side-effect imports pass once.
 * @param statements One-line import statements
 * @returns The merged top-level import statements
 */
function mergeImports(statements: string[]): string[] {
  const named = new Map<string, string[]>();
  const raw: string[] = [];
  for (const statement of statements) {
    const m = statement.match(/^import\s+\{(.*)\}\s+from\s+["']([^"']+)["'];?$/);
    if (m) {
      const names = m[1]!.split(",").map((n) => n.trim()).filter(Boolean);
      named.set(m[2]!, [...(named.get(m[2]!) ?? []), ...names]);
      continue;
    }
    if (!raw.includes(statement)) raw.push(statement);
  }
  const imports: string[] = [];
  for (const [mod, names] of named) {
    imports.push(`import { ${[...new Set(names)].join(", ")} } from "${mod}";`);
  }
  for (const statement of raw) {
    imports.push(statement.endsWith(";") ? statement : `${statement};`);
  }
  return imports;
}

/**
 * Appends statement-terminating semicolons: after JSX closing tags and after
 * template-literal closers, when the next non-empty line starts a new
 * statement. Backtick parity is tracked so a semicolon never lands inside an
 * open template string. This suppresses the TS2657 adjacent-JSX false
 * positive without touching the doc text.
 * @param text The concatenated block body
 * @returns The body with defensive semicolons inserted
 */
function terminateStatements(text: string): string {
  const lines = text.split("\n");
  let inTemplate = false;
  for (let i = 0; i < lines.length; i++) {
    const ticks = lines[i]!.split("`").length - 1;
    const closesAtEol = inTemplate && ticks % 2 === 1 && lines[i]!.trimEnd().endsWith("`");
    if (ticks % 2 === 1) inTemplate = !inTemplate;
    if (inTemplate || (ticks % 2 === 1 && !closesAtEol)) continue;
    const t = lines[i]!.trimEnd();
    const needs = t.endsWith("/>") || /<\/[^>]*>$/.test(t) || (closesAtEol && t.endsWith("`"));
    if (!needs) continue;
    let next = "";
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j]!.trim()) {
        next = lines[j]!.trim();
        break;
      }
    }
    if (next && !CONTINUATION_RE.test(next)) lines[i] = `${t};`;
  }
  return lines.join("\n");
}

/**
 * Emits one module per doc (TS-family and JS separately), with `// AUDITSRC`
 * breadcrumbs mapping diagnostics back to mdx line numbers.
 * @param doc Absolute doc path
 * @param tier "strict" or "tutorial" — namespaced into separate subdirs
 * @returns The emitted module descriptors
 */
function emitModules(doc: string, tier: "strict" | "tutorial"): EmittedModule[] {
  const blocks = extractBlocks(doc);
  const emitted: EmittedModule[] = [];
  if (blocks.length === 0) return emitted;

  const rel = path.relative(projectRoot, doc).replace(/[/\\]/g, "_").replace(/\./g, "_");
  const base = path.join(OUT_DIR, tier, rel);

  for (const [family, langs] of [
    ["ts", LANGS_TS],
    ["js", LANGS_JS],
  ] as const) {
    const familyBlocks = blocks.filter((b) => langs.has(b.lang));
    if (familyBlocks.length === 0) continue;

    const statements: string[] = [];
    const scopes: string[] = [];
    for (const [idx, block] of familyBlocks.entries()) {
      const { imports, body } = splitImports(block.text);
      statements.push(...imports);
      const breadcrumb = `// AUDITSRC ${path.relative(projectRoot, block.doc)}:${block.line} block ${idx + 1}`;
      scopes.push(`${breadcrumb}\n${body.join("\n")}`);
    }
    const imports = mergeImports(statements).join("\n");
    // Nested scoping: each block opens a brace inside the previous block's
    // scope. Chaining stays legal (a later block reads an earlier block's
    // names — `guides/docs.md` concepts narrate that way) while same-name
    // reuse across blocks shadows instead of colliding (TS2451). Blocks that
    // declare ambient bindings (`declare const …`) cannot nest inside the
    // IIFE — TS1184 — so they hoist to module scope.
    const hoisted = scopes.filter((sc) => /^(declare|export) /m.test(sc));
    const inline = scopes.filter((sc) => !hoisted.includes(sc));
    const bodyText = terminateStatements(inline.join("\n{\n")) + "\n" + "}".repeat(Math.max(inline.length - 1, 0));

    const isTsx = familyBlocks.some((b) => b.lang === "tsx" || b.lang === "jsx");
    const file =
      family === "ts" ? `${base}${isTsx ? ".tsx" : ".ts"}` : `${base}.js`;
    const content =
      family === "ts"
        ? `${imports}\n\n${hoisted.join("\n")}\n\nexport async function __doc() {\n${bodyText}\n}\n__doc();\n`
        : `${imports}\n\n${hoisted.join("\n")}\n\n${bodyText}\n`;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    emitted.push({ doc, file, blockCount: familyBlocks.length });
  }
  return emitted;
}

/**
 * Writes a tsconfig for an emitted tier directory: extends the repo base,
 * maps `@hellajs/*` to package sources, JSX preserve (typed against dom's
 * global JSX namespace via each doc's own imports). `exclude` quarantines
 * grammar-error files for the second semantic pass.
 * @param dir The tier directory
 * @param exclude Repo-relative... tier-relative file paths to exclude
 * @returns The written config path
 */
function writeTierConfig(dir: string, exclude: string[] = []): string {
  const rel = path.relative(dir, projectRoot).split(path.sep).join("/");
  const paths: Record<string, string[]> = {};
  for (const pkg of PACKAGES) {
    paths[`@hellajs/${pkg}`] = [`${rel}/packages/${pkg}/lib/index.ts`];
    paths[`@hellajs/${pkg}/*`] = [`${rel}/packages/${pkg}/lib/*`];
  }
  const config = {
    extends: `${rel}/tsconfig.base.json`,
    compilerOptions: {
      noEmit: true,
      allowJs: true,
      checkJs: false,
      noUncheckedIndexedAccess: true,
      jsx: "preserve",
      paths,
    },
    include: ["./**/*.ts", "./**/*.tsx", "./**/*.js"],
    exclude: ["tsconfig.json", ...exclude],
  };
  const file = path.join(dir, "tsconfig.json");
  fs.writeFileSync(file, JSON.stringify(config, null, 2));
  return file;
}

/**
 * Runs tsc on the emitted corpus. Raw `spawnSync` (not `execCommand`) because
 * tsc intentionally exits 2 whenever findings exist — the output must be
 * captured, not rejected (guides/scripts.md's sanctioned non-zero exception).
 * @param configPath The generated tsconfig to compile
 * @returns Raw tsc stdout
 */
function runTsc(configPath: string): string {
  const result = spawnSync("bunx", ["tsc", "-p", configPath, "--noEmit", "--pretty", "false"], {
    encoding: "utf-8",
    cwd: projectRoot,
  });
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

/**
 * Parses tsc output into diagnostics.
 * @param raw tsc stdout
 * @returns Parsed diagnostics
 */
function parseDiagnostics(raw: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const m of raw.matchAll(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/gm)) {
    diagnostics.push({ file: m[1]!, line: Number(m[2]!), col: Number(m[3]!), code: m[4]!, message: m[5]! });
  }
  return diagnostics;
}

/**
 * Checks one tier: emit, two-pass typecheck (grammar quarantine → semantic),
 * report findings with AUDITSRC breadcrumbs.
 * @param tier "strict" or "tutorial"
 * @param docs The tier's docs
 * @returns The tier's relevant (post-quarantine, post-exemption) diagnostics
 */
function checkTier(tier: "strict" | "tutorial", docs: string[]): { modules: EmittedModule[]; relevant: Diagnostic[] } {
  const modules: EmittedModule[] = [];
  for (const doc of docs) modules.push(...emitModules(doc, tier));
  const tierDir = path.join(OUT_DIR, tier);
  if (modules.length === 0) return { modules, relevant: [] };

  let configPath = writeTierConfig(tierDir);
  let relevant: Diagnostic[] = [];
  let grammarFindings: Diagnostic[] = [];
  const grammarFiles = new Set<string>();
  for (let pass = 1; pass <= 2; pass++) {
    const diagnostics = parseDiagnostics(runTsc(configPath));
    const grammar = diagnostics.filter((d) => /^TS1\d{3}$/.test(d.code));
    if (pass === 1 && grammar.length > 0) {
      grammarFindings = grammar;
      for (const d of grammar) grammarFiles.add(d.file);
      configPath = writeTierConfig(
        tierDir,
        [...grammarFiles].map((file) => `./${path.relative(tierDir, file)}`),
      );
      continue;
    }
    relevant = [
      ...grammarFindings,
      ...diagnostics.filter(
        (d) =>
          !grammarFiles.has(d.file) &&
          // Exempt: dynamic imports of notional doc-internal relative modules.
          !(d.code === "TS2307" && /Cannot find module '\.\/|Cannot find module '\.\.\//.test(d.message)),
      ),
    ];
    break;
  }
  return { modules, relevant };
}

async function main(): Promise<void> {
  try {
    fs.rmSync(OUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const { strictDocs, tutorialDocs } = collectDocs();
    const strict = checkTier("strict", strictDocs);
    const tutorial = checkTier("tutorial", tutorialDocs);

    for (const d of strict.relevant) {
      const relFile = path.relative(projectRoot, d.file);
      const srcLine = fs.readFileSync(d.file, "utf-8").split("\n")[d.line - 1] ?? "";
      const breadcrumb = srcLine.match(/AUDITSRC (.+)$/)?.[1] ?? "";
      logger.info(`${relFile}(${d.line},${d.col}) ${d.code}: ${d.message}${breadcrumb ? ` — ${breadcrumb}` : ""}`);
    }
    for (const d of tutorial.relevant) {
      const relFile = path.relative(projectRoot, d.file);
      const srcLine = fs.readFileSync(d.file, "utf-8").split("\n")[d.line - 1] ?? "";
      const breadcrumb = srcLine.match(/AUDITSRC (.+)$/)?.[1] ?? "";
      logger.info(`[tutorial] ${relFile}(${d.line},${d.col}) ${d.code}: ${d.message}${breadcrumb ? ` — ${breadcrumb}` : ""}`);
    }

    const docsChecked = new Set([...strict.modules, ...tutorial.modules].map((m) => m.doc)).size;
    const blocksChecked = [...strict.modules, ...tutorial.modules].reduce((acc, m) => acc + m.blockCount, 0);
    logger.info(`checked ${docsChecked} docs, ${blocksChecked} blocks (${strict.relevant.length} strict, ${tutorial.relevant.length} tutorial findings)`);

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

if (import.meta.main) {
  main().catch((error: Error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
