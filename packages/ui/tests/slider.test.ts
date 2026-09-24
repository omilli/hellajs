import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, delay } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount shares one dom instance with the components.
import { peekState } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  renderVariant,
  sliderVariants,
} from "./helpers/variants";

/** The element's inline styles as collapsed text — object-form (jsx) and string-form (html) flavors serialize differently. */
function inlineStyles(el: HTMLElement): string {
  return (el.getAttribute("style") ?? el.style.cssText).replaceAll(" ", "");
}

beforeEach(() => {
  resetTestState();
});

/** Polls (microtask hops) until the observer-driven mount walk has wired the root's afterMount hooks. */
async function awaitWiring(root: HTMLElement): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (peekState(root)?.isMounted) return;
    await delay();
  }
  expect(peekState(root)?.isMounted).toBe(true);
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Overrides the track's rect measurement — HappyDOM zeroes client rects, so the drag math needs this seam. */
function spyTrackRect(root: HTMLElement, rect: Rect): void {
  const track = root.querySelector<HTMLElement>("[data-slot='slider-track']")!;
  Object.assign(track, { getBoundingClientRect: () => rect });
}

/** Dispatches the pointerdown/move/up sequence on the root at absolute client coordinates. */
function drag(root: HTMLElement, points: { x: number; y?: number }[]): void {
  const first = points[0]!;
  root.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: first.x, clientY: first.y ?? 0, bubbles: true, cancelable: true }));
  for (const point of points) {
    root.dispatchEvent(new PointerEvent("pointermove", { clientX: point.x, clientY: point.y ?? 0, bubbles: true, cancelable: true }));
  }
  root.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
}

function press(thumb: HTMLElement, key: string): void {
  thumb.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

describe("slider", () => {
  test.each(sliderVariants)("$format/$style renders one thumb spanning min to max by default", (variant) => {
    const root = renderVariant(variant, {}) as HTMLElement;
    const thumbs = Array.from(root.querySelectorAll("[data-slot='slider-thumb']")) as HTMLElement[];
    expect(thumbs.length).toBe(2);
    expect(root.getAttribute("data-orientation")).toBe("horizontal");
    const track = root.querySelector("[data-slot='slider-track']") as HTMLElement;
    expect(track.getAttribute("data-orientation")).toBe("horizontal");
    expect(thumbs[0]!.getAttribute("role")).toBe("slider");
    expect(thumbs[0]!.getAttribute("aria-valuemin")).toBe("0");
    expect(thumbs[0]!.getAttribute("aria-valuemax")).toBe("100");
    expect(thumbs[0]!.getAttribute("aria-valuenow")).toBe("0");
    expect(thumbs[1]!.getAttribute("aria-valuenow")).toBe("100");
    expect(thumbs[0]!.getAttribute("tabindex")).toBe("0");
  });

  test.each(sliderVariants)("$format/$style renders multi-thumb positions and aria from the value array", (variant) => {
    const root = renderVariant(variant, { value: [25, 75] }) as HTMLElement;
    const thumbs = Array.from(root.querySelectorAll("[data-slot='slider-thumb']")) as HTMLElement[];
    const range = root.querySelector("[data-slot='slider-range']") as HTMLElement;
    expect(thumbs[0]!.getAttribute("aria-valuenow")).toBe("25");
    expect(thumbs[1]!.getAttribute("aria-valuenow")).toBe("75");
    expect(inlineStyles(thumbs[0]!)).toContain("left:25%");
    expect(inlineStyles(thumbs[1]!)).toContain("left:75%");
    expect(inlineStyles(range)).toContain("left:25%");
    expect(inlineStyles(range)).toContain("width:50%");
  });

  test.each(sliderVariants)("$format/$style maps pointer drags to the nearest thumb through onValueChange", async (variant) => {
    const onValueChange = mock((value: number[]) => value);
    const root = renderVariant(variant, { value: [50], onValueChange }) as HTMLElement;
    await awaitWiring(root);
    spyTrackRect(root, { left: 0, top: 0, width: 100, height: 10 });
    drag(root, [{ x: 20 }, { x: 30 }]);
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange.mock.calls[0]).toEqual([[20]]);
    expect(onValueChange.mock.calls[1]).toEqual([[30]]);
    flush();
    const thumb = root.querySelector("[data-slot='slider-thumb']") as HTMLElement;
    expect(inlineStyles(thumb)).toContain("left:30%");
    expect(thumb.getAttribute("aria-valuenow")).toBe("30");
  });

  test.each(sliderVariants)("$format/$style quantizes pointer values onto the step grid", async (variant) => {
    const onValueChange = mock((value: number[]) => value);
    const root = renderVariant(variant, { value: [0], min: 0, max: 100, step: 5, onValueChange }) as HTMLElement;
    await awaitWiring(root);
    spyTrackRect(root, { left: 0, top: 0, width: 100, height: 10 });
    drag(root, [{ x: 22 }]);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]).toEqual([[20]]);
  });

  test.each(sliderVariants)("$format/$style enforces minStepsBetweenThumbs against the neighbor", async (variant) => {
    const onValueChange = mock((value: number[]) => value);
    const root = renderVariant(variant, { value: [30, 70], minStepsBetweenThumbs: 10, onValueChange }) as HTMLElement;
    await awaitWiring(root);
    spyTrackRect(root, { left: 0, top: 0, width: 100, height: 10 });
    drag(root, [{ x: 32 }, { x: 85 }]);
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange.mock.calls[0]).toEqual([[32, 70]]);
    expect(onValueChange.mock.calls[1]).toEqual([[60, 70]]);
  });

  test.each(sliderVariants)("$format/$style fires onValueCommit on drag end with the committed values", async (variant) => {
    const onValueCommit = mock((value: number[]) => value);
    const root = renderVariant(variant, { value: [50], onValueCommit }) as HTMLElement;
    await awaitWiring(root);
    spyTrackRect(root, { left: 0, top: 0, width: 100, height: 10 });
    drag(root, [{ x: 70 }]);
    expect(onValueCommit).toHaveBeenCalledTimes(1);
    expect(onValueCommit.mock.calls[0]).toEqual([[70]]);
  });

  test.each(sliderVariants)("$format/$style steps by keyboard with Home/End clamps and PageUp/PageDown jumps", (variant) => {
    const onValueChange = mock((value: number[]) => value);
    const root = renderVariant(variant, { value: [50], min: 0, max: 100, step: 10, onValueChange }) as HTMLElement;
    const thumb = root.querySelector("[data-slot='slider-thumb']") as HTMLElement;
    press(thumb, "ArrowRight");
    expect(onValueChange.mock.calls[0]).toEqual([[60]]);
    press(thumb, "ArrowDown");
    expect(onValueChange.mock.calls[1]).toEqual([[50]]);
    press(thumb, "PageUp");
    expect(onValueChange.mock.calls[2]).toEqual([[100]]);
    press(thumb, "Home");
    expect(onValueChange.mock.calls[3]).toEqual([[0]]);
    press(thumb, "End");
    expect(onValueChange.mock.calls[4]).toEqual([[100]]);
    press(thumb, "PageDown");
    expect(onValueChange.mock.calls[5]).toEqual([[0]]);
    press(thumb, "ArrowUp");
    expect(onValueChange.mock.calls[6]).toEqual([[10]]);
    press(thumb, "ArrowLeft");
    expect(onValueChange.mock.calls[7]).toEqual([[0]]);
    press(thumb, "x");
    expect(onValueChange).toHaveBeenCalledTimes(8);
  });

  test.each(sliderVariants)("$format/$style maps vertical drags and keys from the bottom edge", async (variant) => {
    const onValueChange = mock((value: number[]) => value);
    const root = renderVariant(variant, { value: [40], orientation: "vertical", onValueChange }) as HTMLElement;
    await awaitWiring(root);
    expect(root.getAttribute("data-orientation")).toBe("vertical");
    spyTrackRect(root, { left: 0, top: 0, width: 10, height: 100 });
    const thumb = root.querySelector("[data-slot='slider-thumb']") as HTMLElement;
    expect(inlineStyles(thumb)).toContain("bottom:40%");
    drag(root, [{ x: 0, y: 60 }, { x: 0, y: 30 }]);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]).toEqual([[70]]);
    flush();
    expect(inlineStyles(thumb)).toContain("bottom:70%");
    press(thumb, "ArrowUp");
    expect(onValueChange.mock.calls[1]).toEqual([[71]]);
    press(thumb, "ArrowDown");
    expect(onValueChange.mock.calls[2]).toEqual([[70]]);
  });

  test.each(sliderVariants)("$format/$style blocks drags and keys while disabled", async (variant) => {
    const onValueChange = mock((value: number[]) => value);
    const root = renderVariant(variant, { value: [50], disabled: true, onValueChange }) as HTMLElement;
    await awaitWiring(root);
    expect(root.getAttribute("data-disabled")).toBe("true");
    const thumb = root.querySelector("[data-slot='slider-thumb']") as HTMLElement;
    expect(thumb.getAttribute("tabindex")).toBe("-1");
    spyTrackRect(root, { left: 0, top: 0, width: 100, height: 10 });
    drag(root, [{ x: 20 }]);
    press(thumb, "ArrowRight");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test.each(sliderVariants)("$format/$style re-renders positions when a controlled value() signal writes", async (variant) => {
    const values = signal<number[]>([25]);
    const root = renderVariant(variant, { value: () => values() }) as HTMLElement;
    const thumb = root.querySelector("[data-slot='slider-thumb']") as HTMLElement;
    expect(thumb.getAttribute("aria-valuenow")).toBe("25");
    values([80]);
    flush();
    expect(thumb.getAttribute("aria-valuenow")).toBe("80");
    expect(inlineStyles(thumb)).toContain("left:80%");
  });

  test.each(sliderVariants)("$format/$style carries the ring focus classes for the thumb on both flavors", (variant) => {
    const root = renderVariant(variant, { value: [50] }) as HTMLElement;
    const thumb = root.querySelector("[data-slot='slider-thumb']") as HTMLElement;
    if (variant.style === "tailwind") {
      expect(classTokens(thumb)).toContain("focus-visible:ring-4");
      expect(classTokens(root)).toContain("touch-none");
    } else {
      expect(classTokens(root).some((token) => token.startsWith("h-hella-slider"))).toBe(true);
      expect(classTokens(thumb).some((token) => token.startsWith("h-hella-slider-thumb"))).toBe(true);
    }
  });

  test.each(sliderVariants)("$format/$style disposes the drag wiring when the root unmounts", async (variant) => {
    const onValueChange = mock((value: number[]) => value);
    const root = renderVariant(variant, { value: [50], onValueChange }) as HTMLElement;
    await awaitWiring(root);
    // Removing the root from its observed mount container runs the destroy hooks.
    root.remove();
    for (let i = 0; i < 50; i++) {
      if (!peekState(root)) break;
      await delay();
    }
    expect(peekState(root)).toBeUndefined();
    spyTrackRect(root, { left: 0, top: 0, width: 100, height: 10 });
    drag(root, [{ x: 20 }]);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(sliderVariants, { value: [25, 75] });
    assertStructuralParity(sliderVariants, { value: [50], orientation: "vertical", disabled: true });
  });
});
