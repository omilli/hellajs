/**
 * Component-worktree protocol for plan-file worker execution (skill-bundled
 * by design: lives under `.agents/`, outside `scripts/**` and its guides).
 *
 * A component worktree is a clean cut from the base branch plus exactly two
 * carries — the full plan-set folder (plans are never committed, so a cut has
 * none) and the uncommitted `memory/` delta. After seeding, a baseline commit
 * is recorded (stage-all -> write-tree -> commit-tree, no ref moved): diff and
 * apply are both baseline-relative, so carried-but-unchanged files are
 * invisible and a stale sibling copy can never revert a merged tick.
 *
 * The hash lives under the worktree's gitdir (never in the working tree, where
 * it would pollute every diff). Staging is permitted; committing never is —
 * the worker accumulates working-tree state, `merge` applies it.
 *
 * Usage: bun .agents/skills/worker/scripts/worktree.mjs <command> [args]
 *   new <slug> --plans <set-folder> [--base <ref>]   seed + carry + baseline + bun install
 *   diff <slug>                                      baseline-relative patch (stdout)
 *   apply <slug> [--target <path>]                   3-way apply at target (default: main repo)
 *   status <slug>                                    baseline + dirty summary
 *   list                                             every protocol worktree
 *   clean <slug>                                     remove worktree + branch, prune
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root (scripts/ -> worker/ -> skills/ -> .agents/ -> root). */
const MAIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
/** Protocol worktrees live in a sibling dir, namespace-separated from manual ones. */
const WT_ROOT = resolve(MAIN_ROOT, "..", "hellajs-wt");
/** Base branch for new worktrees (parameterized; "for now" per spec D2). */
const BASE_DEFAULT = "v2";
/** Branch prefix for protocol worktrees. */
const BRANCH_PREFIX = "wt/";
/** Baseline-hash file inside the worktree gitdir (never the working tree). */
const BASELINE_FILE = "hellajs-baseline";
/** Carried-plan-folder file inside the worktree gitdir (re-enter matching). */
const PLANS_FILE = "hellajs-plans";

/** Slug validity: path-safe single segment, no traversal. */
const SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Run a command and capture its result (never throws; callers check status).
 *
 * @param {string} command Executable name.
 * @param {string[]} args Argument vector.
 * @param {object} [options] { cwd?: string, input?: string, inherit?: boolean }
 * @returns {{ status: number, stdout: string, stderr: string }}
 */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? MAIN_ROOT,
    input: options.input,
    encoding: "utf8",
    stdio: options.inherit ? ["pipe", "inherit", "inherit"] : undefined,
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

/**
 * Run git and fail the process on a non-zero exit (reporting command + stderr).
 *
 * @param {string[]} args Git argument vector.
 * @param {object} [options] { cwd?: string, input?: string, raw?: boolean }
 * @returns {string} Stdout (trimmed; `raw` preserves it verbatim — a patch whose
 *   final newline is stripped is a corrupt patch to `git apply`).
 */
function git(args, options = {}) {
  const result = run("git", args, options);
  if (result.status !== 0) {
    fail(`git ${args.join(" ")} failed (exit ${result.status})\n${result.stderr.trim()}`);
  }
  return options.raw ? result.stdout : result.stdout.trim();
}

/** Print an error and exit non-zero: protocol failures are loud, never silent. */
function fail(message) {
  process.stderr.write(`worktree.mjs: ${message}\n`);
  process.exit(1);
}

/**
 * Absolute path of a slug's worktree.
 *
 * @param {string} slug Worktree slug.
 * @returns {string} Absolute path under `../hellajs-wt/`.
 */
function wtPath(slug) {
  return resolve(WT_ROOT, slug);
}

/**
 * The worktree's gitdir (`<main>/.git/worktrees/<slug>` for linked worktrees)
 * where protocol metadata (baseline hash, carried plans) lives.
 *
 * @param {string} slug Worktree slug.
 * @returns {string} Absolute gitdir path.
 */
function wtGitDir(slug) {
  return resolve(wtPath(slug), git(["-C", wtPath(slug), "rev-parse", "--git-dir"]));
}

/**
 * Read the recorded post-seed baseline commit hash.
 *
 * @param {string} slug Worktree slug.
 * @returns {string | null} Commit hash, or null when none recorded.
 */
function readBaseline(slug) {
  try {
    return readFileSync(join(wtGitDir(slug), BASELINE_FILE), "utf8").trim();
  } catch {
    return null;
  }
}

/**
 * Read the carried plan-set folder path (repo-relative) recorded at seed time.
 *
 * @param {string} slug Worktree slug.
 * @returns {string | null} Repo-relative folder path, or null when none.
 */
function readPlans(slug) {
  try {
    return readFileSync(join(wtGitDir(slug), PLANS_FILE), "utf8").trim();
  } catch {
    return null;
  }
}

/**
 * The component's true delta: baseline -> staged working state.
 *
 * Stages everything first (`git add -A`) so new files appear; committing is
 * never permitted — staging is the diff mechanism, not a state change.
 *
 * @param {string} slug Worktree slug.
 * @returns {string} Unified patch (empty when nothing changed).
 */
function baselineDiff(slug) {
  const baseline = readBaseline(slug);
  if (baseline === null) {
    fail(`no baseline recorded for "${slug}" — was it seeded by \`new\`?`);
  }
  git(["-C", wtPath(slug), "add", "-A"]);
  return git(["-C", wtPath(slug), "diff", baseline], { raw: true });
}

/**
 * Seed a new component worktree: clean cut, two carries, baseline, install.
 *
 * @param {string[]} args Raw args after `new`.
 */
function commandNew(args) {
  const slug = args[0];
  const options = parseFlagValues(args.slice(1), ["--plans", "--base"]);
  if (slug === undefined || !SLUG_RE.test(slug) || slug.startsWith(".")) {
    fail(`invalid slug "${slug ?? ""}" (expected a path-safe single segment)`);
  }
  if (options.has("--plans") === false) {
    fail("new requires --plans <set-folder> (the carry is the point of the protocol)");
  }
  const base = options.get("--base") ?? BASE_DEFAULT;
  const plansArg = options.get("--plans");
  const plansAbs = isAbsolute(plansArg) ? resolve(plansArg) : resolve(MAIN_ROOT, plansArg);
  const plansRel = relative(MAIN_ROOT, plansAbs);
  if (plansRel.startsWith("..")) {
    fail(`--plans folder must live inside the repo: ${plansAbs}`);
  }

  if (run("git", ["rev-parse", "--verify", `refs/heads/${BRANCH_PREFIX}${slug}`]).status === 0) {
    fail(`branch ${BRANCH_PREFIX}${slug} already exists — re-enter its worktree or \`clean\` it first`);
  }
  if (run("git", ["worktree", "list", "--porcelain"]).stdout.includes(`worktree ${wtPath(slug)}\n`)) {
    fail(`worktree already exists: ${wtPath(slug)} — re-enter it, never provision a duplicate`);
  }

  mkdirSync(WT_ROOT, { recursive: true });
  git(["worktree", "add", "-b", `${BRANCH_PREFIX}${slug}`, wtPath(slug), base]);

  // Carry 1: the full plan-set folder (plans are untracked — a cut has none).
  cpSync(plansAbs, join(wtPath(slug), plansRel), { recursive: true });

  // Carry 2: the uncommitted memory/ delta — tracked modifications as a patch,
  // untracked files copied verbatim (fresh entries are the most task-relevant).
  const memoryPatch = run("git", ["diff", "HEAD", "--binary", "--", "memory/"]).stdout;
  if (memoryPatch !== "") {
    const applied = run("git", ["-C", wtPath(slug), "apply", "-"], { input: memoryPatch });
    if (applied.status !== 0) {
      fail(`memory/ patch carry failed\n${applied.stderr.trim()}`);
    }
  }
  for (const file of git(["ls-files", "--others", "--exclude-standard", "--", "memory/"]).split("\n")) {
    if (file !== "") {
      cpSync(join(MAIN_ROOT, file), join(wtPath(slug), file));
    }
  }

  // Post-seed baseline: stage-all -> write-tree -> commit-tree, no ref moved.
  git(["-C", wtPath(slug), "add", "-A"]);
  const tree = git(["-C", wtPath(slug), "write-tree"]);
  const baseline = run("git", ["-C", wtPath(slug), "commit-tree", tree], {
    input: `hellajs-wt seed: ${slug}\n`,
  });
  if (baseline.status !== 0) {
    fail(`commit-tree failed (is git identity configured?)\n${baseline.stderr.trim()}`);
  }
  const gitDir = wtGitDir(slug);
  writeFileSync(join(gitDir, BASELINE_FILE), `${baseline.stdout.trim()}\n`);
  writeFileSync(join(gitDir, PLANS_FILE), `${plansRel}\n`);

  const installed = run("bun", ["install"], { cwd: wtPath(slug), inherit: true });
  if (installed.status !== 0) {
    fail(`bun install failed in ${wtPath(slug)} (exit ${installed.status})`);
  }

  console.log(`seeded ${slug}: branch ${BRANCH_PREFIX}${slug} @ ${base}`);
  console.log(`  worktree ${wtPath(slug)}`);
  console.log(`  carried  ${plansRel}`);
  console.log(`  baseline ${baseline.stdout.trim()}`);
}

/**
 * Parse `--key value` (and `--key=value`) pairs for a fixed key set.
 *
 * @param {string[]} args Raw args.
 * @param {string[]} keys Recognized flag keys.
 * @returns {Map<string, string>} Key -> value map; presence = has().
 */
function parseFlagValues(args, keys) {
  const map = new Map();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const equals = arg.indexOf("=");
    const key = equals === -1 ? arg : arg.slice(0, equals);
    if (!keys.includes(key)) {
      fail(`unknown flag "${arg}" (expected ${keys.join(" / ")})`);
    }
    const value = equals === -1 ? args[++i] : arg.slice(equals + 1);
    if (value === undefined) {
      fail(`flag ${key} needs a value`);
    }
    map.set(key, value);
  }
  return map;
}

/**
 * Print the baseline-relative patch for a component worktree.
 *
 * @param {string[]} args Raw args after `diff`.
 */
function commandDiff(args) {
  const slug = requireSlug(args, "diff");
  process.stdout.write(baselineDiff(slug));
}

/**
 * Extract the file paths a patch touches (`b/` side of each `diff --git`).
 *
 * @param {string} patch Unified patch.
 * @returns {string[]} Repo-relative paths.
 */
function patchPaths(patch) {
  const paths = [];
  for (const line of patch.split("\n")) {
    if (line.startsWith("diff --git ")) {
      const match = line.match(/^diff --git a\/(.*) b\/(.*)$/);
      if (match !== null) {
        paths.push(match[2]);
      }
    }
  }
  return paths;
}

/**
 * Apply a component worktree's delta at a target via 3-way apply.
 *
 * Conflicts are reported (git's stderr) and the exit is non-zero — never
 * auto-resolved, never silently partial. Resolution authority is the merge
 * skill's, agent-side, per both plan contracts.
 *
 * @param {string[]} args Raw args after `apply`.
 */
function commandApply(args) {
  const slug = requireSlug(args, "apply");
  const options = parseFlagValues(args.slice(1), ["--target"]);
  const target = options.has("--target") ? resolve(MAIN_ROOT, options.get("--target")) : MAIN_ROOT;
  const patch = baselineDiff(slug);
  if (patch === "") {
    console.log(`apply ${slug}: nothing to apply (no changes since baseline)`);
    return;
  }
  // 3-way apply needs each preimage in the target's index; carried files can
  // exist on disk yet be untracked there (plans/ are never committed) — and
  // the plan folder can be gitignored at the target (runner fixtures under
  // .plans-runner/ are), which plain `add` refuses. Force-stage exactly those
  // — the working-tree content is the "ours" side git merges.
  for (const path of patchPaths(patch)) {
    if (existsSync(join(target, path)) && git(["-C", target, "ls-files", "--", path]) === "") {
      git(["-C", target, "add", "-f", "--", path]);
    }
  }
  const applied = run("git", ["-C", target, "apply", "--3way", "-"], { input: patch });
  if (applied.stderr !== "") {
    process.stderr.write(applied.stderr);
  }
  if (applied.status !== 0) {
    fail(`apply of "${slug}" at ${target} exited ${applied.status} — conflicts reported above; resolve agent-side, nothing silently applied`);
  }
  console.log(`applied ${slug} -> ${target}`);
}

/**
 * Print baseline metadata plus a dirty summary for one worktree.
 *
 * @param {string[]} args Raw args after `status`.
 */
function commandStatus(args) {
  const slug = requireSlug(args, "status");
  if (!existsSync(wtPath(slug))) {
    fail(`no worktree for slug "${slug}"`);
  }
  const path = wtPath(slug);
  const branch = git(["-C", path, "branch", "--show-current"]);
  const baseline = readBaseline(slug);
  const changed = baseline === null ? "?" : git(["-C", path, "diff", "--name-only", baseline]).split("\n").filter(Boolean).length;
  const untracked = run("git", ["-C", path, "status", "--porcelain"]).stdout
    .split("\n")
    .filter((line) => line.startsWith("??")).length;
  console.log(`${slug}  branch=${branch}  baseline=${baseline ?? "none"}`);
  console.log(`  worktree ${path}`);
  console.log(`  plans    ${readPlans(slug) ?? "none"}`);
  console.log(`  dirty    ${changed} changed vs baseline, ${untracked} untracked`);
}

/**
 * List every protocol worktree under `../hellajs-wt/` with its metadata.
 */
function commandList() {
  const found = [];
  for (const block of git(["worktree", "list", "--porcelain"]).split("\n\n")) {
    const pathLine = block.split("\n").find((line) => line.startsWith("worktree "));
    if (pathLine === undefined) {
      continue;
    }
    const path = pathLine.slice("worktree ".length);
    if (!path.startsWith(`${WT_ROOT}${sep}`)) {
      continue;
    }
    const slug = basename(path);
    const branch = git(["-C", path, "branch", "--show-current"]);
    console.log(`${slug}  branch=${branch}  baseline=${readBaseline(slug) ?? "none"}  plans=${readPlans(slug) ?? "none"}`);
    found.push(slug);
  }
  if (found.length === 0) {
    console.log("(no protocol worktrees)");
  }
}

/**
 * Remove a worktree and its branch, then prune — the component's rollback.
 *
 * The branch must go too: a stale `wt/<slug>` ref would collide on the next
 * `new` of the same slug (the re-enter story requires clean to be total).
 *
 * @param {string[]} args Raw args after `clean`.
 */
function commandClean(args) {
  const slug = requireSlug(args, "clean");
  const path = wtPath(slug);
  if (!existsSync(path)) {
    fail(`no worktree for slug "${slug}"`);
  }
  git(["worktree", "remove", "--force", path]);
  run("git", ["worktree", "prune"]);
  run("git", ["branch", "-D", `${BRANCH_PREFIX}${slug}`]);
  console.log(`removed ${slug} (${path})`);
}

/**
 * Extract and validate the slug positional shared by every slug command.
 *
 * @param {string[]} args Raw args.
 * @param {string} command Command name (for the error message).
 * @returns {string} The slug.
 */
function requireSlug(args, command) {
  const slug = args[0];
  if (slug === undefined || !SLUG_RE.test(slug)) {
    fail(`usage: worktree.mjs ${command} <slug> [...]`);
  }
  return slug;
}

/** Print usage and exit non-zero. */
function usage() {
  const lines = [
    "usage: bun .agents/skills/worker/scripts/worktree.mjs <command> [args]",
    "  new <slug> --plans <set-folder> [--base <ref>]   seed + carry + baseline + bun install",
    "  diff <slug>                                      baseline-relative patch (stdout)",
    "  apply <slug> [--target <path>]                   3-way apply at target (default: main repo)",
    "  status <slug>                                    baseline + dirty summary",
    "  list                                             every protocol worktree",
    "  clean <slug>                                     remove worktree + branch, prune",
  ];
  process.stderr.write(`${lines.join("\n")}\n`);
  process.exit(1);
}

const [command, ...rest] = process.argv.slice(2);
if (command === "new") {
  commandNew(rest);
} else if (command === "diff") {
  commandDiff(rest);
} else if (command === "apply") {
  commandApply(rest);
} else if (command === "status") {
  commandStatus(rest);
} else if (command === "list") {
  commandList();
} else if (command === "clean") {
  commandClean(rest);
} else {
  usage();
}
