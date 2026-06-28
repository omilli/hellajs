import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  execCommand,
  execCommandInherited,
  isValidPackage,
  projectRoot,
  packagesDir,
  logger,
} from "./utils/index.js";

/** ANSI SGR escape sequence matcher (e.g. \x1b[1;32m, \x1b[0m). */
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
const stripAnsi = (line: string): string => line.replace(ANSI, "");

/**
 * Write captured output to stdout, exiting only after the write drains.
 * Calling process.exit() immediately after a large process.stdout.write()
 * can truncate piped output in CI environments — the callback guarantees
 * the buffer is flushed before the process terminates.
 */
function writeAndExit(output: string, code: number): void {
  process.stdout.on("error", () => process.exit(code));
  process.stdout.write(output, () => process.exit(code));
}

/**
 * Run a command, capturing combined stdout+stderr. Resolves regardless of exit
 * code so coverage tables render even when tests fail. Bun sends test output
 * and coverage tables to stderr; stdout holds only the version banner —
 * concatenating stdout first preserves the original display order.
 *
 * FORCE_COLOR is injected so Bun emits ANSI color codes even though its
 * stdout is piped (non-TTY); without it, all output is plain white.
 *
 * Uses raw spawn (not execCommand) because execCommand rejects on non-zero exit
 * but this function must resolve regardless of exit code so coverage tables
 * render even when tests fail.
 */
function runCapture(
  command: string,
  args: string[],
  options: { cwd?: string } = {},
): Promise<{ output: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || projectRoot,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "1" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: string) => {
      stdout += d;
    });
    child.stderr.on("data", (d: string) => {
      stderr += d;
    });
    child.on("close", (code: number | null) =>
      resolve({ output: stdout + stderr, code: code ?? 1 }),
    );
    child.on("error", reject);
  });
}

/**
 * Run lint as the final gate. Returns 0/1 instead of throwing so the coverage
 * table still renders (writeAndExit is called by the caller). Callers skip this
 * when tests already failed — lint is the slow, rarely-failing step, so it runs
 * only on a green test run to keep the iteration loop fast.
 */
async function runLint(): Promise<number> {
  logger.info("Linting...");
  try {
    await execCommandInherited("bun", ["lint"], { cwd: projectRoot });
    return 0;
  } catch {
    return 1;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const packageName = args.find((arg) => !arg.startsWith("--"));

  if (!packageName) {
    logger.info("Running full coverage...");
    await execCommand("bun", ["./scripts/bundle.ts", "--quiet"], { cwd: projectRoot });
    const result = await runCapture("bun", ["test", "--coverage"], { cwd: projectRoot });
    const exitCode = result.code !== 0 ? result.code : await runLint();
    writeAndExit(result.output, exitCode);
    return;
  }

  if (!isValidPackage(packageName)) {
    logger.error(`Package "${packageName}" not found or invalid`);
    process.exit(1);
  }

  const testDir = path.join(packagesDir, packageName, "tests");
  if (!fs.existsSync(testDir)) {
    logger.error(`No tests directory found for package "${packageName}"`);
    process.exit(1);
  }

  logger.info(`Running scoped coverage for ${packageName}...`);

  await execCommand("bun", ["./scripts/bundle.ts", "--quiet"], { cwd: projectRoot });

  const result = await runCapture(
    "bun",
    ["test", `packages/${packageName}/tests`, "--coverage"],
    { cwd: projectRoot },
  );

  const exitCode = result.code !== 0 ? result.code : await runLint();
  const filtered = filterCoverageTable(result.output, packageName);
  writeAndExit(filtered, exitCode);
}

/**
 * Filters bun's coverage output to only show rows for the target package.
 *
 * Bun lacks a CLI flag to scope coverage instrumentation. The test preload
 * (utils/happydom.js) imports @hellajs/dom/bundle for DOM globals, so dom's
 * bundle is always loaded and instrumented — diluting the "All files" average.
 * Post-filtering the text reporter is the pragmatic fix: remove rows from
 * other packages and recalculate the aggregate from the remaining rows.
 */
function filterCoverageTable(
  output: string,
  packageName: string,
): string {
  const lines = output.split("\n");

  let tableStart = -1;
  let tableEnd = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^-{5,}\|/.test(stripAnsi(lines[i]!))) {
      if (tableStart === -1) tableStart = i;
      tableEnd = i;
    }
  }

  if (tableStart === -1) return output;

  const before = lines.slice(0, tableStart);
  const after = lines.slice(tableEnd + 1);
  const table = lines.slice(tableStart, tableEnd + 1);

  const pkgPrefix = `packages/${packageName}/`;
  const keptRows: string[] = [];
  const percentages: { funcs: number; lines: number }[] = [];

  for (const line of table) {
    const clean = stripAnsi(line);
    if (/^-{5,}\|/.test(clean)) continue;
    if (/^File\b/.test(clean)) continue;
    if (/^All files/.test(clean)) continue;
    if (clean.includes(pkgPrefix)) {
      keptRows.push(line);
      const match = clean.match(/\|\s*([\d.]+)\s*\|\s*([\d.]+)/);
      if (match) {
        percentages.push({
          funcs: parseFloat(match[1]!),
          lines: parseFloat(match[2]!),
        });
      }
    }
  }

  const sep = table.find((l) => /^-{5,}\|/.test(stripAnsi(l)));
  const header = table.find((l) => /^File\b/.test(stripAnsi(l)));
  const rebuilt: string[] = [sep!, header!, sep!];

  if (percentages.length > 0) {
    const avgFuncs =
      percentages.reduce((s, p) => s + p.funcs, 0) / percentages.length;
    const avgLines =
      percentages.reduce((s, p) => s + p.lines, 0) / percentages.length;
    const color =
      avgFuncs >= 100 && avgLines >= 100 ? "\x1b[1;32m" : "\x1b[1;31m";
    const f = ` ${avgFuncs.toFixed(2).padStart(7)} `;
    const l = ` ${avgLines.toFixed(2).padStart(7)} `;
    rebuilt.push(`${color}All files                    |${f}|${l}| \x1b[0m`);
  }

  rebuilt.push(...keptRows, sep!);
  return [...before, ...rebuilt, ...after].join("\n");
}

if (import.meta.main) {
  main().catch((error: Error) => {
    logger.error(`Coverage failed: ${error.message}`);
    process.exit(1);
  });
}
