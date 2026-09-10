/**
 * Curated launchables and start guards for the remote daemon
 * (`scripts/remote/server.ts`).
 *
 * Three start kinds: plan sets enumerated from the real `plans/` tree
 * (read-only, reusing the `scripts/plans/set.ts` listing), fixed presets,
 * and a custom-command escape hatch parsed to an argv array (never a
 * shell). Owns the concurrency guards that keep worktree-driving runs from
 * racing each other.
 */

import { readdirSync } from "node:fs";
import path from "node:path";
import { listPlanUnits } from "../plans/set.js";
import { projectRoot } from "../utils/index.js";

/** One preset command (exact argv, no shell). */
export interface Preset {
  ref: string;
  label: string;
  argv: string[];
}

/** One plan set enumerated from `plans/`. */
export interface PlanSetLaunchable {
  ref: string;
  label: string;
  units: number;
}

/** The `GET /api/launchables` payload. */
export interface Launchables {
  planSets: PlanSetLaunchable[];
  presets: Preset[];
}

/** The fixed preset commands the panel offers. */
export const PRESETS: Preset[] = [
  { ref: "coverage", label: "bun coverage", argv: ["bun", "coverage"] },
  { ref: "lint", label: "bun lint", argv: ["bun", "lint"] },
  { ref: "bench", label: "bun bench --runs=3", argv: ["bun", "bench", "--runs=3"] },
];

/**
 * List immediate subdirectories of a directory, sorted by name.
 *
 * @param dir Directory to read.
 * @returns Subdirectory names (absent or unreadable directory yields none).
 */
function subdirectories(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry): boolean => entry.isDirectory())
      .map((entry): string => entry.name)
      .sort();
  } catch {
    return [];
  }
}

/**
 * Enumerate the plan sets under `plans/` (three levels:
 * `<package>/<category>/<topic>`), reusing the `listPlanUnits` enumeration
 * shape from `scripts/plans/set.ts` read-only.
 *
 * @returns Plan sets with their unit counts, in path order.
 */
export function listPlanSets(): PlanSetLaunchable[] {
  const plansDir = path.join(projectRoot, "plans");
  const launchables: PlanSetLaunchable[] = [];
  for (const pkg of subdirectories(plansDir)) {
    for (const category of subdirectories(path.join(plansDir, pkg))) {
      for (const topic of subdirectories(path.join(plansDir, pkg, category))) {
        const setDir = path.join(plansDir, pkg, category, topic);
        const units = listPlanUnits(setDir);
        if (units.length > 0) {
          const ref = path.relative(projectRoot, setDir);
          launchables.push({ ref, label: path.relative(plansDir, setDir), units: units.length });
        }
      }
    }
  }
  return launchables;
}

/**
 * Build the launchables payload for `GET /api/launchables`.
 *
 * @returns Plan sets from the real `plans/` tree plus every preset.
 */
export function getLaunchables(): Launchables {
  return { planSets: listPlanSets(), presets: PRESETS.map((preset: Preset): Preset => ({ ...preset })) };
}

/**
 * Parse a custom command string into an argv array without a shell.
 *
 * Whitespace splits tokens; single or double quotes group them (no escape
 * sequences — keep custom commands simple, the array-form `Bun.spawn`
 * contract is why there is no `shell: true`).
 *
 * @param command The raw command line typed into the panel.
 * @returns The parsed argv (empty when the command is blank).
 */
export function parseCustomCommand(command: string): string[] {
  const argv: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let tokenStarted = false;
  for (const char of command) {
    if (quote !== null) {
      if (char === quote) {
        quote = null;
        continue;
      }
      current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      tokenStarted = true;
      continue;
    }
    if (char === " " || char === "\t") {
      if (tokenStarted || current.length > 0) {
        argv.push(current);
        current = "";
        tokenStarted = false;
      }
      continue;
    }
    current += char;
  }
  if (tokenStarted || current.length > 0) {
    argv.push(current);
  }
  return argv;
}

/**
 * Resolve a custom command to its spawn argv (the escape hatch).
 *
 * @param command The raw command line typed into the panel.
 * @returns The parsed, non-empty argv.
 */
export function startCustom(command: string): string[] {
  const argv = parseCustomCommand(command);
  if (argv.length === 0) {
    throw new Error("custom command is empty");
  }
  return argv;
}

/**
 * Resolve the argv a start request runs.
 *
 * @param kind Start kind: `"plan-set"`, `"preset"`, or `"custom"`.
 * @param ref The set folder (plan-set), preset ref, or raw command line (custom).
 * @param explicitArgv Client-supplied exact argv (custom kind only).
 * @returns The exact argv to spawn.
 */
export function resolveStartArgv(kind: string, ref: string, explicitArgv: string[] | null): string[] {
  if (kind === "plan-set") {
    return ["bun", "plans", ref];
  }
  if (kind === "preset") {
    const preset = PRESETS.find((entry: Preset): boolean => entry.ref === ref);
    if (preset === undefined) {
      throw new Error(`unknown preset "${ref}" (expected one of: ${PRESETS.map((p: Preset): string => p.ref).join(", ")})`);
    }
    return [...preset.argv];
  }
  if (kind === "custom") {
    return explicitArgv ?? startCustom(ref);
  }
  throw new Error(`unknown start kind "${kind}" (expected plan-set, preset, or custom)`);
}

/**
 * Whether an argv launches a merge run (`bun merge <set>`).
 *
 * @param argv The resolved command.
 * @returns True when the command is a merge run.
 */
export function isMergeCommand(argv: readonly string[]): boolean {
  return argv[0] === "bun" && argv[1] === "merge";
}

/**
 * Whether a live run record is a merge run.
 *
 * @param run A live run record.
 * @returns True when the run's command is a merge.
 */
function isMergeRun(run: { command: string }): boolean {
  return run.command === "bun merge" || run.command.startsWith("bun merge ");
}

/**
 * Guard a start request against runs that must not overlap.
 *
 * Two rules: another run of the same plan set is refused (both would drive
 * the same component worktrees and race tick markers — different sets in
 * parallel are fine, worktree slugs are set-scoped), and any merge start
 * is refused while another merge run is live (merge runs commit to the
 * main tree — concurrent merges contend on the git index).
 *
 * @param kind Start kind: `"plan-set"`, `"preset"`, or `"custom"`.
 * @param ref The set folder (plan-set), preset ref, or raw command line (custom).
 * @param argv The resolved command the request would run.
 * @param liveRuns The currently live run records.
 */
export function assertStartAllowed(
  kind: string,
  ref: string,
  argv: readonly string[],
  liveRuns: readonly { kind: string; ref: string; command: string }[],
): void {
  if (kind === "plan-set" && liveRuns.some((run): boolean => run.kind === "plan-set" && run.ref === ref)) {
    throw new Error(
      `refusing to start ${ref}: another run of the same set is live (both would drive the same component worktrees and race tick markers)`,
    );
  }
  if (isMergeCommand(argv) && liveRuns.some(isMergeRun)) {
    throw new Error(
      "refusing to start a merge while another merge run is live (merge runs commit to the main tree, concurrent merges contend on the git index)",
    );
  }
}
