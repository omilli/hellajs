import path from "node:path";
import {
  execCommand,
  execCommandInherited,
  fileExists,
  logger,
  projectRoot,
} from "./utils/index.ts";

/**
 * Registry of tutorial examples with e2e coverage, in `vp run e2e` run order.
 * Grows one unit at a time (see plans/examples/tests/e2e-playwright/index.md);
 * insert new names at their index.md position.
 */
const EXAMPLES = [
  "counter",
  "theme-switcher",
  "todo",
  "blog",
  "ssr-islands",
  "ssr-routing",
  "ssr-streaming",
  "astro-islands",
] as const;

type ExampleName = (typeof EXAMPLES)[number];

const PLAYWRIGHT_BIN = path.join(projectRoot, "node_modules", ".bin", "playwright");

const args = process.argv.slice(2);
const exampleArg = args.find((arg) => !arg.startsWith("--"));
const headed = args.includes("--headed");

/** Parsed CLI arguments for the e2e runner. */
interface E2eArgs {
  /** Optional single example to run; omitted means the whole registry. */
  example?: ExampleName;
  /** Forward Playwright's `--headed` flag (browser window visible). */
  headed: boolean;
}

/**
 * Parse and validate CLI arguments: the first non-`--` arg is the example
 * name, `--headed` is a boolean flag.
 * @returns The parsed example selection and flags.
 */
function parseArgs(): E2eArgs {
  if (exampleArg && !(EXAMPLES as readonly string[]).includes(exampleArg)) {
    logger.error(`Unknown example "${exampleArg}". Valid names: ${EXAMPLES.join(", ")}`);
    process.exit(1);
  }
  return { example: exampleArg as ExampleName | undefined, headed };
}

/**
 * Bundle all packages so the examples resolve `@hellajs/*` via root links
 * into the packages' `dist` output. Quiet + cache-fingerprinted, so repeat
 * runs are fast.
 */
async function bundlePackages(): Promise<void> {
  await execCommand("node", ["./scripts/bundle.ts", "--quiet"], {
    cwd: projectRoot,
    timeout: 600000,
  });
}

/**
 * Install the example's dependencies iff its `node_modules` is missing
 * (committed locks make it deterministic; never install `@hellajs/*` or
 * `playwright` inside an example).
 * @param example Example registry name.
 */
async function ensureExampleInstall(example: ExampleName): Promise<void> {
  const exampleDir = path.join(projectRoot, "examples", example);
  if (await fileExists(path.join(exampleDir, "node_modules"))) return;
  logger.info(`Installing dependencies for ${example}...`);
  await execCommandInherited("npm", ["install"], { cwd: exampleDir });
}

/**
 * Run one example's Playwright suite (its own config builds and serves the
 * app, then tears it down). Output is inherited so it streams live.
 * @param example Example registry name.
 * @param headed Whether to forward Playwright's `--headed` flag.
 * @returns True when the suite exited 0.
 */
async function runExample(example: ExampleName, headed: boolean): Promise<boolean> {
  const exampleDir = path.join(projectRoot, "examples", example);
  const headedFlags = headed ? ["--headed"] : [];
  try {
    await execCommandInherited(
      PLAYWRIGHT_BIN,
      ["test", "--config", "playwright.config.ts", ...headedFlags],
      { cwd: exampleDir, timeout: 0 },
    );
    return true;
  } catch (error) {
    logger.error(`${(error as Error).message}`);
    return false;
  }
}

/** Orchestrate the e2e run: bundle, then per-example install + Playwright run + summary. */
async function main(): Promise<void> {
  try {
    const { example, headed } = parseArgs();
    const selected = example ? [example] : [...EXAMPLES];
    await bundlePackages();
    const failures: ExampleName[] = [];
    for (const name of selected) {
      await ensureExampleInstall(name);
      const passed = await runExample(name, headed);
      if (passed) {
        logger.success(`e2e ${name}`);
      } else {
        logger.error(`e2e ${name}`);
        failures.push(name);
      }
    }
    if (failures.length > 0) {
      logger.error(`e2e failed for: ${failures.join(", ")}`);
      process.exit(1);
    }
  } catch (error) {
    logger.error(`e2e runner failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

if (process.argv[1] === import.meta.filename) {
  main().catch((error: Error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
