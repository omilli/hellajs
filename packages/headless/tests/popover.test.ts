import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { popover } from "@hellajs/headless";
import { pointerDown, pressKey } from "./helpers";

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
    const nodes = document.querySelectorAll("[data-slot='popover-content']");
    const node = nodes.length === 0 ? undefined : (nodes[nodes.length - 1] as HTMLElement);
    if (node && peekState(node)?.isMounted) return node;
    await delay();
  }
  throw new Error("portaled popover content never mounted");
}

/** Polls (microtask hops) until the node detaches from the document. */
async function awaitDetached(node: Element): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (!node.isConnected) return;
    await delay();
  }
  expect(node.isConnected).toBe(false);
}

/** Mounts a trigger with its content layer as a child in a fresh container and returns the trigger element. */
function mountPopover(parts: ReturnType<typeof popover>): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  mount(parts.Trigger({ children: [parts.Content({ children: "Body" })] }), container);
  return container.firstElementChild as HTMLElement;
}

describe("popover", () => {
  test("clicking the trigger toggles state into data-state and aria-expanded", async () => {
    const parts = popover();
    const trigger = mountPopover(parts);
    expect(trigger.getAttribute("data-state")).toBe("closed");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    trigger.dispatchEvent(new Event("click"));
    const content = await openContent();
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-controls")).toBe(content.id);
    expect(content.getAttribute("role")).toBe("dialog");
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.textContent).toBe("Body");

    trigger.dispatchEvent(new Event("click"));
    flush();
    expect(trigger.getAttribute("data-state")).toBe("closed");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test("the content anchors to the trigger node", async () => {
    const parts = popover();
    const trigger = mountPopover(parts);
    pinRect(trigger, 100, 50, 200, 20);
    trigger.dispatchEvent(new Event("click"));
    const content = await openContent();
    expect(content.style.left).toBe("150px");
    expect(content.style.top).toBe("124px");
    expect(content.getAttribute("data-side")).toBe("bottom");
    expect(content.getAttribute("data-align")).toBe("center");
  });

  test("escape closes only the top layer of stacked popovers", async () => {
    const first = popover();
    const firstTrigger = mountPopover(first);
    firstTrigger.dispatchEvent(new Event("click"));
    const firstContent = await openContent();

    const second = popover();
    const secondTrigger = mountPopover(second);
    secondTrigger.dispatchEvent(new Event("click"));
    const secondContent = await openContent();
    expect(secondContent.textContent).toBe("Body");

    pressKey(document.body, "Escape");
    flush();
    expect(secondContent.getAttribute("data-state")).toBe("closed");
    expect(firstContent.getAttribute("data-state")).toBe("open");

    pressKey(document.body, "Escape");
    flush();
    expect(firstContent.getAttribute("data-state")).toBe("closed");
  });

  test("an outside pointerdown closes the top layer only", async () => {
    const first = popover();
    const firstTrigger = mountPopover(first);
    firstTrigger.dispatchEvent(new Event("click"));
    const firstContent = await openContent();

    const second = popover();
    const secondTrigger = mountPopover(second);
    secondTrigger.dispatchEvent(new Event("click"));
    const secondContent = await openContent();

    pointerDown(document.body);
    flush();
    expect(secondContent.getAttribute("data-state")).toBe("closed");
    expect(firstContent.getAttribute("data-state")).toBe("open");

    pointerDown(document.body);
    flush();
    expect(firstContent.getAttribute("data-state")).toBe("closed");
  });

  test("the exit unmounts the content on animationend", async () => {
    const parts = popover();
    const trigger = mountPopover(parts);
    trigger.dispatchEvent(new Event("click"));
    const content = await openContent();

    trigger.dispatchEvent(new Event("click"));
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(content.isConnected).toBe(true);

    content.dispatchEvent(new Event("animationend"));
    await awaitDetached(content);

    trigger.dispatchEvent(new Event("click"));
    const reopened = await openContent();
    expect(reopened).not.toBe(content);
    expect(reopened.getAttribute("data-state")).toBe("open");
  });

  test("the exit unmounts through the fallback budget when no animationend fires", async () => {
    const parts = popover();
    const trigger = mountPopover(parts);
    trigger.dispatchEvent(new Event("click"));
    const content = await openContent();

    trigger.dispatchEvent(new Event("click"));
    flush();
    expect(content.isConnected).toBe(true);
    await delay(320);
    expect(content.isConnected).toBe(false);
  });

  test("a controlled open getter drives the parts and keeps internal state out", async () => {
    const open = signal(false);
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const parts = popover({ open: () => open(), onOpenChange });
    const trigger = mountPopover(parts);

    trigger.dispatchEvent(new Event("click"));
    flush();
    expect(trigger.getAttribute("data-state")).toBe("closed");
    expect(onOpenChange).toHaveBeenCalledWith(true);

    open(true);
    const content = await openContent();
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(content.getAttribute("data-state")).toBe("open");

    open(false);
    flush();
    expect(trigger.getAttribute("data-state")).toBe("closed");
    // The controller's own flip notifies no one; onOpenChange reports factory transitions only.
    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });

  test("unmounting the tree drops the dismissal listeners", async () => {
    const open = signal(false);
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const parts = popover({ open: () => open(), onOpenChange });
    const handle = mount(parts.Trigger({ children: [parts.Content({ children: "Body" })] }));
    open(true);
    const content = await openContent();
    expect(content.getAttribute("data-state")).toBe("open");

    handle.unmount();
    await awaitDetached(content);

    pressKey(document.body, "Escape");
    pointerDown(document.body);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
