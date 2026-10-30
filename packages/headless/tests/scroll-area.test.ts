import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { scrollArea } from "@hellajs/headless";
import type { ScrollAreaOptions, ScrollAreaScrollbarProps } from "@hellajs/headless";
import { pointerDown, pointerMove, pointerUp } from "./helpers";

beforeEach(() => {
  resetTestState();
});

/** Mounts a rendered node into a fresh body container and returns its root element. */
function mountPart(node: JSX.Element): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  mount(node, container);
  return container.firstElementChild as HTMLElement;
}

/** Polls (microtask hops) until the observer-driven mount walk has wired the node's hooks. */
async function awaitWiring(root: HTMLElement): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (peekState(root)?.isMounted) return;
    await delay();
  }
  expect(peekState(root)?.isMounted).toBe(true);
}

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
  for (const key of Object.keys(geometry) as (keyof Geometry)[]) {
    const value = geometry[key];
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

/** Drags the thumb through cumulative pixel offsets with the shared pointer dispatchers. */
function dragThumb(thumb: HTMLElement, offsets: { x?: number; y?: number }[]): void {
  pointerDown(thumb);
  for (const at of offsets) pointerMove(thumb, at.x ?? 0, at.y ?? 0);
  pointerUp(thumb);
}

interface MountedArea {
  parts: ReturnType<typeof scrollArea>;
  root: HTMLElement;
  viewport: HTMLElement;
  bar: HTMLElement;
  thumb: HTMLElement;
}

/** Mounts Root > Viewport + Scrollbar > Thumb via direct part invocation and resolves the elements. */
function mountArea(
  options: ScrollAreaOptions = {},
  barProps: ScrollAreaScrollbarProps = {},
): MountedArea {
  const parts = scrollArea(options);
  const root = mountPart(
    parts.Root({
      children: [
        parts.Viewport({ children: ["Content"] }),
        parts.Scrollbar({ children: [parts.Thumb({})], ...barProps }),
      ],
    }),
  );
  const viewport = root.querySelector<HTMLElement>("[data-slot='scroll-area-viewport']")!;
  const bar = root.querySelector<HTMLElement>("[data-slot='scroll-area-scrollbar']")!;
  const thumb = bar.querySelector<HTMLElement>("[data-slot='scroll-area-thumb']")!;
  return { parts, root, viewport, bar, thumb };
}

/** Overrides the vertical geometry to a 2:1 scrollable viewport with a 100px bar track. */
function withScrollableRatio(viewport: HTMLElement, bar: HTMLElement, scrollTop = 0): void {
  withGeometry(viewport, {
    scrollHeight: 400,
    clientHeight: 200,
    scrollTop,
  });
  withTrack(bar, 100, 10);
}

describe("scroll-area", () => {
  test("renders the viewport, content wrapper, bar, thumb, and root slots", () => {
    const area = mountArea();
    expect(area.root.getAttribute("data-slot")).toBe("scroll-area");
    expect(area.viewport.getAttribute("data-slot")).toBe("scroll-area-viewport");
    expect(area.viewport.querySelector("[data-slot='scroll-area-content']")?.textContent).toBe(
      "Content",
    );
    expect(area.bar.getAttribute("data-orientation")).toBe("vertical");
    expect(area.thumb).not.toBeNull();
  });

  test("sizes the thumb to the viewport-to-content ratio", async () => {
    const area = mountArea();
    await awaitWiring(area.bar);
    withScrollableRatio(area.viewport, area.bar);
    area.viewport.dispatchEvent(new Event("scroll"));
    expect(area.thumb.getAttribute("style")).toContain("height: 50px");
  });

  test("clamps the thumb to the 20px minimum on very long content", async () => {
    const area = mountArea();
    await awaitWiring(area.bar);
    withGeometry(area.viewport, { scrollHeight: 10000, clientHeight: 100, scrollTop: 0 });
    withTrack(area.bar, 100, 10);
    area.viewport.dispatchEvent(new Event("scroll"));
    expect(area.thumb.getAttribute("style")).toContain("height: 20px");
  });

  test("positions the thumb at the scroll fraction", async () => {
    const area = mountArea();
    await awaitWiring(area.bar);
    withScrollableRatio(area.viewport, area.bar, 100);
    area.viewport.dispatchEvent(new Event("scroll"));
    expect(area.thumb.getAttribute("style")).toContain("transform: translateY(25px)");
  });

  test("maps thumb drags onto the viewport scrollTop through the track span", async () => {
    const area = mountArea();
    await awaitWiring(area.bar);
    withScrollableRatio(area.viewport, area.bar);
    area.viewport.dispatchEvent(new Event("scroll"));
    dragThumb(area.thumb, [{ y: 25 }, { y: 50 }]);
    expect(area.viewport.scrollTop).toBe(200);
  });

  test("ignores drags when the content fits the viewport", async () => {
    const area = mountArea();
    await awaitWiring(area.bar);
    withGeometry(area.viewport, { scrollHeight: 200, clientHeight: 200, scrollTop: 0 });
    withTrack(area.bar, 100, 10);
    area.viewport.dispatchEvent(new Event("scroll"));
    dragThumb(area.thumb, [{ y: 50 }]);
    expect(area.viewport.scrollTop).toBe(0);
  });

  test("measures and drags the horizontal axis from widths", async () => {
    const area = mountArea({}, { orientation: "horizontal" });
    await awaitWiring(area.bar);
    expect(area.bar.getAttribute("data-orientation")).toBe("horizontal");
    withGeometry(area.viewport, {
      scrollWidth: 800,
      clientWidth: 400,
      scrollLeft: 200,
      scrollHeight: 400,
      clientHeight: 400,
      scrollTop: 0,
    });
    withTrack(area.bar, 10, 100);
    area.viewport.dispatchEvent(new Event("scroll"));
    expect(area.thumb.getAttribute("style")).toContain("width: 50px");
    expect(area.thumb.getAttribute("style")).toContain("transform: translateX(25px)");
    withGeometry(area.viewport, {
      scrollWidth: 800,
      clientWidth: 400,
      scrollLeft: 0,
      scrollHeight: 400,
      clientHeight: 400,
      scrollTop: 0,
    });
    dragThumb(area.thumb, [{ x: 25 }]);
    expect(area.viewport.scrollLeft).toBe(200);
  });

  test("keeps two bars measuring their own axes in one root", async () => {
    const parts = scrollArea();
    const root = mountPart(
      parts.Root({
        children: [
          parts.Viewport({ children: ["Content"] }),
          parts.Scrollbar({ children: [parts.Thumb({})] }),
          parts.Scrollbar({ children: [parts.Thumb({})], orientation: "horizontal" }),
        ],
      }),
    );
    const viewport = root.querySelector<HTMLElement>("[data-slot='scroll-area-viewport']")!;
    const verticalBar = root.querySelector<HTMLElement>(
      "[data-slot='scroll-area-scrollbar'][data-orientation='vertical']",
    )!;
    const horizontalBar = root.querySelector<HTMLElement>(
      "[data-slot='scroll-area-scrollbar'][data-orientation='horizontal']",
    )!;
    await awaitWiring(verticalBar);
    await awaitWiring(horizontalBar);
    withGeometry(viewport, {
      scrollHeight: 400,
      clientHeight: 200,
      scrollWidth: 800,
      clientWidth: 400,
      scrollTop: 0,
      scrollLeft: 0,
    });
    withTrack(verticalBar, 100, 10);
    withTrack(horizontalBar, 10, 100);
    viewport.dispatchEvent(new Event("scroll"));
    expect(
      verticalBar
        .querySelector<HTMLElement>("[data-slot='scroll-area-thumb']")!
        .getAttribute("style"),
    ).toContain("height: 50px");
    expect(
      horizontalBar
        .querySelector<HTMLElement>("[data-slot='scroll-area-thumb']")!
        .getAttribute("style"),
    ).toContain("width: 50px");
  });

  test("re-measures the thumb when content grows through the injected watcher", async () => {
    let grow: (() => void) | undefined;
    const area = mountArea({
      observe: (_target, onGrow) => {
        grow = onGrow;
        return () => undefined;
      },
    });
    await awaitWiring(area.bar);
    withScrollableRatio(area.viewport, area.bar);
    area.viewport.dispatchEvent(new Event("scroll"));
    expect(area.thumb.getAttribute("style")).toContain("height: 50px");
    withGeometry(area.viewport, { scrollHeight: 800, clientHeight: 200, scrollTop: 0 });
    grow!();
    expect(area.thumb.getAttribute("style")).toContain("height: 25px");
  });

  test("disposes the scroll, drag, and watcher wiring at bar unmount", async () => {
    const dispose = vi.fn(() => {});
    const area = mountArea({ observe: () => dispose });
    await awaitWiring(area.bar);
    withScrollableRatio(area.viewport, area.bar);
    area.viewport.dispatchEvent(new Event("scroll"));
    area.root.remove();
    for (let i = 0; i < 50; i++) {
      if (peekState(area.bar) === undefined) break;
      await delay();
    }
    expect(peekState(area.bar)).toBeUndefined();
    expect(dispose).toHaveBeenCalledTimes(1);
    dragThumb(area.thumb, [{ y: 25 }]);
    expect(area.viewport.scrollTop).toBe(0);
  });

  test("skips wiring when the bar composes without a root viewport", async () => {
    const parts = scrollArea();
    const bar = mountPart(parts.Scrollbar({ children: [parts.Thumb({})] }));
    await awaitWiring(bar);
    expect(bar.querySelector("[data-slot='scroll-area-thumb']")).not.toBeNull();
  });

  test("skips the content watcher when the viewport has no content wrapper", async () => {
    const parts = scrollArea();
    const bareViewport = document.createElement("div");
    bareViewport.setAttribute("data-slot", "scroll-area-viewport");
    const root = mountPart(
      parts.Root({
        children: [bareViewport, parts.Scrollbar({ children: [parts.Thumb({})] })],
      }),
    );
    const bar = root.querySelector<HTMLElement>("[data-slot='scroll-area-scrollbar']")!;
    await awaitWiring(bar);
    expect(bar.querySelector("[data-slot='scroll-area-thumb']")).not.toBeNull();
  });

  test("skips measuring when the bar composes without a thumb", async () => {
    const parts = scrollArea();
    const bar = mountPart(
      parts.Root({ children: [parts.Viewport({ children: ["Content"] }), parts.Scrollbar({})] }),
    );
    const viewport = bar.querySelector<HTMLElement>("[data-slot='scroll-area-viewport']")!;
    const bareBar = bar.querySelector<HTMLElement>("[data-slot='scroll-area-scrollbar']")!;
    await awaitWiring(bareBar);
    withScrollableRatio(viewport, bareBar);
    viewport.dispatchEvent(new Event("scroll"));
    expect(bareBar.querySelector("[data-slot='scroll-area-thumb']")).toBeNull();
  });

  test("falls back to a no-op watcher when ResizeObserver is missing", async () => {
    const globalScope = globalThis as { ResizeObserver?: unknown };
    const original = globalScope.ResizeObserver;
    globalScope.ResizeObserver = undefined;
    try {
      const area = mountArea();
      await awaitWiring(area.bar);
      withScrollableRatio(area.viewport, area.bar);
      area.viewport.dispatchEvent(new Event("scroll"));
      expect(area.thumb.getAttribute("style")).toContain("height: 50px");
    } finally {
      globalScope.ResizeObserver = original;
    }
  });

  test("forwards class and user attrs onto every part", () => {
    const parts = scrollArea();
    const root = mountPart(
      parts.Root({
        title: "area",
        class: "area-root",
        children: [
          parts.Viewport({ title: "view", class: "area-view", children: ["Content"] }),
          parts.Scrollbar({
            title: "bar",
            class: "area-bar",
            children: [parts.Thumb({ title: "thumb", class: "area-thumb" })],
          }),
        ],
      }),
    );
    expect(root.getAttribute("title")).toBe("area");
    expect(root.className).toBe("area-root");
    const viewport = root.querySelector("[data-slot='scroll-area-viewport']")!;
    expect(viewport.getAttribute("title")).toBe("view");
    expect(viewport.className).toBe("area-view");
    const bar = root.querySelector("[data-slot='scroll-area-scrollbar']")!;
    expect(bar.getAttribute("title")).toBe("bar");
    expect(bar.className).toBe("area-bar");
    const thumb = bar.querySelector("[data-slot='scroll-area-thumb']")!;
    expect(thumb.getAttribute("title")).toBe("thumb");
    expect(thumb.className).toBe("area-thumb");
  });
});
