import type { AnchorPositionOptions, Placement } from "./types/behaviors";

type AnchorSide = "top" | "bottom" | "left" | "right";

/**
 * Computes fixed-position coordinates for `floating` relative to `anchor` —
 * pure math over plain rects, no DOM access (HappyDOM rects are all zeros, so
 * this is the testable seam `anchorPosition` delegates to).
 *
 * The primary placement flips to the opposite side (vertical↔horizontal stays)
 * when the floating does not fit inside `viewport`, then both axes shift to
 * clamp inside the viewport. `-start/-end` resolves through `options.dir` on
 * the horizontal axis (vertical placements); `left`/`right` placements align
 * vertically and ignore direction.
 *
 * ```ts
 * const { x, y, placement } = computeAnchorPosition(anchorRect, size, viewport, { placement: "bottom-start" });
 * ```
 * @param anchor Anchor rect (`getBoundingClientRect()` shape).
 * @param floating Floating size (`offsetWidth`/`offsetHeight` shape).
 * @param viewport Viewport size the placement must fit.
 * @param options Requested placement, offset, width matching, direction.
 * @returns Fixed coordinates, the final (post-flip) placement, and the resolved width.
 * @throws {Error} When anchor, floating, or viewport is null or undefined.
 */
export function computeAnchorPosition(
  anchor: { top: number; left: number; width: number; height: number },
  floating: { width: number; height: number },
  viewport: { width: number; height: number },
  options?: AnchorPositionOptions
): { x: number; y: number; placement: Placement; width: number } {
  if (anchor == null) {
    throw new Error("[dom] computeAnchorPosition: anchor is required");
  }
  if (floating == null) {
    throw new Error("[dom] computeAnchorPosition: floating is required");
  }
  if (viewport == null) {
    throw new Error("[dom] computeAnchorPosition: viewport is required");
  }
  const offset = options?.offset ?? 0;
  const rtl = (options?.dir ?? "ltr") === "rtl";
  const requested = options?.placement ?? "bottom";
  const dash = requested.indexOf("-");
  const align = dash === -1 ? "center" : requested.slice(dash + 1) === "start" ? "start" : "end";
  const aBottom = anchor.top + anchor.height;
  const aRight = anchor.left + anchor.width;
  let side = (dash === -1 ? requested : requested.slice(0, dash)) as AnchorSide;
  if (side !== "top" && side !== "bottom" && side !== "left" && side !== "right") {
    side = "bottom";
  }
  const alignX = (): number => {
    if (align !== "center") return (align === "start") !== rtl ? anchor.left : aRight - floating.width;
    return anchor.left + (anchor.width - floating.width) / 2;
  };
  const alignY = (): number => {
    if (align !== "center") return align === "start" ? anchor.top : aBottom - floating.height;
    return anchor.top + (anchor.height - floating.height) / 2;
  };
  const fits = (s: AnchorSide): boolean => {
    if (s === "top") return anchor.top - offset >= floating.height;
    if (s === "bottom") return viewport.height - aBottom - offset >= floating.height;
    if (s === "left") return anchor.left - offset >= floating.width;
    return viewport.width - aRight - offset >= floating.width;
  };
  if (!fits(side)) {
    side = side === "top" ? "bottom" : side === "bottom" ? "top" : side === "left" ? "right" : "left";
  }
  let x: number;
  let y: number;
  if (side === "top") {
    x = alignX();
    y = anchor.top - floating.height - offset;
  } else if (side === "bottom") {
    x = alignX();
    y = aBottom + offset;
  } else if (side === "left") {
    x = anchor.left - floating.width - offset;
    y = alignY();
  } else {
    x = aRight + offset;
    y = alignY();
  }
  const maxX = viewport.width - floating.width;
  const maxY = viewport.height - floating.height;
  x = Math.min(Math.max(x, 0), Math.max(maxX, 0));
  y = Math.min(Math.max(y, 0), Math.max(maxY, 0));
  return {
    x,
    y,
    placement: (dash === -1 ? side : `${side}-${align}`) as Placement,
    width: options?.matchAnchorWidth === true ? anchor.width : floating.width
  };
}
