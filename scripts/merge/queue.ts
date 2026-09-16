import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { projectRoot } from "../utils/index.js";
import { carrierTicked, parseWorktreeList, WT_ROOT, type WorktreeEntry } from "../agent/worktree.js";
import { isTicked, listPlanUnits, partitionComponents, setSlug, countTicks, type PlanUnit } from "../worker/set.js";

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
 * Match a protocol worktree slug back to its plan component.
 *
 * Resolution order: the whole-set slug (single mode) matches everything; a
 * carrier holding delivered-but-unmerged ticks (worktree copy `[x]`, main
 * tree `[x]` absent — merged units ride along in the carried folder and say
 * nothing about the carrier) resolves to the unique component containing
 * them, which is the worker's venue-adoption rule mirrored; a carrier with
 * no delivered ticks falls back to the runner's derived-slug arithmetic
 * (`<setSlug>-<component-first-unit-stem>`); ticks spanning multiple
 * components are an ambiguous carrier. Null when nothing matches.
 *
 * @param entry A parsed inventory entry (slug + carried plans folder).
 * @param setSlugValue The set's slug.
 * @param relSetDir Repo-relative set-folder path the carrier carries.
 * @param units Every unit of the set, in filename order.
 * @param components The set's dependency-connected components (all units).
 * @returns The carrier's component, or null when the slug matches nothing.
 */
function matchComponent(
  entry: WorktreeEntry,
  setSlugValue: string,
  relSetDir: string,
  units: PlanUnit[],
  components: PlanUnit[][],
): PlanUnit[] | null {
  if (entry.slug === setSlugValue) {
    return units;
  }
  const componentOf = new Map<string, PlanUnit[]>();
  for (const component of components) {
    for (const unit of component) {
      componentOf.set(unit.name, component);
    }
  }
  const hosts = new Set<PlanUnit[]>();
  for (const unit of units) {
    if (isTicked(unit.path) || !carrierTicked(entry.slug, relSetDir, unit.name)) {
      continue;
    }
    const component = componentOf.get(unit.name);
    if (component !== undefined) {
      hosts.add(component);
    }
  }
  if (hosts.size === 1) {
    return [...hosts][0] ?? null;
  }
  if (hosts.size > 1) {
    return null;
  }
  for (const component of components) {
    const stem = (component[0]?.name ?? "").replace(/\.md$/, "");
    if (entry.slug === `${setSlugValue}-${stem}`) {
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
  // Mirror of the worker's venue derivation (scripts/worker/run.ts):
  // components partition ALL units, and a standing slug resolves by the
  // carrier's own delivered ticks first, derived-slug arithmetic second.
  const components = partitionComponents(units);
  const order = new Map(units.map((unit: PlanUnit, index: number): [string, number] => [unit.name, index]));
  const result: QueueResult = { queue: [], preMerged: [], anomalies: [] };
  for (const entry of parseWorktreeList(inventory)) {
    if (entry.plans !== relSetDir) {
      continue;
    }
    const component = matchComponent(entry, setSlug(setDir), relSetDir, units, components);
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
