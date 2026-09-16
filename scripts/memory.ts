import { logger } from "./utils/index.js";
import { isThinkingLevel } from "./agent/rpc.js";
import { DEFAULT_STALE_DAYS, runMemory } from "./memory/run.js";

/** Parsed CLI configuration. */
interface MemoryArgs {
  all: boolean;
  days?: number;
  limit?: number;
  model?: string;
  thinking?: string;
  dryRun: boolean;
}

/**
 * Parse and validate CLI args.
 *
 * @param argv Raw argv after the script path.
 * @returns The parsed configuration.
 */
function parseArgs(argv: string[]): MemoryArgs {
  const args: MemoryArgs = { all: false, dryRun: false };
  for (const arg of argv) {
    if (arg === "--all") {
      args.all = true;
      continue;
    }
    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    const equals = arg.indexOf("=");
    if (!arg.startsWith("--") || equals === -1) {
      throw new Error(`unexpected argument "${arg}" (expected --flag=value only)`);
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
    } else if (key === "--days") {
      args.days = parseCount(value, "--days", false);
    } else if (key === "--limit") {
      args.limit = parseCount(value, "--limit", true);
    } else {
      throw new Error(`unknown flag "${key}"`);
    }
  }
  if (args.all && args.days !== undefined) {
    throw new Error("--all and --days are mutually exclusive (--all already skips the staleness filter)");
  }
  return args;
}

/**
 * Parse a count flag value: a non-negative integer, or positive when the
 * flag semantics exclude zero.
 *
 * @param value Raw flag value.
 * @param flag Flag name, for the error message.
 * @param positive True when zero is invalid.
 * @returns The parsed count.
 */
function parseCount(value: string, flag: string, positive: boolean): number {
  const n = Number(value);
  if (!Number.isInteger(n) || (positive ? n < 1 : n < 0)) {
    throw new Error(`invalid ${flag} (expected a${positive ? " positive" : " non-negative"} integer, got "${value}")`);
  }
  return n;
}

/** Entry point: parse args and run the verification pipeline. */
async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    process.exit(
      await runMemory({
        all: args.all,
        days: args.days ?? DEFAULT_STALE_DAYS,
        limit: args.limit,
        model: args.model,
        thinking: args.thinking,
        dryRun: args.dryRun,
      }),
    );
  } catch (error) {
    logger.error(`memory failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error: Error): void => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
