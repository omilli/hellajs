import fs from "node:fs";
import path from "node:path";
import { logger, projectRoot } from "./utils/index.ts";
import { extractBlocks } from "./snippets/blocks.ts";
import type { MarkdownBlock } from "./snippets/blocks.ts";
import { emitModules, isExecutableBlock, splitImports } from "./snippets/emit.ts";
import { EXTERNAL_IMPORT_RE, LANGS_JS, LANGS_TS } from "./snippets/emit.ts";
import { typecheckDir } from "./snippets/tsc.ts";
import type { TscDiagnostic } from "./snippets/tsc.ts";
import { compileSkill, listSkills, loadSkill, validateSkill } from "./skills-build.ts";

/**
 * Guard (`vp run skills-check`, composed into `lint:guards`): keeps the
 * `*-best-practices` skills honest two ways.
 *
 * Freshness: compiles every skill's `AGENTS.md` into the run scratch dir and
 * byte-compares against the committed artifact — a mismatch means `rules/`
 * changed without a rebuild; exit 1 tells the author to run
 * `vp run skills-build`. No git state involved.
 *
 * Typecheck: every rule file's fenced ts/tsx/jsx blocks are emitted (one
 * module per rule file, `// RULESRC <skill>/<rule-file>:<line>` breadcrumbs)
 * and compiled with the shared snippet pipeline; diagnostics map back to
 * their owning block via the nearest preceding RULESRC breadcrumb. Skips are
 * marking, not fixing: blocks under an `**Incorrect` label (intentionally
 * wrong examples), blocks containing the ❌ mark, signature-only blocks, and
 * blocks importing external bare specifiers — `rules/_*` files are skipped
 * entirely. Strict gate: any finding in the corpus exits 1.
 */

const ALL_LANGS = new Set([...LANGS_TS, ...LANGS_JS]);
const OUT_DIR = path.join(projectRoot, ".skills-snippets");
/** Mirrors `doc-snippets.ts`'s path-mapped packages (headless/ui resolve via node_modules). */
const PACKAGES = ["core", "dom", "css", "resource", "router", "store", "ssr"] as const;

/**
 * Extracts a rule file's typecheckable blocks, applying the skills skip
 * policy: Incorrect-label blocks (intentionally wrong), ❌-marked blocks,
 * signature-only blocks, and blocks importing external bare specifiers.
 * @param ruleFile Absolute rule file path
 * @returns The blocks to check
 */
function checkableBlocks(ruleFile: string): MarkdownBlock[] {
  return extractBlocks(ruleFile, ALL_LANGS).filter((block) => {
    if (block.label === "Incorrect") return false;
    if (block.text.includes("❌")) return false;
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
 * Prunes `.skills-snippets/` down to live runs' scratch dirs — same contract
 * as `doc-snippets.ts::pruneStaleRuns`: entries not owned by a live pid are
 * removed; a live sibling run's dir is never touched.
 * @param outDir The `.skills-snippets` root
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
 * Resolves a tsc-reported file to an absolute path plus a stable display
 * path (this run's artifacts show `.skills-snippets/…` with the run-scoped
 * segment stripped; foreign files show their repo-relative path) — same
 * contract as `doc-snippets.ts::resolveDiagnosticFile`.
 * @param file The diagnostic's file as tsc printed it
 * @param runDir This run's scratch dir
 * @returns The absolute path and its display form
 */
function resolveDiagnosticFile(file: string, runDir: string): { abs: string; display: string } {
  const abs = path.resolve(projectRoot, file);
  const fromRun = path.relative(runDir, abs);
  const display = fromRun.startsWith("..")
    ? path.relative(projectRoot, abs)
    : path.join(".skills-snippets", fromRun);
  return { abs, display };
}

/**
 * Maps a diagnostic to its owning block's RULESRC breadcrumb: the nearest
 * breadcrumb comment at or above the diagnostic's line in the emitted
 * module. Import hoisting moves diagnostics off the breadcrumb line itself,
 * so exact-line extraction (doc-snippets' heuristic) would almost never
 * fire; per-rule modules make the owning block locatable instead.
 * @param abs Absolute emitted-module path
 * @param line The diagnostic's 1-based line
 * @returns The `skill/rule-file:line` breadcrumb, or "" when none precedes
 */
function ruleSrcFor(abs: string, line: number): string {
  const lines = fs.readFileSync(abs, "utf-8").split("\n");
  let breadcrumb = "";
  for (let i = 0; i < line && i < lines.length; i++) {
    const m = lines[i]!.match(/^\/\/ RULESRC (.+)$/);
    if (m !== null) breadcrumb = m[1]!;
  }
  return breadcrumb;
}

function main(): void {
  try {
    const entries = listSkills().filter((entry) => entry.hasRules);
    if (entries.length === 0) {
      logger.info("no skills found");
      process.exit(0);
    }

    const skills = entries.map((entry) => loadSkill(entry));
    const problems = skills.flatMap((skill) => validateSkill(skill));
    if (problems.length > 0) {
      for (const problem of problems) {
        logger.error(problem);
      }
      logger.error(`${problems.length} validation problem(s)`);
      process.exit(1);
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });
    pruneStaleRuns(OUT_DIR);
    const runDir = fs.mkdtempSync(path.join(OUT_DIR, `run-${process.pid}-`));

    const stale = skills.filter((skill) => {
      const compiled = compileSkill(skill);
      const scratch = path.join(runDir, "freshness", `${skill.name}.md`);
      fs.mkdirSync(path.dirname(scratch), { recursive: true });
      fs.writeFileSync(scratch, compiled);
      const committedPath = path.join(skill.dir, "AGENTS.md");
      const committed = fs.existsSync(committedPath)
        ? fs.readFileSync(committedPath, "utf-8")
        : null;
      return committed !== compiled;
    });
    if (stale.length > 0) {
      for (const skill of stale) {
        logger.error(
          `${skill.name}: stale compiled artifact (AGENTS.md does not match rules/); run vp run skills-build`,
        );
      }
      process.exit(1);
    }

    let blocksChecked = 0;
    const ruleFilesChecked = new Set<string>();
    for (const skill of skills) {
      for (const rule of skill.ruleFiles) {
        const blocks = checkableBlocks(rule.file);
        if (blocks.length === 0) continue;
        const fileName = path.basename(rule.file);
        const emitted = emitModules(
          blocks,
          path.join(runDir, `${skill.name}_${rule.stem}`),
          (block) => `// RULESRC ${skill.name}/${fileName}:${block.line}`,
        );
        blocksChecked += emitted.reduce((acc, module) => acc + module.blockCount, 0);
        ruleFilesChecked.add(rule.file);
      }
    }
    if (ruleFilesChecked.size === 0) {
      logger.info("no typecheckable blocks in corpus");
      process.exit(0);
    }

    const findings: TscDiagnostic[] = typecheckDir(runDir, PACKAGES);
    for (const d of findings) {
      const { abs, display } = resolveDiagnosticFile(d.file, runDir);
      const breadcrumb = ruleSrcFor(abs, d.line);
      logger.error(
        `${display}(${d.line},${d.col}) ${d.code}: ${d.message}${breadcrumb ? ` — ${breadcrumb}` : ""}`,
      );
    }
    logger.info(
      `checked ${skills.length} skill(s), ${ruleFilesChecked.size} rule file(s), ${blocksChecked} blocks (${findings.length} findings)`,
    );
    if (findings.length === 0) {
      logger.success("Skills snippets clean");
      process.exit(0);
    }
    logger.error(`${findings.length} finding(s)`);
    process.exit(1);
  } catch (error) {
    logger.error("skills-check failed", error as Error);
    process.exit(1);
  }
}

if (process.argv[1] === import.meta.filename) {
  main();
}
