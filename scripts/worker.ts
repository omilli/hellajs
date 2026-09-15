import { logger } from "./utils/index.js";
import { isThinkingLevel } from "./agent/rpc.js";
import { resolveSetFolder } from "./worker/set.js";
import { type WorktreeMode, runProbe, runSet } from "./worker/run.js";

/** Parsed CLI configuration. */
interface PlansArgs {
  probe: boolean;
  model?: string;
  thinking?: string;
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
    } else if (key === "--thinking") {
      if (!isThinkingLevel(value)) {
        throw new Error("invalid --thinking (expected off|minimal|low|medium|high|xhigh|max)");
      }
      args.thinking = value;
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
  logger.error("usage: bun worker <set-folder> [--wt=single|split] [--model=<provider/id>] [--thinking=<level>]");
  logger.error("       bun worker --probe [--model=<provider/id>] [--thinking=<level>]");
}

/** Entry point: parse args, validate, and dispatch to probe or run. */
async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.probe) {
      process.exit(await runProbe(args.model, args.thinking));
    }
    if (args.setFolder === undefined) {
      printUsage();
      process.exit(1);
    }
    const setDir = resolveSetFolder(args.setFolder);
    process.exit(await runSet({ setDir, model: args.model, thinking: args.thinking, mode: args.mode }));
  } catch (error) {
    logger.error(`worker failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error: Error): void => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
