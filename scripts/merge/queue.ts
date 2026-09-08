import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { projectRoot } from "../utils/index.js";
import { WT_ROOT } from "../agent/worktree.js";
import { isTicked, listPlanUnits, partitionComponents, setSlug, countTicks, type PlanUnit } from "../plans/set.js";

/** One worktree inventory line, as printed by `worktree.mjs list`. */
export interface WorktreeEntry {
  slug: string;
  plans: string;
}

/** One merge queue entry: a component worktree plus its plan units. */
export interface QueueEntry {
  slug: string;
  units: PlanUnit[];
}

/** Queue derivation result: to merge, already merged, and unmatched slugs. */
export interface QueueResult {
  queue: QueueEntry[];
  preMerged: QueueEntry[];
  anomalies: string[];
}

/**
 * Parse `worktree.mjs list` output into slug + carried-plan entries.
 *
 * Lines look like `<slug>  branch=<b>  baseline=<h>  plans=<rel>`; the
 * `(no protocol worktrees)` placeholder matches no line.
 *
 * @param output Captured stdout of `worktree.mjs list`.
 * @returns Parsed entries, in listing order.
 */
export function parseWorktreeList(output: string): WorktreeEntry[] {
  const entries: WorktreeEntry[] = [];
  for (const line of output.split("\n")) {
    const match = line.match(/^(\S+)\s+branch=\S+\s+baseline=\S+\s+plans=(\S+)$/);
    if (match !== null) {
      entries.push({ slug: match[1] ?? "", plans: match[2] ?? "" });
    }
  }
  return entries;
}

/**
 * Match a protocol slug back to its plan component.
 *
 * The plans runner names venues deterministically: the whole set in one
 * worktree is `<setSlug>`, one worktree per dependency-connected component is
 * `<setSlug>-<first-unit-stem>`. Anything else is an anomaly.
 *
 * @param slug A protocol worktree slug.
 * @param setSlugValue The set's slug.
 * @param units Every unit of the set, in filename order.
 * @param components The set's dependency-connected components.
 * @returns The component's units, or null when the slug matches nothing.
 */
function matchComponent(
  slug: string,
  setSlugValue: string,
  units: PlanUnit[],
  components: PlanUnit[][],
): PlanUnit[] | null {
  if (slug === setSlugValue) {
    return units;
  }
  for (const component of components) {
    const stem = (component[0]?.name ?? "").replace(/\.md$/, "");
    if (slug === `${setSlugValue}-${stem}`) {
      return component;
    }
  }
  return null;
}

/**
 * Derive the merge queue for one plan set from the worktree inventory.
 *
 * Main-tree top markers are the merged-state record: a component whose units
 * all read `[x]` there is already merged and is skipped, never re-applied.
 * Queue order is ascending first unit — the set's own sequencing intent, and
 * the ordering file-overlapping components expect.
 *
 * @param setDir Absolute path to the plan-set folder.
 * @param inventory Captured stdout of `worktree.mjs list`.
 * @returns Queue (ascending first unit), pre-merged entries, unmatched slugs.
 */
export function deriveQueue(setDir: string, inventory: string): QueueResult {
  const relSetDir = relative(projectRoot, setDir);
  const units = listPlanUnits(setDir);
  const components = partitionComponents(units);
  const order = new Map(units.map((unit: PlanUnit, index: number): [string, number] => [unit.name, index]));
  const result: QueueResult = { queue: [], preMerged: [], anomalies: [] };
  for (const entry of parseWorktreeList(inventory)) {
    if (entry.plans !== relSetDir) {
      continue;
    }
    const component = matchComponent(entry.slug, setSlug(setDir), units, components);
    if (component === null) {
      result.anomalies.push(entry.slug);
      continue;
    }
    const queued: QueueEntry = { slug: entry.slug, units: component };
    if (component.every((unit: PlanUnit): boolean => isTicked(unit.path))) {
      result.preMerged.push(queued);
    } else {
      result.queue.push(queued);
    }
  }
  result.queue.sort(
    (a: QueueEntry, b: QueueEntry): number =>
      (order.get(a.units[0]?.name ?? "") ?? 0) - (order.get(b.units[0]?.name ?? "") ?? 0),
  );
  return result;
}

/**
 * Completeness pre-check: every component unit reads `[x]` in the WORKTREE
 * copy of the set (the worker ticks there; the main tree only sees ticks at
 * merge). An incomplete component is refused and left standing for rework.
 *
 * @param relSetDir Repo-relative set-folder path.
 * @param entry The queue entry to check.
 * @returns True when the worktree copy of every unit is complete.
 */
export function isCompleteInWorktree(relSetDir: string, entry: QueueEntry): boolean {
  return entry.units.every((unit: PlanUnit): boolean => {
    const unitPath = join(WT_ROOT, entry.slug, relSetDir, unit.name);
    return existsSync(unitPath) && isTicked(unitPath);
  });
}

/**
 * Whether every unit of a component reads `[x]` in the MAIN tree — the
 * per-component success signal alongside the cleaned worktree.
 *
 * @param entry The queue entry to check.
 * @returns True when all main-tree copies are ticked.
 */
export function allTickedInMainTree(entry: QueueEntry): boolean {
  return entry.units.every((unit: PlanUnit): boolean => isTicked(unit.path));
}

/**
 * Total tick count across a component's MAIN-tree unit copies — the progress
 * signal between merge attempts (plan-copy updates land before cleanup).
 *
 * @param entry The queue entry to measure.
 * @returns Summed `[x]` occurrences.
 */
export function mainTreeTickTotal(entry: QueueEntry): number {
  return entry.units.reduce((total: number, unit: PlanUnit): number => total + countTicks(unit.path), 0);
}
