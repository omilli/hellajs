import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { execCommand, logger, projectRoot } from "../utils/index.js";
import { isTicked } from "../worker/set.js";

/**
 * The bundled worktree protocol script. Orchestrators invoke it read-only
 * (`list`/`status`); `clean` runs on explicit abandon (plans) or after a
 * component merged (merge).
 */
export const WORKTREE_SCRIPT = join(".agents", "skills", "worker", "scripts", "worktree.mjs");

/** Protocol worktrees live in a sibling dir (worktree.mjs owns the layout). */
export const WT_ROOT = resolve(projectRoot, "..", "hellajs-wt");

/**
 * Run the bundled worktree script and print its output (orchestrator status).
 *
 * @param args Script arguments (read-only `list`/`status`, or `clean`).
 * @returns Captured stdout, or null when the script itself failed (reported).
 */
export async function worktreeScript(args: string[]): Promise<string | null> {
  try {
    const result = await execCommand("bun", [WORKTREE_SCRIPT, ...args]);
    return result.stdout;
  } catch (error) {
    logger.warn(`worktree.mjs ${args.join(" ")} failed: ${(error as Error).message.split("\n")[0]}`);
    return null;
  }
}

/** One worktree inventory line, as printed by `worktree.mjs list`. */
export interface WorktreeEntry {
  slug: string;
  plans: string;
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
 * Read a unit's top marker from a worktree's copy of the plan set.
 *
 * The delivered-state probe for both runners: a unit ticked in a standing
 * worktree's copy has been executed (worker) and awaits merge — the main-tree
 * marker stays `[ ]` until then and must never re-queue it.
 *
 * @param slug Worktree slug (a directory under WT_ROOT).
 * @param relSetDir Repo-relative plan-set folder the worktree carries.
 * @param unitName Unit filename inside the set folder.
 * @returns True only when the copy exists and its top marker reads `[x]`.
 */
export function carrierTicked(slug: string, relSetDir: string, unitName: string): boolean {
  const unitPath = join(WT_ROOT, slug, relSetDir, unitName);
  return existsSync(unitPath) && isTicked(unitPath);
}
