import { computeAnchorPosition } from "./computeAnchorPosition";
import type { AnchorPositionOptions } from "./types/behaviors";

/**
 * Positions `floating` as a fixed overlay anchored to `anchor` and keeps it
 * placed while the page scrolls or resizes. Measures the anchor rect live per
 * reposition (`getBoundingClientRect()`); the floating size comes from
 * `offsetWidth`/`offsetHeight` so CSS transforms never skew the math. All
 * placement math delegates to the pure `computeAnchorPosition`.
 *
 * ```ts
 * const dispose = anchorPosition(trigger, menu, { placement: "bottom-start", matchAnchorWidth: true });
 * ```
 * @param anchor Element the floating anchors to.
 * @param floating Element positioned against the anchor.
 * @param options Placement, offset, width matching, direction, update hook. `dir` defaults to the anchor's computed `direction`.
 * @returns Dispose handle — removes the window scroll/resize listeners.
 * @throws {Error} When anchor or floating is null or undefined.
 */
export function anchorPosition(anchor: Element, floating: HTMLElement, options?: AnchorPositionOptions): () => void {
  if (anchor == null) {
    throw new Error("[dom] anchorPosition: anchor is required");
  }
  if (floating == null) {
    throw new Error("[dom] anchorPosition: floating is required");
  }
  const dir = options?.dir ?? (getComputedStyle(anchor).direction === "rtl" ? "rtl" : "ltr");
  const reposition = (): void => {
    const result = computeAnchorPosition(
      anchor.getBoundingClientRect(),
      { width: floating.offsetWidth, height: floating.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
      { ...options, dir }
    );
    floating.style.position = "fixed";
    floating.style.left = `${result.x}px`;
    floating.style.top = `${result.y}px`;
    if (options?.matchAnchorWidth === true) floating.style.width = `${result.width}px`;
    options?.onUpdate?.(result.placement);
  };
  reposition();
  window.addEventListener("scroll", reposition, true);
  window.addEventListener("resize", reposition);
  return () => {
    window.removeEventListener("scroll", reposition, true);
    window.removeEventListener("resize", reposition);
  };
}
