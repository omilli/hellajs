import { mkdtemp, rm, readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { tmpdir } from "node:os";
import { execCommand, fileExists, logger, projectRoot } from "./utils/index.js";

const CONFIG = {
  REMOTE_URL: "https://github.com/omilli/brain.git",
  SKILLS_DIR: join(projectRoot, ".agents", "skills"),
  SKILL_PREFIX: "brain-",
  CLONE_TIMEOUT_MS: 120000,
};

interface Args {
  dryRun: boolean;
  remoteUrl: string;
}

interface SyncStats {
  copied: number;
  removed: number;
  unchanged: number;
  skills: number;
}

/**
 * Parse CLI args: `--dry-run` skips writes; `--remote=<url>` overrides upstream.
 */
function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, remoteUrl: CONFIG.REMOTE_URL };
  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg.startsWith("--remote=")) {
      args.remoteUrl = arg.slice("--remote=".length);
    }
  }
  return args;
}

/**
 * Shallow-clone the brain repo into a fresh temp dir and return the path.
 * Caller must remove the dir when done.
 */
async function cloneUpstream(remoteUrl: string): Promise<string> {
  const tmp = await mkdtemp(join(tmpdir(), "hellajs-skills-"));
  logger.info(`Cloning ${remoteUrl} (shallow)...`);
  await execCommand(
    "git",
    ["clone", "--depth", "1", remoteUrl, tmp],
    { timeout: CONFIG.CLONE_TIMEOUT_MS },
  );
  return tmp;
}

/**
 * Recursively list every regular file under `dir`, as POSIX-relative paths.
 */
async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(d: string): Promise<void> {
    const entries = await readdir(d, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        out.push(relative(dir, full));
      }
    }
  }
  await walk(dir);
  return out;
}

/**
 * Mirror one upstream skill dir into .agents/skills/<name>/.
 * Writes/overwrites every upstream file; removes dest files not in upstream
 * (so a renamed file upstream is dropped locally). Local skills outside the
 * `brain-*` prefix (e.g. `comparison/`) are never touched.
 */
async function mirrorSkill(
  srcSkillDir: string,
  destSkillDir: string,
  stats: SyncStats,
  dryRun: boolean,
): Promise<void> {
  const srcFiles = await listFiles(srcSkillDir);
  const destFiles = (await fileExists(destSkillDir))
    ? await listFiles(destSkillDir)
    : [];
  const srcSet = new Set(srcFiles);

  for (const rel of srcFiles) {
    const srcContent = await readFile(join(srcSkillDir, rel));
    const destPath = join(destSkillDir, rel);
    const destExists = await fileExists(destPath);
    const destContent = destExists ? await readFile(destPath) : null;
    if (destContent && srcContent.equals(destContent)) {
      stats.unchanged++;
      continue;
    }
    if (!dryRun) {
      await mkdir(dirname(destPath), { recursive: true });
      await writeFile(destPath, srcContent);
    }
    logger.info(`  ${destExists ? "update" : "add   "} ${destPath}`);
    stats.copied++;
  }

  for (const rel of destFiles) {
    if (srcSet.has(rel)) continue;
    const orphan = join(destSkillDir, rel);
    if (!dryRun) await rm(orphan, { force: true });
    logger.warn(`  remove ${orphan}`);
    stats.removed++;
  }
}

/**
 * Sync every `brain-*` skill from upstream into `.agents/skills/`.
 */
async function syncSkills(args: Args): Promise<SyncStats> {
  const stats: SyncStats = { copied: 0, removed: 0, unchanged: 0, skills: 0 };
  let tmp = "";
  try {
    tmp = await cloneUpstream(args.remoteUrl);
    const skillNames = (await readdir(tmp, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && e.name.startsWith(CONFIG.SKILL_PREFIX))
      .map((e) => e.name)
      .sort();
    if (!skillNames.length) {
      throw new Error(
        `No '${CONFIG.SKILL_PREFIX}*' dirs found upstream at ${tmp}`,
      );
    }
    logger.info(`Found ${skillNames.length} skills upstream.`);
    for (const name of skillNames) {
      stats.skills++;
      await mirrorSkill(
        join(tmp, name),
        join(CONFIG.SKILLS_DIR, name),
        stats,
        args.dryRun,
      );
    }
  } finally {
    if (tmp) await rm(tmp, { recursive: true, force: true });
  }
  return stats;
}

/**
 * Print `git diff --stat` for `.agents/skills/` so changes are reviewable
 * before committing.
 */
async function showDiff(): Promise<void> {
  const result = await execCommand(
    "git",
    [
      "--no-pager",
      "diff",
      "--stat",
      "--",
      relative(projectRoot, CONFIG.SKILLS_DIR),
    ],
    { timeout: 15000 },
  ).catch(() => null);
  const out = result?.stdout.trim();
  if (out) logger.info("\n" + out);
  else logger.info("No tracked-file changes in .agents/skills/");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  if (args.dryRun) logger.warn("Dry-run mode: no files will be written.");
  const stats = await syncSkills(args);
  logger.success(
    `Synced ${stats.skills} skills: ${stats.copied} updated, ${stats.removed} removed, ${stats.unchanged} unchanged.`,
  );
  if (!args.dryRun) await showDiff();
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    logger.error("sync-skills failed:", error as Error);
    process.exit(1);
  });
}
