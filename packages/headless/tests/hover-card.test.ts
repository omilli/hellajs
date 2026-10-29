import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { hoverCard } from "@hellajs/headless";
import { pointerDown, pointerEnter, pointerLeave, pressKey } from "./helpers";

beforeEach(() => {
  resetTestState();
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
    const nodes = document.querySelectorAll("[data-slot='hover-card-content']");
    const node = nodes.length === 0 ? undefined : (nodes[nodes.length - 1] as HTMLElement);
    if (node && peekState(node)?.isMounted) return node;
    await delay(0);
  }
  throw new Error("portaled hover-card content never mounted");
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
async function mountHoverCard(parts: ReturnType<typeof hoverCard>): Promise<HTMLElement> {
  const container = document.createElement("div");
  document.body.append(container);
  mount(parts.Trigger({ children: [parts.Content({ children: "Card body" })] }), container);
  const trigger = container.firstElementChild as HTMLElement;
  for (let i = 0; i < 50; i++) {
    if (peekState(trigger)?.isMounted) return trigger;
    await delay();
  }
  throw new Error("hover-card trigger never mounted");
}

describe("hoverCard", () => {
  test("opens after the open delay under data-state", async () => {
    const parts = hoverCard({ openDelay: 5 });
    const trigger = await mountHoverCard(parts);
    pointerEnter(trigger);
    expect(document.querySelector("[data-slot='hover-card-content']")).toBeNull();
    await delay(30);
    const content = await openContent();
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.textContent).toBe("Card body");
  });

  test("the content anchors below the trigger with the upstream offset", async () => {
    const parts = hoverCard({ openDelay: 5 });
    const trigger = await mountHoverCard(parts);
    pinRect(trigger, 100, 50, 200, 20);
    pointerEnter(trigger);
    await delay(30);
    const content = await openContent();
    expect(content.style.left).toBe("150px");
    expect(content.style.top).toBe("124px");
    expect(content.getAttribute("data-side")).toBe("bottom");
    expect(content.getAttribute("data-align")).toBe("center");
  });

  test("moving from the trigger into the content holds the card open past the close delay", async () => {
    const parts = hoverCard({ openDelay: 5, closeDelay: 5 });
    const trigger = await mountHoverCard(parts);
    pointerEnter(trigger);
    await delay(30);
    const content = await openContent();
    pointerLeave(trigger);
    pointerEnter(content);
    await delay(30);
    expect(content.getAttribute("data-state")).toBe("open");
  });

  test("returning to the trigger from the content cancels the pending close", async () => {
    const parts = hoverCard({ openDelay: 5, closeDelay: 5 });
    const trigger = await mountHoverCard(parts);
    pointerEnter(trigger);
    await delay(30);
    const content = await openContent();
    pointerLeave(trigger);
    pointerEnter(content);
    pointerLeave(content);
    pointerEnter(trigger);
    await delay(30);
    expect(content.getAttribute("data-state")).toBe("open");
  });

  test("leaving both trigger and content closes after the close delay", async () => {
    const parts = hoverCard({ openDelay: 5, closeDelay: 5 });
    const trigger = await mountHoverCard(parts);
    pointerEnter(trigger);
    await delay(30);
    const content = await openContent();
    pointerLeave(trigger);
    pointerEnter(content);
    pointerLeave(content);
    await delay(30);
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test("Escape closes the open hover card through the layered engine", async () => {
    const parts = hoverCard({ openDelay: 5 });
    const trigger = await mountHoverCard(parts);
    pointerEnter(trigger);
    await delay(30);
    const content = await openContent();
    pressKey(document.body, "Escape");
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test("an outside pointerdown closes the open hover card", async () => {
    const parts = hoverCard({ openDelay: 5 });
    const trigger = await mountHoverCard(parts);
    pointerEnter(trigger);
    await delay(30);
    const content = await openContent();
    pointerDown(document.body);
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test("the exit unmounts the content through the animationend channel", async () => {
    const parts = hoverCard({ openDelay: 5 });
    const trigger = await mountHoverCard(parts);
    pointerEnter(trigger);
    await delay(30);
    const content = await openContent();
    pointerDown(document.body);
    flush();
    expect(content.isConnected).toBe(true);
    content.dispatchEvent(new Event("animationend"));
    await awaitDetached(content);
    pointerEnter(trigger);
    const reopened = await openContent();
    expect(reopened).not.toBe(content);
  });

  test("unmounting the tree leaves no listener residue", async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const parts = hoverCard({ openDelay: 5, onOpenChange });
    const container = document.createElement("div");
    document.body.append(container);
    const handle = mount(
      parts.Trigger({ children: [parts.Content({ children: "Card body" })] }),
      container,
    );
    const trigger = container.firstElementChild as HTMLElement;
    pointerEnter(trigger);
    await delay(30);
    const content = await openContent();
    handle.unmount();
    await awaitDetached(content);

    pointerEnter(trigger);
    pointerLeave(trigger);
    pressKey(document.body, "Escape");
    pointerDown(document.body);
    flush();
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  test("a controlled open getter drives the parts and keeps internal state out", async () => {
    const open = signal(false);
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const parts = hoverCard({ open: () => open(), onOpenChange, openDelay: 5 });
    const trigger = await mountHoverCard(parts);

    pointerEnter(trigger);
    await delay(30);
    flush();
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(document.querySelector("[data-slot='hover-card-content']")).toBeNull();

    open(true);
    const content = await openContent();
    expect(content.getAttribute("data-state")).toBe("open");

    open(false);
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });
});
