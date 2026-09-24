import { describe, test, expect } from "bun:test";
import { computeAnchorPosition } from "@hellajs/dom/bundle";
import type { Placement } from "@hellajs/dom";

const viewport = { width: 400, height: 300 };

describe("computeAnchorPosition", () => {
  test("places the floating adjacent to the anchor on all four base sides", () => {
    const anchor = { top: 100, left: 100, width: 50, height: 20 };
    const floating = { width: 60, height: 40 };

    expect(computeAnchorPosition(anchor, floating, viewport, { placement: "bottom" })).toEqual({
      x: 95, y: 120, placement: "bottom", width: 60
    });
    expect(computeAnchorPosition(anchor, floating, viewport, { placement: "top" })).toEqual({
      x: 95, y: 60, placement: "top", width: 60
    });
    expect(computeAnchorPosition(anchor, floating, viewport, { placement: "left" })).toEqual({
      x: 40, y: 90, placement: "left", width: 60
    });
    expect(computeAnchorPosition(anchor, floating, viewport, { placement: "right" })).toEqual({
      x: 150, y: 90, placement: "right", width: 60
    });
  });

  test.each([
    ["bottom-start", 100],
    ["bottom-end", 90],
    ["top-start", 100],
    ["top-end", 90]
  ] as [Placement, number][])("aligns %s to the start/end edge in ltr", (placement, x) => {
    const result = computeAnchorPosition(
      { top: 100, left: 100, width: 50, height: 20 },
      { width: 60, height: 40 },
      viewport,
      { placement }
    );
    expect(result.x).toBe(x);
    expect(result.placement).toBe(placement);
  });

  test("resolves rtl direction on the horizontal axis only", () => {
    const anchor = { top: 100, left: 100, width: 50, height: 20 };
    const floating = { width: 60, height: 40 };
    expect(computeAnchorPosition(anchor, floating, viewport, { placement: "bottom-start", dir: "rtl" }).x).toBe(90);
    expect(computeAnchorPosition(anchor, floating, viewport, { placement: "bottom-end", dir: "rtl" }).x).toBe(100);
    const rightStart = computeAnchorPosition(anchor, floating, viewport, { placement: "right-start", dir: "rtl" });
    const rightEnd = computeAnchorPosition(anchor, floating, viewport, { placement: "right-end", dir: "rtl" });
    expect(rightStart.x).toBe(150);
    expect(rightStart.y).toBe(100);
    expect(rightEnd.x).toBe(150);
    expect(rightEnd.y).toBe(80);
  });

  test.each([
    ["left-start", 100],
    ["left-end", 80]
  ])("keeps %s vertical alignment direction-free", (placement, y) => {
    const ltr = computeAnchorPosition(
      { top: 100, left: 100, width: 50, height: 20 },
      { width: 60, height: 40 },
      viewport,
      { placement: placement as never }
    );
    const rtl = computeAnchorPosition(
      { top: 100, left: 100, width: 50, height: 20 },
      { width: 60, height: 40 },
      viewport,
      { placement: placement as never, dir: "rtl" }
    );
    expect(ltr.y).toBe(y);
    expect(rtl.y).toBe(y);
  });

  test("flips to the opposite vertical side on viewport collision", () => {
    const result = computeAnchorPosition(
      { top: 10, left: 100, width: 50, height: 20 },
      { width: 60, height: 40 },
      { width: 300, height: 200 },
      { placement: "top" }
    );
    expect(result.placement).toBe("bottom");
    expect(result.y).toBe(30);
  });

  test("flips horizontal sides without crossing the vertical axis", () => {
    const result = computeAnchorPosition(
      { top: 10, left: 280, width: 50, height: 20 },
      { width: 60, height: 40 },
      { width: 300, height: 200 },
      { placement: "right" }
    );
    expect(result.placement).toBe("left");
    expect(result.x).toBe(220);
    expect(result.y).toBe(0);
  });

  test("shifts the floating to clamp inside the viewport", () => {
    const result = computeAnchorPosition(
      { top: 0, left: 380, width: 20, height: 10 },
      { width: 40, height: 20 },
      viewport,
      { placement: "bottom-start" }
    );
    expect(result.x).toBe(360);
    expect(result.y).toBe(10);
  });

  test("matches the anchor width when matchAnchorWidth is set", () => {
    const result = computeAnchorPosition(
      { top: 100, left: 100, width: 50, height: 20 },
      { width: 60, height: 40 },
      viewport,
      { matchAnchorWidth: true }
    );
    expect(result.width).toBe(50);
    expect(computeAnchorPosition(
      { top: 100, left: 100, width: 50, height: 20 },
      { width: 60, height: 40 },
      viewport
    ).width).toBe(60);
  });

  test("applies the offset along the placement axis", () => {
    const result = computeAnchorPosition(
      { top: 100, left: 100, width: 50, height: 20 },
      { width: 60, height: 40 },
      viewport,
      { placement: "bottom", offset: 8 }
    );
    expect(result.y).toBe(128);
  });

  test("requires anchor, floating, and viewport", () => {
    const rect = { top: 0, left: 0, width: 10, height: 10 };
    expect(() => computeAnchorPosition(null as never, rect, rect)).toThrow("[dom] computeAnchorPosition: anchor is required");
    expect(() => computeAnchorPosition(rect, null as never, rect)).toThrow("[dom] computeAnchorPosition: floating is required");
    expect(() => computeAnchorPosition(rect, rect, null as never)).toThrow("[dom] computeAnchorPosition: viewport is required");
  });
});
