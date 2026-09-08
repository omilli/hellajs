import { statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { logger } from "./utils/index.js";
import { listPlanUnits } from "./plans/set.js";
import { type WorktreeMode, runProbe, runSet } from "./plans/run.js";

/** Parsed CLI configuration. */
interface PlansArgs {
  probe: boolean;
  model?: string;
  mode: WorktreeMode;
  setFolder?: string;
}

/**
 * Parse and validate CLI args.
 *
 * @param argv Raw argv after the script path.
 * @returns The parsed configuration.
 */
function parseArgs(argv: string[]): PlansArgs {
  const args: PlansArgs = { probe: false, mode: "single" };
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
    } else if (key === "--wt") {
      if (value !== "single" && value !== "split") {
        throw new Error("invalid --wt (expected single|split)");
      }
      args.mode = value;
    } else {
      throw new Error(`unknown flag "${key}"`);
    }
  }
  return args;
}

/** Print the usage line. */
function printUsage(): void {
  logger.error("usage: bun plans <set-folder> [--wt=single|split] [--model=<provider/id[:thinking]>]");
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

/** Entry point: parse args, validate, and dispatch to probe or run. */
async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.probe) {
      process.exit(await runProbe(args.model));
    }
    if (args.setFolder === undefined) {
      printUsage();
      process.exit(1);
    }
    const setDir = validateSetFolder(args.setFolder);
    process.exit(await runSet({ setDir, model: args.model, mode: args.mode }));
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
