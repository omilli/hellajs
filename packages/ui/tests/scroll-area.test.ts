import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount shares one dom instance with the components.
import { peekState } from "@hellajs/dom";
import {
  assertStructuralParity,
  awaitWiring,
  classTokens,
  inlineStyles,
  renderVariant,
  scrollAreaVariants,
  scrollBarVariants,
} from "./helpers/variants";
import type { ScrollerObserve } from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

interface Geometry {
  scrollHeight?: number;
  scrollWidth?: number;
  clientHeight?: number;
  clientWidth?: number;
  scrollTop?: number;
  scrollLeft?: number;
}

/** Overrides the viewport's scroll geometry; HappyDOM computes none of it from layout. */
function withGeometry(el: HTMLElement, geometry: Geometry): void {
  for (const [key, value] of Object.entries(geometry)) {
    if (key === "scrollTop" || key === "scrollLeft") {
      Object.defineProperty(el, key, { value, writable: true, configurable: true });
    } else {
      Object.defineProperty(el, key, { get: () => value, configurable: true });
    }
  }
}

/** Overrides the bar's box measurement along its axis; HappyDOM zeroes client boxes. */
function withTrack(el: HTMLElement, clientHeight: number, clientWidth: number): void {
  Object.defineProperty(el, "clientHeight", { get: () => clientHeight, configurable: true });
  Object.defineProperty(el, "clientWidth", { get: () => clientWidth, configurable: true });
}

/** Dispatches the pointerdown/move/up sequence on the thumb at cumulative pixel deltas. */
function dragThumb(thumb: HTMLElement, deltas: { dx?: number; dy?: number }[]): void {
  thumb.dispatchEvent(new PointerEvent("pointerdown", { button: 0, clientX: 0, clientY: 0, bubbles: true, cancelable: true }));
  let x = 0;
  let y = 0;
  for (const delta of deltas) {
    x += delta.dx ?? 0;
    y += delta.dy ?? 0;
    thumb.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, bubbles: true, cancelable: true }));
  }
  thumb.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
}

/** The ScrollBar variant compiled from the same style × format module as the given ScrollArea variant. */
function pairedBar(variant: { style: string; format: string }) {
  return scrollBarVariants.find((bar) => bar.style === variant.style && bar.format === variant.format)!;
}

describe("scroll-area", () => {
  test.each(scrollAreaVariants)("$format/$style renders the viewport, children, default vertical bar, and corner", (variant) => {
    const root = renderVariant(variant, { children: ["Content"] }) as HTMLElement;
    expect(root.getAttribute("data-slot")).toBe("scroll-area");
    const view = root.querySelector("[data-slot='scroll-area-viewport']") as HTMLElement;
    expect(view).not.toBeNull();
    const content = view.querySelector("[data-slot='scroll-area-content']") as HTMLElement;
    expect(content.textContent).toBe("Content");
    const bar = root.querySelector("[data-slot='scroll-area-scrollbar']") as HTMLElement;
    expect(bar.getAttribute("data-orientation")).toBe("vertical");
    expect(bar.querySelector("[data-slot='scroll-area-thumb']")).not.toBeNull();
    expect(root.querySelector("[data-slot='scroll-area-corner']")).not.toBeNull();
    const viewTokens = classTokens(view);
    if (variant.style === "css") {
      expect(viewTokens.some((token) => token.startsWith("h-hella-scroll-area-viewport"))).toBe(true);
    } else {
      expect(viewTokens).toContain("overflow-scroll");
      expect(viewTokens).toContain("[scrollbar-width:none]");
      expect(viewTokens).toContain("[&::-webkit-scrollbar]:hidden");
    }
  });

  test.each(scrollAreaVariants)("$format/$style sizes the thumb to the content-to-viewport ratio", async (variant) => {
    const root = renderVariant(variant, { children: ["Content"] }) as HTMLElement;
    const bar = root.querySelector("[data-slot='scroll-area-scrollbar']") as HTMLElement;
    await awaitWiring(bar);
    const view = root.querySelector("[data-slot='scroll-area-viewport']") as HTMLElement;
    const thumb = bar.querySelector("[data-slot='scroll-area-thumb']") as HTMLElement;
    withGeometry(view, { scrollHeight: 400, clientHeight: 200, scrollTop: 0 });
    withTrack(bar, 100, 10);
    view.dispatchEvent(new Event("scroll"));
    flush();
    expect(inlineStyles(thumb)).toContain("height:50px");
    expect(inlineStyles(thumb)).toContain("transform:translateY(0px)");
  });

  test.each(scrollAreaVariants)("$format/$style clamps the thumb to the 20px minimum on very long content", async (variant) => {
    const root = renderVariant(variant, { children: ["Content"] }) as HTMLElement;
    const bar = root.querySelector("[data-slot='scroll-area-scrollbar']") as HTMLElement;
    await awaitWiring(bar);
    const view = root.querySelector("[data-slot='scroll-area-viewport']") as HTMLElement;
    const thumb = bar.querySelector("[data-slot='scroll-area-thumb']") as HTMLElement;
    withGeometry(view, { scrollHeight: 10000, clientHeight: 100, scrollTop: 0 });
    withTrack(bar, 100, 10);
    view.dispatchEvent(new Event("scroll"));
    flush();
    expect(inlineStyles(thumb)).toContain("height:20px");
  });

  test.each(scrollAreaVariants)("$format/$style positions the thumb at the scroll fraction", async (variant) => {
    const root = renderVariant(variant, { children: ["Content"] }) as HTMLElement;
    const bar = root.querySelector("[data-slot='scroll-area-scrollbar']") as HTMLElement;
    await awaitWiring(bar);
    const view = root.querySelector("[data-slot='scroll-area-viewport']") as HTMLElement;
    const thumb = bar.querySelector("[data-slot='scroll-area-thumb']") as HTMLElement;
    withGeometry(view, { scrollHeight: 400, clientHeight: 200, scrollTop: 100 });
    withTrack(bar, 100, 10);
    view.dispatchEvent(new Event("scroll"));
    flush();
    expect(inlineStyles(thumb)).toContain("transform:translateY(25px)");
  });

  test.each(scrollAreaVariants)("$format/$style maps thumb drags to viewport scrollTop through the track span", async (variant) => {
    const root = renderVariant(variant, { children: ["Content"] }) as HTMLElement;
    const bar = root.querySelector("[data-slot='scroll-area-scrollbar']") as HTMLElement;
    await awaitWiring(bar);
    const view = root.querySelector("[data-slot='scroll-area-viewport']") as HTMLElement;
    const thumb = bar.querySelector("[data-slot='scroll-area-thumb']") as HTMLElement;
    withGeometry(view, { scrollHeight: 400, clientHeight: 200, scrollTop: 0 });
    withTrack(bar, 100, 10);
    view.dispatchEvent(new Event("scroll"));
    flush();
    dragThumb(thumb, [{ dy: 25 }, { dy: 25 }]);
    expect(view.scrollTop).toBe(200);
  });

  test.each(scrollAreaVariants)("$format/$style mirrors the thumb math and drag mapping on the horizontal axis", async (variant) => {
    const barNode = pairedBar(variant).render({ orientation: "horizontal" });
    const root = renderVariant(variant, { children: [barNode, "Content"] }) as HTMLElement;
    const horizontalBar = root.querySelector("[data-slot='scroll-area-scrollbar'][data-orientation='horizontal']") as HTMLElement;
    await awaitWiring(horizontalBar);
    expect(horizontalBar).not.toBeNull();
    const view = root.querySelector("[data-slot='scroll-area-viewport']") as HTMLElement;
    const thumb = horizontalBar.querySelector("[data-slot='scroll-area-thumb']") as HTMLElement;
    withGeometry(view, { scrollWidth: 800, clientWidth: 400, scrollLeft: 200, scrollHeight: 400, clientHeight: 400, scrollTop: 0 });
    withTrack(horizontalBar, 10, 100);
    view.dispatchEvent(new Event("scroll"));
    flush();
    expect(inlineStyles(thumb)).toContain("width:50px");
    expect(inlineStyles(thumb)).toContain("transform:translateX(25px)");
    withGeometry(view, { scrollWidth: 800, clientWidth: 400, scrollLeft: 0, scrollHeight: 400, clientHeight: 400, scrollTop: 0 });
    dragThumb(thumb, [{ dx: 25 }]);
    expect(view.scrollLeft).toBe(200);
  });

  test.each(scrollAreaVariants)("$format/$style keeps vertical and horizontal thumbs measuring their own axes", async (variant) => {
    const barNode = pairedBar(variant).render({ orientation: "horizontal" });
    const root = renderVariant(variant, { children: [barNode, "Content"] }) as HTMLElement;
    await awaitWiring(root.querySelector("[data-slot='scroll-area-scrollbar'][data-orientation='vertical']")!);
    const view = root.querySelector("[data-slot='scroll-area-viewport']") as HTMLElement;
    const verticalThumb = root.querySelector("[data-slot='scroll-area-scrollbar'][data-orientation='vertical'] [data-slot='scroll-area-thumb']") as HTMLElement;
    const horizontalThumb = root.querySelector("[data-slot='scroll-area-scrollbar'][data-orientation='horizontal'] [data-slot='scroll-area-thumb']") as HTMLElement;
    withGeometry(view, { scrollHeight: 400, clientHeight: 200, scrollWidth: 800, clientWidth: 400, scrollTop: 0, scrollLeft: 0 });
    withTrack(root.querySelector("[data-slot='scroll-area-scrollbar'][data-orientation='vertical']") as HTMLElement, 100, 10);
    withTrack(root.querySelector("[data-slot='scroll-area-scrollbar'][data-orientation='horizontal']") as HTMLElement, 10, 100);
    view.dispatchEvent(new Event("scroll"));
    flush();
    expect(inlineStyles(verticalThumb)).toContain("height:50px");
    expect(inlineStyles(horizontalThumb)).toContain("width:50px");
    expect(root.querySelectorAll("[data-slot='scroll-area-corner']").length).toBe(1);
  });

  test.each(scrollAreaVariants)("$format/$style re-measures the thumb when content grows through the injected watcher", async (variant) => {
    let grow: (() => void) | undefined;
    const observe: ScrollerObserve = (_target, onGrow) => {
      grow = onGrow;
      return () => undefined;
    };
    const root = renderVariant(variant, { children: ["Content"], observe }) as HTMLElement;
    const bar = root.querySelector("[data-slot='scroll-area-scrollbar']") as HTMLElement;
    await awaitWiring(bar);
    const view = root.querySelector("[data-slot='scroll-area-viewport']") as HTMLElement;
    const thumb = bar.querySelector("[data-slot='scroll-area-thumb']") as HTMLElement;
    withGeometry(view, { scrollHeight: 400, clientHeight: 200, scrollTop: 0 });
    withTrack(bar, 100, 10);
    view.dispatchEvent(new Event("scroll"));
    flush();
    expect(inlineStyles(thumb)).toContain("height:50px");
    withGeometry(view, { scrollHeight: 800, clientHeight: 200, scrollTop: 0 });
    grow!();
    flush();
    expect(inlineStyles(thumb)).toContain("height:25px");
  });

  test.each(scrollAreaVariants)("$format/$style disposes the scroll, drag, and watcher wiring when the root unmounts", async (variant) => {
    const dispose = mock(() => {});
    const observe: ScrollerObserve = () => dispose;
    const root = renderVariant(variant, { children: ["Content"], observe }) as HTMLElement;
    const bar = root.querySelector("[data-slot='scroll-area-scrollbar']") as HTMLElement;
    await awaitWiring(bar);
    const view = root.querySelector("[data-slot='scroll-area-viewport']") as HTMLElement;
    const thumb = bar.querySelector("[data-slot='scroll-area-thumb']") as HTMLElement;
    withGeometry(view, { scrollHeight: 400, clientHeight: 200, scrollTop: 0 });
    withTrack(bar, 100, 10);
    // The default ResizeObserver path disposes through the same teardown array.
    const defaultRoot = renderVariant(variant, { children: ["Content"] }) as HTMLElement;
    await awaitWiring(defaultRoot.querySelector("[data-slot='scroll-area-scrollbar']")!);
    root.remove();
    defaultRoot.remove();
    const defaultBar = defaultRoot.querySelector("[data-slot='scroll-area-scrollbar']");
    for (let i = 0; i < 50; i++) {
      if (!peekState(bar) && !peekState(defaultBar!)) break;
      await delay();
    }
    expect(peekState(bar)).toBeUndefined();
    expect(dispose).toHaveBeenCalledTimes(1);
    dragThumb(thumb, [{ dy: 25 }]);
    expect(view.scrollTop).toBe(0);
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(scrollAreaVariants, { children: ["Content"] });
    assertStructuralParity(scrollBarVariants, {});
    assertStructuralParity(scrollBarVariants, { orientation: "horizontal" });
  });
});
