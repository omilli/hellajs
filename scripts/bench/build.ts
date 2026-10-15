/**
 * Build + staging for the macro-benchmark.
 *
 * Rebuilds every package `dist/` (the example bundles against these built
 * artifacts — `package.json` `main` points at `dist`, which is gitignored and
 * survives checkouts), builds the chosen `examples/bench` variant, and stages
 * `index.html` + `dist/` into `.bench/current/` for the static server.
 *
 * Performs ZERO git-state mutation — ref switching for A/B comparison is the
 * user's manual protocol (`git checkout <ref>` → run → repeat).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, execCommandInherited, projectRoot } from "../utils/index.js";

const VARIANT_SCRIPTS: Record<BenchVariant, string> = {
  jsx: "bundle:j",
};

export type BenchVariant = "jsx";

const examplesBenchDir = path.join(projectRoot, "examples", "bench");
const stageDir = path.join(projectRoot, ".bench", "current");

/**
 * Run one build step, enriching failures with the command that failed.
 *
 * @param command Executable to run.
 * @param args Arguments to pass.
 * @param cwd Working directory for the command.
 */
async function runStep(
  command: string,
  args: string[],
  cwd: string,
): Promise<void> {
  try {
    await execCommandInherited(command, args, { cwd });
  } catch (error: unknown) {
    throw new Error(
      `bench build step failed: ${command} ${args.join(" ")} (cwd: ${cwd})`,
      { cause: error },
    );
  }
}

/**
 * Rebuild all packages + the chosen example variant, then stage the app.
 *
 * Stages `index.html` + `dist/` into `.bench/current/`, replacing any prior
 * staging. Order is mandatory: `bun bundle` first (a stale package `dist/`
 * silently measures the wrong source).
 *
 * @param variant Which `examples/bench` bundle variant to build.
 */
export async function buildAndStage(variant: BenchVariant): Promise<void> {
  await runStep("bun", ["run", "bundle"], projectRoot);
  await runStep("bun", ["run", VARIANT_SCRIPTS[variant]], examplesBenchDir);

  await fs.rm(stageDir, { recursive: true, force: true });
  await ensureDir(stageDir);
  await fs.cp(
    path.join(examplesBenchDir, "index.html"),
    path.join(stageDir, "index.html"),
  );
  await fs.cp(
    path.join(examplesBenchDir, "dist"),
    path.join(stageDir, "dist"),
    { recursive: true },
  );
}
