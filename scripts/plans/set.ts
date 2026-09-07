import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** One plan-set unit file: its filename and absolute path. */
export interface PlanUnit {
  name: string;
  path: string;
}

/**
 * List a plan set's unit files in filename order.
 *
 * Only `NN-*.md` files are units; `index.md` and other non-numbered files are
 * set context, not executable units. The orchestrator reads the set but never
 * writes plan files — the worker skill owns every tick.
 *
 * @param setDir Absolute path to the plan-set folder.
 * @returns Unit files sorted by filename.
 */
export function listPlanUnits(setDir: string): PlanUnit[] {
  return readdirSync(setDir)
    .filter((name: string): boolean => /^\d+-.*\.md$/.test(name))
    .sort()
    .map((name: string): PlanUnit => ({ name, path: join(setDir, name) }));
}

/**
 * Read a unit's top marker (the first heading line, `# [ ]` vs `# [x]`).
 *
 * The worker skill flips the marker to `[x]` when a unit completes; that flip
 * is the orchestrator's completion signal. Real plan units carry YAML
 * frontmatter (`depends_on`) before the heading, so the top marker is the
 * first line starting a checkbox heading — not necessarily line 1.
 *
 * @param unitPath Absolute path to a unit file.
 * @returns True when the top marker reads `[x]`.
 */
export function isTicked(unitPath: string): boolean {
  const lines = readFileSync(unitPath, "utf8").split("\n");
  const marker = lines.find((line: string): boolean => /^#\s*\[[ x]\]/.test(line));
  return marker !== undefined && marker.includes("[x]");
}

/**
 * Count a unit's ticked boxes (`[x]` occurrences, task headers and DoD alike).
 *
 * The orchestrator's progress signal: an attempt that increases this count
 * advanced the unit even when the top marker stays unflipped.
 *
 * @param unitPath Absolute path to a unit file.
 * @returns Number of `[x]` occurrences.
 */
export function countTicks(unitPath: string): number {
  return (readFileSync(unitPath, "utf8").match(/\[x\]/g) ?? []).length;
}
