import { join, resolve } from "node:path";
import { execCommand, logger, projectRoot } from "../utils/index.js";

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
