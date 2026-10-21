import type { ReactiveNode } from "./system";
import { unlink } from "./system";

/**
 * @internal Unlinks every dependency after `depsTail` — the links the last
 * execution did not re-access. The new-engine replacement for endTracking: the
 * execute paths reset `depsTail` before running, so everything past it is stale.
 * @param sub The subscriber whose stale dependency links should be purged.
 * @returns Nothing; the graph is pruned in place.
 */
export function purgeDeps(sub: ReactiveNode): void {
  const depsTail = sub.depsTail;
  let link = depsTail !== undefined ? depsTail.nextDep : sub.deps;
  while (link !== undefined) {
    link = unlink(link, sub);
  }
}
