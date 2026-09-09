import { logger, isValidPackage } from "./utils/index.js";
import { type AuditSection, runAudits } from "./audits/run.js";

/** Parsed CLI configuration. */
interface AuditsArgs {
  dryRun: boolean;
  model?: string;
  section?: AuditSection;
  target?: string;
}

/**
 * Parse and validate CLI args.
 *
 * @param argv Raw argv after the script path.
 * @returns The parsed configuration.
 */
function parseArgs(argv: string[]): AuditsArgs {
  const args: AuditsArgs = { dryRun: false };
  for (const arg of argv) {
    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    const equals = arg.indexOf("=");
    if (!arg.startsWith("--") || equals === -1) {
      if (args.target === undefined && !arg.startsWith("--")) {
        args.target = arg;
        continue;
      }
      throw new Error(`unexpected argument "${arg}" (expected a package or --flag=value)`);
    }
    const key = arg.slice(0, equals);
    const value = arg.slice(equals + 1);
    if (key === "--model") {
      if (value === "") {
        throw new Error("invalid --model (expected provider/id[:thinking])");
      }
      args.model = value;
    } else if (key === "--section") {
      if (value !== "code" && value !== "tests" && value !== "docs") {
        throw new Error("invalid --section (expected code|tests|docs)");
      }
      args.section = value;
    } else {
      throw new Error(`unknown flag "${key}"`);
    }
  }
  return args;
}

/**
 * Resolve the target argument to a bare workspace name.
 *
 * Accepts both `core` and `packages/core`; a `packages/` prefix is stripped
 * before validation so either spelling addresses the same workspace.
 *
 * @param target The target argument from the CLI.
 * @returns The bare package name.
 */
function resolveTarget(target: string): string {
  const bare = target.replace(/^packages\//, "");
  if (!isValidPackage(bare)) {
    throw new Error(`unknown package "${target}" (expected a packages/* workspace name)`);
  }
  return bare;
}

/** Print the usage line. */
function printUsage(): void {
  logger.error("usage: bun audits <package> [--section=code|tests|docs] [--model=<provider/id[:thinking]>] [--dry-run]");
  logger.error("       accepts a bare name (core) or packages/core; --dry-run prints derived sections and set dirs, then exits");
}

/** Entry point: parse args, resolve the target, and run the audit pipeline. */
async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.target === undefined) {
      printUsage();
      process.exit(1);
    }
    const packageName = resolveTarget(args.target);
    process.exit(
      await runAudits({ packageName, section: args.section, model: args.model, dryRun: args.dryRun }),
    );
  } catch (error) {
    logger.error(`audits failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error: Error): void => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
