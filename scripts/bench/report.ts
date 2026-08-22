/**
 * Reporting for the macro-benchmark: stdout summary + append-only log entry.
 *
 * The log (`.bench/results.md`) is the A/B surface: every entry is
 * self-describing (timestamp, label, HEAD sha, dirty marker, variant,
 * throttle, Chrome version, runs), so a reader always knows which code
 * produced which numbers. Entries are appended ONLY after all requested ops
 * verified — a failed run appends nothing.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, execCommand, fileExists, logger, projectRoot } from "../utils/index.js";
import type { BenchResult } from "./driver.js";
import type { BenchVariant } from "./build.js";

const resultsPath = path.join(projectRoot, ".bench", "results.md");

export interface GitDescriptor {
  readonly shortSha: string;
  readonly dirty: boolean;
}

export interface BenchReport {
  readonly label: string;
  readonly git: GitDescriptor;
  readonly variant: BenchVariant;
  readonly throttle: number;
  readonly runs: number;
  readonly result: BenchResult;
}

/**
 * Read (never mutate) the git state describing the measured tree.
 *
 * The only git the bench tool runs is this read-only descriptor.
 *
 * @returns The short HEAD sha and whether the working tree is dirty.
 */
export async function getGitDescriptor(): Promise<GitDescriptor> {
  const sha = await execCommand("git", ["rev-parse", "--short", "HEAD"]);
  const status = await execCommand("git", ["status", "--porcelain"]);
  return { shortSha: sha.stdout.trim(), dirty: status.stdout.trim().length > 0 };
}

/**
 * Format a local timestamp as `YYYY-MM-DD HH:mm`.
 *
 * @param date The date to format.
 * @returns The formatted stamp.
 */
function formatStamp(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Build the markdown table shared by stdout and the log entry.
 *
 * @param report The completed run.
 * @returns The table lines.
 */
function tableLines(report: BenchReport): string[] {
  return [
    "| op | median (ms) | mean (ms) |",
    "| --- | --- | --- |",
    ...report.result.ops.map(
      (op) => `| ${op.id} | ${op.median.toFixed(2)} | ${op.mean.toFixed(2)} |`,
    ),
  ];
}

/**
 * Print the run summary to stdout.
 *
 * @param report The completed run.
 */
export function printReport(report: BenchReport): void {
  logger.info(
    `Chrome ${report.result.chromeVersion} · throttle ${report.throttle}x · ` +
      `runs ${report.runs} · variant ${report.variant}`,
  );
  logger.info(
    `label ${report.label} · HEAD ${report.git.shortSha}` +
      `${report.git.dirty ? " (dirty)" : ""}`,
  );
  for (const line of tableLines(report)) {
    logger.info(line);
  }
}

/**
 * Append the run's entry to `.bench/results.md`.
 *
 * Creates the file with a `# Bench log` header when absent; existing content
 * is preserved — entries are strictly appended, never rewritten.
 *
 * @param report The completed (fully verified) run.
 */
export async function appendReport(report: BenchReport): Promise<void> {
  await ensureDir(path.dirname(resultsPath));
  const header = (await fileExists(resultsPath)) ? "" : "# Bench log\n";
  const dirtyMarker = report.git.dirty ? "*" : "";
  const entry = [
    "",
    `## ${formatStamp(new Date())} · ${report.label} · ` +
      `${report.git.shortSha}${dirtyMarker} · ${report.variant} · ` +
      `${report.throttle}x · Chrome ${report.result.chromeVersion} · ` +
      `runs=${report.runs}`,
    ...tableLines(report),
  ].join("\n");

  await fs.appendFile(resultsPath, header + entry + "\n", "utf8");
}
