import { readdirSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { projectRoot } from "../utils/index.js";

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

/**
 * Parse a unit's frontmatter `depends_on` list (sibling stems or filenames).
 *
 * @param unitPath Absolute path to a unit file.
 * @returns Dependency names, normalized to stems (no `.md`).
 */
export function readDependsOn(unitPath: string): string[] {
  const text = readFileSync(unitPath, "utf8");
  const match = text.match(/^depends_on:\s*\[([^\]]*)\]\s*$/m);
  if (match === null) {
    return [];
  }
  return (match[1] ?? "")
    .split(",")
    .map((entry: string): string => entry.trim().replace(/\.md$/, "").replace(/^['"]|['"]$/g, ""))
    .filter((entry: string): boolean => entry !== "");
}

/**
 * Derive the set slug from the set folder path (stable, filesystem-safe).
 *
 * Shared by both runners: the plans runner names its venue worktrees with it,
 * the merge runner matches protocol worktree slugs back to components with it.
 *
 * @param setDir Absolute path to the plan-set folder.
 * @returns Kebab-case slug unique to the set.
 */
export function setSlug(setDir: string): string {
  return relative(projectRoot, setDir)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolve and validate a set-folder argument: it must be an existing directory
 * with at least one `NN-*.md` unit file.
 *
 * @param folder The folder argument from the CLI.
 * @returns The absolute set-folder path.
 */
export function resolveSetFolder(folder: string): string {
  const setDir = isAbsolute(folder) ? folder : resolve(folder);
  let isDirectory = false;
  try {
    isDirectory = statSync(setDir).isDirectory();
  } catch {
    // missing or unreadable folder — stays false
  }
  if (!isDirectory) {
    throw new Error(`set folder not found: ${setDir}`);
  }
  if (listPlanUnits(setDir).length === 0) {
    throw new Error(`no plan units (NN-*.md) in ${setDir}`);
  }
  return setDir;
}

/**
 * Partition units into dependency-connected components.
 *
 * A component is the transitive closure over `depends_on` edges: units that
 * (transitively) depend on each other share one worktree; independent groups
 * are separate components. Components and their internal unit order stay in
 * filename order (the numbering convention encodes execution order).
 *
 * @param units Unit files in filename order.
 * @returns Components in ascending-first-unit order.
 */
export function partitionComponents(units: PlanUnit[]): PlanUnit[][] {
  const stems = new Map<string, number>();
  units.forEach((unit: PlanUnit, index: number): void => {
    stems.set(unit.name.replace(/\.md$/, ""), index);
  });
  const parent = units.map((_: PlanUnit, index: number): number => index);
  const find = (index: number): number => {
    const parentAt = parent[index] ?? index;
    if (parentAt !== index) {
      parent[index] = find(parentAt);
    }
    return parent[index] ?? index;
  };
  const union = (a: number, b: number): void => {
    parent[find(a)] = find(b);
  };
  units.forEach((unit: PlanUnit, index: number): void => {
    for (const dep of readDependsOn(unit.path)) {
      const target = stems.get(dep);
      if (target !== undefined) {
        union(index, target);
      }
    }
  });
  const groups = new Map<number, PlanUnit[]>();
  units.forEach((unit: PlanUnit, index: number): void => {
    const root = find(index);
    const group = groups.get(root) ?? [];
    group.push(unit);
    groups.set(root, group);
  });
  return [...groups.values()];
}
