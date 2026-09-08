import { logger } from "./utils/index.js";
import { resolveSetFolder } from "./plans/set.js";
import { runMerge } from "./merge/run.js";

/** Parsed CLI configuration. */
interface MergeArgs {
  dryRun: boolean;
  model?: string;
  setFolder?: string;
}

/**
 * Parse and validate CLI args.
 *
 * @param argv Raw argv after the script path.
 * @returns The parsed configuration.
 */
function parseArgs(argv: string[]): MergeArgs {
  const args: MergeArgs = { dryRun: false };
  for (const arg of argv) {
    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    const equals = arg.indexOf("=");
    if (!arg.startsWith("--") || equals === -1) {
      if (args.setFolder === undefined && !arg.startsWith("--")) {
        args.setFolder = arg;
        continue;
      }
      throw new Error(`unexpected argument "${arg}" (expected a set folder or --flag[=value])`);
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
  logger.error("usage: bun merge <set-folder> [--model=<provider/id[:thinking]>] [--dry-run]");
  logger.error("       --dry-run prints the derived queue and completeness, then exits before any spawn");
}

/** Entry point: parse args, validate, and run the merge. */
async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.setFolder === undefined) {
      printUsage();
      process.exit(1);
    }
    const setDir = resolveSetFolder(args.setFolder);
    process.exit(await runMerge({ setDir, model: args.model, dryRun: args.dryRun }));
  } catch (error) {
    logger.error(`merge failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error: Error): void => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
