import { statSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileExists, logger, projectRoot } from "./utils/index.js";
import { listPlanUnits } from "./plans/set.js";
import { runProbe, runSet } from "./plans/run.js";

/** Parsed CLI configuration. */
interface PlansArgs {
  probe: boolean;
  model?: string;
  setFolder?: string;
}

/** The worktree-protocol seam: its presence means this runner is outdated. */
const WORKTREE_SCRIPT = join(".agents", "skills", "worker", "scripts", "worktree.mjs");

/**
 * Parse and validate CLI args.
 *
 * @param argv Raw argv after the script path.
 * @returns The parsed configuration.
 */
function parseArgs(argv: string[]): PlansArgs {
  const args: PlansArgs = { probe: false };
  for (const arg of argv) {
    if (arg === "--probe") {
      args.probe = true;
      continue;
    }
    const equals = arg.indexOf("=");
    if (!arg.startsWith("--") || equals === -1) {
      if (args.setFolder === undefined && !arg.startsWith("--")) {
        args.setFolder = arg;
        continue;
      }
      throw new Error(`unexpected argument "${arg}" (expected a set folder or --flag=value)`);
    }
    const key = arg.slice(0, equals);
    const value = arg.slice(equals + 1);
    if (key === "--model") {
      if (value === "") {
        throw new Error("invalid --model (expected provider/id[:thinking])");
      }
      args.model = value;
    } else {
      throw new Error(`unknown flag "${key}"`);
    }
  }
  return args;
}

/** Print the usage line. */
function printUsage(): void {
  logger.error("usage: bun plans <set-folder> [--model=<provider/id[:thinking]>]");
  logger.error("       bun plans --probe [--model=<provider/id[:thinking]>]");
}

/**
 * Resolve and validate the set folder: it must be an existing directory with
 * at least one `NN-*.md` unit file.
 *
 * @param folder The folder argument from the CLI.
 * @returns The absolute set-folder path.
 */
function validateSetFolder(folder: string): string {
  const setDir = isAbsolute(folder) ? folder : resolve(folder);
  let isDirectory = false;
  try {
    isDirectory = statSync(setDir).isDirectory();
  } catch {
    // missing or unreadable folder — stays false
  }
  if (!isDirectory) {
    throw new Error(`set folder not found: ${setDir}`);
  }
  if (listPlanUnits(setDir).length === 0) {
    throw new Error(`no plan units (NN-*.md) in ${setDir}`);
  }
  return setDir;
}

/**
 * Refuse to run under the worktree protocol: this runner is main-tree mode
 * by design, and post-protocol marker reads would mis-gate every run.
 */
async function assertMainTreeVenue(): Promise<void> {
  if (await fileExists(join(projectRoot, WORKTREE_SCRIPT))) {
    logger.error(`worktree protocol detected: ${WORKTREE_SCRIPT} exists.`);
    logger.error(
      "this runner is main-tree mode; plans/root/config/skill-automation/02 (plan-runner adaptation) upgrades it to component mode — land that first.",
    );
    process.exit(1);
  }
}

/** Entry point: parse args, validate, and dispatch to probe or run. */
async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.probe) {
      await assertMainTreeVenue();
      process.exit(await runProbe(args.model));
    }
    if (args.setFolder === undefined) {
      printUsage();
      process.exit(1);
    }
    const setDir = validateSetFolder(args.setFolder);
    await assertMainTreeVenue();
    process.exit(await runSet({ setDir, model: args.model }));
  } catch (error) {
    logger.error(`plans failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error: Error): void => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
