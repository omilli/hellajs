import { buildAndStage } from "./bench/build.ts";
import { runBench } from "./bench/driver.ts";
import { BENCH_OPS, getOpIds } from "./bench/ops.ts";
import { appendReport, getGitDescriptor, printReport, type BenchReport } from "./bench/report.ts";
import { startBenchServer } from "./bench/serve.ts";
import { logger } from "./utils/index.ts";

interface BenchArgs {
  runs: number;
  throttle: number;
  label: string | null;
  headed: boolean;
  ops: string[];
}

/**
 * Parse and validate CLI args.
 *
 * @param argv Raw argv after the script path.
 * @returns The validated bench configuration.
 */
function parseArgs(argv: string[]): BenchArgs {
  const args: BenchArgs = {
    runs: 10,
    throttle: 4,
    label: null,
    headed: false,
    ops: getOpIds(),
  };

  for (const arg of argv) {
    if (arg === "--headed") {
      args.headed = true;
      continue;
    }
    const equals = arg.indexOf("=");
    if (!arg.startsWith("--") || equals === -1) {
      throw new Error(`unexpected argument "${arg}" (expected --key=value or --headed)`);
    }
    const key = arg.slice(0, equals);
    const value = arg.slice(equals + 1);

    if (key === "--runs") {
      if (!/^\d+$/.test(value) || Number(value) < 1) {
        throw new Error(`invalid --runs "${value}" (expected an integer >= 1)`);
      }
      args.runs = Number(value);
    } else if (key === "--throttle") {
      if (!/^\d+(\.\d+)?$/.test(value) || Number(value) < 1) {
        throw new Error(`invalid --throttle "${value}" (expected a number >= 1)`);
      }
      args.throttle = Number(value);
    } else if (key === "--label") {
      if (value === "") {
        throw new Error("invalid --label (expected non-empty text)");
      }
      args.label = value;
    } else if (key === "--ops") {
      const requested = value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      const valid = new Set(getOpIds());
      for (const id of requested) {
        if (!valid.has(id)) {
          throw new Error(`unknown op "${id}" (valid ops: ${getOpIds().join(", ")})`);
        }
      }
      if (requested.length === 0) {
        throw new Error(`invalid --ops "${value}" (expected at least one op)`);
      }
      args.ops = requested;
    } else {
      throw new Error(`unknown flag "${key}"`);
    }
  }

  return args;
}

async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    const ops = BENCH_OPS.filter((op) => args.ops.includes(op.id));
    const git = await getGitDescriptor();
    const label = args.label ?? `${git.shortSha}${git.dirty ? "*" : ""}`;

    logger.info("Building packages + example bundle…");
    await buildAndStage("jsx");

    const { server, port } = await startBenchServer();
    const url = `http://localhost:${port}/current/`;
    let result;
    try {
      result = await runBench({
        url,
        ops,
        runs: args.runs,
        throttle: args.throttle,
        headless: !args.headed,
      });
    } finally {
      server.close();
    }

    const report: BenchReport = {
      label,
      git,
      variant: "jsx",
      throttle: args.throttle,
      runs: args.runs,
      result,
    };
    printReport(report);
    await appendReport(report);
  } catch (error) {
    logger.error(`Bench failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

if (process.argv[1] === import.meta.filename) {
  main().catch((error: Error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
