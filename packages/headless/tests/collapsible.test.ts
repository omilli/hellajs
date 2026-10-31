import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { mount } from "@hellajs/dom";
import { collapsible } from "@hellajs/headless";

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

/** Mounts the trigger and content pair and returns both elements. */
function mountPair(parts: ReturnType<typeof collapsible>, seed?: boolean) {
  const trigger = mountPart(parts.Trigger({ children: "More" }));
  const content = mountPart(parts.Content({ children: seed ? "Seeded body" : "Details" }));
  return { trigger, content };
}

describe("collapsible", () => {
  test("a trigger click toggles the open state and its aria wiring", () => {
    const onOpenChange = vi.fn((open: boolean) => open);
    const parts = collapsible({ onOpenChange });
    const { trigger, content } = mountPair(parts);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("data-state")).toBe("closed");
    expect(content.getAttribute("data-state")).toBe("closed");
    trigger.dispatchEvent(new Event("click"));
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange.mock.calls[0]).toEqual([true]);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(content.getAttribute("data-state")).toBe("open");
    // The content stays mounted under data-state for the CSS collapse.
    expect(content.isConnected).toBe(true);
    trigger.dispatchEvent(new Event("click"));
    expect(onOpenChange.mock.calls[1]).toEqual([false]);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(content.isConnected).toBe(true);
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test("defaultOpen seeds the open state", () => {
    const parts = collapsible({ defaultOpen: true });
    const { trigger, content } = mountPair(parts, true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.textContent).toBe("Seeded body");
  });

  test("a controlled open accessor reports without writing; the controller's write reflects", () => {
    const open = signal(false);
    const onOpenChange = vi.fn((next: boolean) => next);
    const parts = collapsible({ open: () => open(), onOpenChange });
    const { trigger, content } = mountPair(parts);
    trigger.dispatchEvent(new Event("click"));
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange.mock.calls[0]).toEqual([true]);
    // The controller ignored the request: the display holds the controlled state.
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(content.getAttribute("data-state")).toBe("closed");
    open(true);
    flush();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(content.getAttribute("data-state")).toBe("open");
    trigger.dispatchEvent(new Event("click"));
    expect(onOpenChange.mock.calls[1]).toEqual([false]);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  test("the generated id pairs the trigger's aria-controls with the content region", () => {
    const parts = collapsible();
    const { trigger, content } = mountPair(parts);
    expect(trigger.id).toMatch(/^hella-collapsible-trigger-\d+$/);
    expect(content.id).toMatch(/^hella-collapsible-content-\d+$/);
    expect(trigger.getAttribute("aria-controls")).toBe(content.id);
    expect(content.getAttribute("aria-labelledby")).toBe(trigger.id);
    expect(content.getAttribute("role")).toBe("region");
    expect(content.getAttribute("data-slot")).toBe("collapsible-content");
  });

  test("active and onToggle overrides drive a manual composition", () => {
    const onToggle = vi.fn(() => {});
    const parts = collapsible();
    const trigger = mountPart(parts.Trigger({ active: true, onToggle, children: "More" }));
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("data-state")).toBe("open");
    trigger.dispatchEvent(new Event("click"));
    expect(onToggle).toHaveBeenCalledTimes(1);
    const content = mountPart(parts.Content({ active: () => false, children: "Details" }));
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test("attributes forward onto the parts", () => {
    const parts = collapsible();
    const trigger = mountPart(parts.Trigger({ title: "trigger", children: "More" }));
    expect(trigger.getAttribute("title")).toBe("trigger");
    const content = mountPart(parts.Content({ title: "content", children: "Details" }));
    expect(content.getAttribute("title")).toBe("content");
  });
});
