import { describe, test, expect, beforeEach, afterEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { tooltip } from "@hellajs/headless";
import { pointerDown, pointerEnter, pointerLeave, pressKey } from "./helpers";

beforeEach(() => {
  resetTestState();
});

/** Mock clock for the shared skip-delay window (hoverIntent reads Date.now); captured here, restored in afterEach. */
let now: number;
let originalNow: () => number;

beforeEach(() => {
  originalNow = Date.now;
  now = originalNow();
  Date.now = () => now;
});

afterEach(() => {
  Date.now = originalNow;
});

/** Pins a rect on the element - the injectable seam the positioning assertions read through anchorPosition. */
function pinRect(el: Element, top: number, left: number, width: number, height: number): void {
  el.getBoundingClientRect = () =>
    ({
      top,
      left,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

/** Polls (microtask hops) until the newest portaled content finished its observer-driven mount walk. */
async function openContent(): Promise<HTMLElement> {
  for (let i = 0; i < 50; i++) {
    const nodes = document.querySelectorAll("[data-slot='tooltip-content']");
    const node = nodes.length === 0 ? undefined : (nodes[nodes.length - 1] as HTMLElement);
    if (node && peekState(node)?.isMounted) return node;
    await delay(0);
  }
  throw new Error("portaled tooltip content never mounted");
}

/** Polls (microtask hops) until the node detaches from the document. */
async function awaitDetached(node: Element): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (!node.isConnected) return;
    await delay();
  }
  expect(node.isConnected).toBe(false);
}

/** Mounts a trigger with its content layer as a child in a fresh container and returns the trigger element once its mount walk finished. */
async function mountTooltip(
  parts: ReturnType<typeof tooltip>,
  text = "Tip text",
): Promise<HTMLElement> {
  const container = document.createElement("div");
  document.body.append(container);
  mount(parts.Trigger({ children: [parts.Content({ children: text })] }), container);
  const trigger = container.firstElementChild as HTMLElement;
  for (let i = 0; i < 50; i++) {
    if (peekState(trigger)?.isMounted) return trigger;
    await delay();
  }
  throw new Error("tooltip trigger never mounted");
}

describe("tooltip", () => {
  test("opens after the open delay with the trigger aria and content role wired", async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const parts = tooltip({ delay: 5, onOpenChange });
    const trigger = await mountTooltip(parts);
    pointerEnter(trigger);
    expect(document.querySelector("[data-slot='tooltip-content']")).toBeNull();
    await delay(30);
    const content = await openContent();
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.getAttribute("role")).toBe("tooltip");
    expect(content.textContent).toBe("Tip text");
    expect(trigger.getAttribute("aria-describedby")).toBe(content.id);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  test("cancels the open when the pointer leaves before the delay", async () => {
    const parts = tooltip({ delay: 5000 });
    const trigger = await mountTooltip(parts);
    pointerEnter(trigger);
    pointerLeave(trigger);
    await delay(30);
    expect(document.querySelector("[data-slot='tooltip-content']")).toBeNull();
  });

  test("opens instantly inside the shared skip-delay window after a recent tooltip", async () => {
    const first = tooltip({ delay: 5 });
    const firstTrigger = await mountTooltip(first);
    pointerEnter(firstTrigger);
    await openContent();
    pointerDown(document.body);
    now += 100;
    const second = tooltip({ delay: 5000 });
    const secondTrigger = await mountTooltip(second, "Second tip");
    pointerEnter(secondTrigger);
    await delay(30);
    const content = await openContent();
    expect(content.textContent).toBe("Second tip");
  });

  test("delays again once the skip-delay window has passed", async () => {
    const first = tooltip({ delay: 5 });
    const firstTrigger = await mountTooltip(first);
    pointerEnter(firstTrigger);
    await openContent();
    pointerDown(document.body);
    now += 600;
    const second = tooltip({ delay: 5000 });
    const secondTrigger = await mountTooltip(second, "Second tip");
    pointerEnter(secondTrigger);
    await delay(0);
    const nodes = document.querySelectorAll("[data-slot='tooltip-content']");
    const newest = nodes.length === 0 ? undefined : (nodes[nodes.length - 1] as HTMLElement);
    expect(newest?.textContent).not.toBe("Second tip");
  });

  test("the content anchors above the trigger with no gap by default", async () => {
    const parts = tooltip({ delay: 5 });
    const trigger = await mountTooltip(parts);
    pinRect(trigger, 100, 50, 200, 20);
    pointerEnter(trigger);
    await delay(30);
    const content = await openContent();
    expect(content.style.left).toBe("150px");
    expect(content.style.top).toBe("100px");
    expect(content.getAttribute("data-side")).toBe("top");
    expect(content.getAttribute("data-align")).toBe("center");
  });

  test("Escape closes the open tooltip through the layered engine", async () => {
    const parts = tooltip({ delay: 5 });
    const trigger = await mountTooltip(parts);
    pointerEnter(trigger);
    await delay(30);
    const content = await openContent();
    pressKey(document.body, "Escape");
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test("an outside pointerdown closes the open tooltip", async () => {
    const parts = tooltip({ delay: 5 });
    const trigger = await mountTooltip(parts);
    pointerEnter(trigger);
    await delay(30);
    const content = await openContent();
    pointerDown(document.body);
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test("the exit unmounts the content through the animationend channel", async () => {
    const parts = tooltip({ delay: 5 });
    const trigger = await mountTooltip(parts);
    pointerEnter(trigger);
    await delay(30);
    const content = await openContent();
    pointerDown(document.body);
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(content.isConnected).toBe(true);
    content.dispatchEvent(new Event("animationend"));
    await awaitDetached(content);
    pointerEnter(trigger);
    const reopened = await openContent();
    expect(reopened).not.toBe(content);
  });

  test("unmounting the tree leaves no clock or listener residue", async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const parts = tooltip({ delay: 5, onOpenChange });
    const container = document.createElement("div");
    document.body.append(container);
    const handle = mount(
      parts.Trigger({ children: [parts.Content({ children: "Tip text" })] }),
      container,
    );
    const trigger = container.firstElementChild as HTMLElement;
    pointerEnter(trigger);
    await delay(30);
    const content = await openContent();
    handle.unmount();
    await awaitDetached(content);

    pointerEnter(trigger);
    pressKey(document.body, "Escape");
    pointerDown(document.body);
    flush();
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  test("a controlled open getter drives the parts and keeps internal state out", async () => {
    const open = signal(false);
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const parts = tooltip({ open: () => open(), onOpenChange, delay: 5 });
    const trigger = await mountTooltip(parts);

    pointerEnter(trigger);
    await delay(30);
    flush();
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(document.querySelector("[data-slot='tooltip-content']")).toBeNull();

    open(true);
    const content = await openContent();
    expect(content.getAttribute("data-state")).toBe("open");

    open(false);
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });
});
