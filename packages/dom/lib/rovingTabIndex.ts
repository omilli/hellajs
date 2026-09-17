import { getFocusables } from "./internal/focusables";
import type { RovingTabIndexOptions } from "./types/behaviors";

/**
 * Implements roving tabindex over `container`'s items: arrow keys move focus along
 * `orientation`, Home/End jump to the ends, and `tabindex` roves (0 on the focused
 * item, -1 on the rest) until the dispose handle is called.
 *
 * ```ts
 * const dispose = rovingTabIndex(tablist); // … later:
 * dispose();
 * ```
 * @param container Element whose items form the roving group.
 * @param options `selector` override, `orientation` axis filter, `loop` wrap control.
 * @returns Dispose handle — removes the keydown wiring and restores each item's original `tabindex`.
 * @throws {Error} When container is null or undefined.
 */
export function rovingTabIndex(container: ParentNode, options?: RovingTabIndexOptions): () => void {
  if (container == null) {
    throw new Error("[dom] rovingTabIndex: container is required");
  }
  const isHorizontal = options?.orientation !== "vertical";
  const isVertical = options?.orientation !== "horizontal";
  const isLoop = options?.loop !== false;
  const selector = options?.selector;
  const initial = getFocusables(container, selector);
  const snapshots: Array<{ el: HTMLElement; tabindex: string | null }> = [];
  let i = 0;
  const len = initial.length;
  while (i < len) {
    const el = initial[i]!;
    snapshots.push({ el, tabindex: el.getAttribute("tabindex") });
    el.tabIndex = i === 0 ? 0 : -1;
    i++;
  }
  const onKeyDown = (event: Event): void => {
    const group = getFocusables(container, selector);
    const current = group.indexOf(document.activeElement as HTMLElement);
    if (current === -1) return;
    const key = (event as KeyboardEvent).key;
    let delta = 0;
    if (isHorizontal) {
      if (key === "ArrowRight") delta = 1;
      else if (key === "ArrowLeft") delta = -1;
    }
    if (delta === 0 && isVertical) {
      if (key === "ArrowDown") delta = 1;
      else if (key === "ArrowUp") delta = -1;
    }
    if (delta === 0) {
      if (key === "Home") delta = -current;
      else if (key === "End") delta = group.length - 1 - current;
      else return;
    }
    let target = current + delta;
    if (target < 0 || target >= group.length) {
      if (isLoop) {
        target = (target + group.length) % group.length;
      } else {
        target = target < 0 ? 0 : group.length - 1;
      }
    }
    const item = group[target]!;
    event.preventDefault();
    item.focus();
    let w = 0;
    while (w < group.length) {
      group[w]!.tabIndex = w === target ? 0 : -1;
      w++;
    }
  };
  container.addEventListener("keydown", onKeyDown);
  return () => {
    container.removeEventListener("keydown", onKeyDown);
    let r = 0;
    const snapLen = snapshots.length;
    while (r < snapLen) {
      const snap = snapshots[r]!;
      if (snap.tabindex == null) {
        snap.el.removeAttribute("tabindex");
      } else {
        snap.el.setAttribute("tabindex", snap.tabindex);
      }
      r++;
    }
  };
}
