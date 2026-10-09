import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState, delay } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount shares one dom instance with the components.
import { peekState } from "@hellajs/dom";
// The group under test composes real part nodes per flavor, so these tests import the same
// compiled modules helpers/variants.ts does.
import * as ResizableCssJsx from "../dist/registry/resizable/css/resizable";
import * as ResizableCssHtml from "../dist/registry/resizable/css/resizable-html";
import * as ResizableTailwindJsx from "../dist/registry/resizable/tailwind/resizable";
import * as ResizableTailwindHtml from "../dist/registry/resizable/tailwind/resizable-html";
import {
  assertAttrForwarded,
  assertHandlerForwarded,
  assertStructuralParity,
  classTokens,
  renderVariant,
  resizablePartVariants,
  resizableVariants,
} from "./helpers/variants";
import type { HellaChild } from "@hellajs/dom";
import type { ComponentVariant, ResizableVariantProps } from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

/** Polls (microtask hops) until the observer-driven mount walk has wired the group's afterMount hooks. */
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

/** Overrides the group's rect measurement — HappyDOM zeroes client rects, so the drag math needs this seam. */
function spyGroupRect(root: HTMLElement, rect: Rect): void {
  Object.assign(root, { getBoundingClientRect: () => rect });
}

/** Dispatches the pointerdown/move/up sequence on the handle with pixel offsets from the drag start. */
function dragHandle(handle: HTMLElement, offsets: { x?: number; y?: number }[]): void {
  handle.dispatchEvent(new PointerEvent("pointerdown", { button: 0, bubbles: true, cancelable: true }));
  for (const offset of offsets) {
    handle.dispatchEvent(new PointerEvent("pointermove", { clientX: offset.x ?? 0, clientY: offset.y ?? 0, bubbles: true, cancelable: true }));
  }
  handle.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
}

function press(handle: HTMLElement, key: string): void {
  handle.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

/** Builds a disabled-handle stack from the variant's own flavor modules (the suite wrapper has no disabled variant). */
function disabledStack(variant: ComponentVariant<ResizableVariantProps>): HellaChild[] {
  const mods = {
    "css/jsx": ResizableCssJsx,
    "css/html": ResizableCssHtml,
    "tailwind/jsx": ResizableTailwindJsx,
    "tailwind/html": ResizableTailwindHtml,
  }[`${variant.style}/${variant.format}` as const]!;
  return [
    mods.ResizablePanel({ defaultSize: 50, children: "A" }),
    mods.ResizableHandle({ disabled: true }),
    mods.ResizablePanel({ defaultSize: 50, children: "B" }),
  ];
}

/** Builds a withHandle stack from the variant's own flavor modules. */
function gripStack(variant: ComponentVariant<ResizableVariantProps>): HellaChild[] {
  const mods = {
    "css/jsx": ResizableCssJsx,
    "css/html": ResizableCssHtml,
    "tailwind/jsx": ResizableTailwindJsx,
    "tailwind/html": ResizableTailwindHtml,
  }[`${variant.style}/${variant.format}` as const]!;
  return [
    mods.ResizablePanel({ defaultSize: 50, children: "A" }),
    mods.ResizableHandle({ withHandle: true }),
    mods.ResizablePanel({ defaultSize: 50, children: "B" }),
  ];
}

describe("resizable", () => {
  test.each(resizableVariants)("$format/$style seeds both panels with the default flex-grow split", async (variant) => {
    const root = renderVariant(variant, { children: variant.child!("A") }) as HTMLElement;
    await awaitWiring(root);
    const panels = Array.from(root.querySelectorAll("[data-slot='resizable-panel']")) as HTMLElement[];
    expect(panels.length).toBe(2);
    expect(panels[0]!.style.flexGrow).toBe("50");
    expect(panels[1]!.style.flexGrow).toBe("50");
    expect(panels[0]!.getAttribute("data-default-size")).toBe("50");
    expect(panels[0]!.getAttribute("data-min-size")).toBe("0");
    expect(panels[0]!.getAttribute("data-max-size")).toBe("100");
    expect(root.getAttribute("aria-orientation")).toBe("horizontal");
    const handle = root.querySelector("[data-slot='resizable-handle']") as HTMLElement;
    expect(handle.getAttribute("role")).toBe("separator");
    expect(handle.getAttribute("aria-orientation")).toBe("horizontal");
  });

  test.each(resizableVariants)("$format/$style shifts the adjacent pair on handle drag", async (variant) => {
    const onLayout = mock((sizes: number[]) => sizes);
    const root = renderVariant(variant, { children: variant.child!("A"), onLayout }) as HTMLElement;
    await awaitWiring(root);
    spyGroupRect(root, { left: 0, top: 0, width: 200, height: 100 });
    const handle = root.querySelector("[data-slot='resizable-handle']") as HTMLElement;
    dragHandle(handle, [{ x: 20 }, { x: 30 }]);
    expect(onLayout).toHaveBeenCalledTimes(2);
    expect(onLayout.mock.calls[0]).toEqual([[60, 40]]);
    expect(onLayout.mock.calls[1]).toEqual([[65, 35]]);
    const panels = Array.from(root.querySelectorAll("[data-slot='resizable-panel']")) as HTMLElement[];
    expect(panels[0]!.style.flexGrow).toBe("65");
    expect(panels[1]!.style.flexGrow).toBe("35");
  });

  test.each(resizableVariants)("$format/$style clamps pair resizing at the panels' min/max", async (variant) => {
    const onLayout = mock((sizes: number[]) => sizes);
    const root = renderVariant(variant, { children: variant.child!("A"), onLayout }) as HTMLElement;
    await awaitWiring(root);
    const panels = Array.from(root.querySelectorAll("[data-slot='resizable-panel']")) as HTMLElement[];
    panels[0]!.setAttribute("data-max-size", "55");
    panels[0]!.setAttribute("data-min-size", "45");
    spyGroupRect(root, { left: 0, top: 0, width: 100, height: 100 });
    const handle = root.querySelector("[data-slot='resizable-handle']") as HTMLElement;
    dragHandle(handle, [{ x: 20 }, { x: -30 }]);
    expect(onLayout.mock.calls[0]).toEqual([[55, 45]]);
    expect(onLayout.mock.calls[1]).toEqual([[45, 55]]);
  });

  test.each(resizableVariants)("$format/$style moves the pair by 5% per keyboard arrow", async (variant) => {
    const onLayout = mock((sizes: number[]) => sizes);
    const root = renderVariant(variant, { children: variant.child!("A"), onLayout }) as HTMLElement;
    await awaitWiring(root);
    const handle = root.querySelector("[data-slot='resizable-handle']") as HTMLElement;
    expect(handle.getAttribute("tabindex")).toBe("0");
    press(handle, "ArrowRight");
    press(handle, "ArrowRight");
    press(handle, "ArrowLeft");
    press(handle, "ArrowUp");
    press(handle, "ArrowDown");
    expect(onLayout.mock.calls[0]).toEqual([[55, 45]]);
    expect(onLayout.mock.calls[1]).toEqual([[60, 40]]);
    expect(onLayout.mock.calls[2]).toEqual([[55, 45]]);
    expect(onLayout.mock.calls[3]).toEqual([[50, 50]]);
    expect(onLayout.mock.calls[4]).toEqual([[55, 45]]);
    press(handle, "x");
    expect(onLayout).toHaveBeenCalledTimes(5);
  });

  test.each(resizableVariants)("$format/$style sizes vertical drags against the group height", async (variant) => {
    const onLayout = mock((sizes: number[]) => sizes);
    const root = renderVariant(variant, { children: variant.child!("A"), direction: "vertical", onLayout }) as HTMLElement;
    await awaitWiring(root);
    expect(root.getAttribute("aria-orientation")).toBe("vertical");
    const handle = root.querySelector("[data-slot='resizable-handle']") as HTMLElement;
    expect(handle.getAttribute("aria-orientation")).toBe("vertical");
    spyGroupRect(root, { left: 0, top: 0, width: 100, height: 100 });
    dragHandle(handle, [{ y: 10 }]);
    expect(onLayout.mock.calls[0]).toEqual([[60, 40]]);
  });

  test.each(resizableVariants)("$format/$style ignores drags and keys on a disabled handle", async (variant) => {
    const onLayout = mock((sizes: number[]) => sizes);
    const root = renderVariant(variant, { children: disabledStack(variant), onLayout }) as HTMLElement;
    await awaitWiring(root);
    const handle = root.querySelector("[data-slot='resizable-handle']") as HTMLElement;
    expect(handle.getAttribute("aria-disabled")).toBe("true");
    expect(handle.getAttribute("tabindex")).toBe("-1");
    spyGroupRect(root, { left: 0, top: 0, width: 100, height: 100 });
    dragHandle(handle, [{ x: 20 }]);
    press(handle, "ArrowRight");
    expect(onLayout).not.toHaveBeenCalled();
  });

  test.each(resizableVariants)("$format/$style renders the grip icon inside the handle when withHandle is set", (variant) => {
    const root = renderVariant(variant, { children: gripStack(variant) }) as HTMLElement;
    const handle = root.querySelector("[data-slot='resizable-handle']") as HTMLElement;
    const wrap = handle.querySelector("div") as HTMLElement;
    expect(wrap).not.toBeNull();
    const svg = wrap.querySelector("svg") as SVGSVGElement;
    expect(svg).not.toBeNull();
    expect(svg.querySelectorAll("circle").length).toBe(6);
  });

  test.each(resizableVariants)("$format/$style carries the handle classes on both flavors", (variant) => {
    const root = renderVariant(variant, { children: variant.child!("A") }) as HTMLElement;
    const handle = root.querySelector("[data-slot='resizable-handle']") as HTMLElement;
    if (variant.style === "tailwind") {
      expect(classTokens(handle)).toContain("after:-translate-x-1/2");
      expect(classTokens(handle)).toContain("[&[aria-orientation=horizontal]>div]:rotate-90");
    } else {
      expect(classTokens(handle).some((token) => token.startsWith("resizable-handle"))).toBe(true);
    }
  });

  test.each(resizableVariants)("$format/$style disposes the handle wiring when the root unmounts", async (variant) => {
    const onLayout = mock((sizes: number[]) => sizes);
    const root = renderVariant(variant, { children: variant.child!("A"), onLayout }) as HTMLElement;
    await awaitWiring(root);
    // Removing the root from its observed mount container runs the destroy hooks.
    root.remove();
    for (let i = 0; i < 50; i++) {
      if (!peekState(root)) break;
      await delay();
    }
    expect(peekState(root)).toBeUndefined();
    spyGroupRect(root, { left: 0, top: 0, width: 100, height: 100 });
    const handle = root.querySelector("[data-slot='resizable-handle']") as HTMLElement;
    dragHandle(handle, [{ x: 20 }]);
    press(handle, "ArrowRight");
    expect(onLayout).not.toHaveBeenCalled();
  });

  test("forwards user attrs onto the root across all four variants", () => {
    assertAttrForwarded(resizableVariants, { title: "Hella" }, "title", "Hella");
  });

  test("fires a user on:click handler on the root across all four variants", () => {
    const onClick = mock(() => {});
    assertHandlerForwarded(resizableVariants, { "on:click": onClick }, "on:click", "click", onClick);
  });

  test("spreads user attrs onto the handle part across all four flavors", () => {
    assertAttrForwarded(resizablePartVariants.filter((candidate) => candidate.part === "Handle"), { title: "Hella" }, "title", "Hella");
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(resizableVariants);
    // Each part parity's against its own four flavors; the panel's inline flex style serializes
    // differently per flavor (object form drops the space after the colon) — value asserted above.
    assertStructuralParity(resizablePartVariants.filter((candidate) => candidate.part === "Panel"), { defaultSize: 50 }, ["style"]);
    assertStructuralParity(resizablePartVariants.filter((candidate) => candidate.part === "Handle"), { withHandle: true, disabled: true });
  });
});
