import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { tabs } from "@hellajs/headless";
import { pressKey } from "./helpers";

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

/** Mounts the list with three value-keyed triggers and returns the list root plus its tabs. */
function mountList(
  parts: ReturnType<typeof tabs>,
  first?: { disabled?: boolean },
): {
  root: HTMLElement;
  items: HTMLElement[];
} {
  const root = mountPart(
    parts.List({
      children: [
        parts.Trigger({ value: "alpha", disabled: first?.disabled, children: "Alpha" }),
        parts.Trigger({ value: "beta", children: "Beta" }),
        parts.Trigger({ value: "gamma", children: "Gamma" }),
      ],
    }),
  );
  const items = Array.from(root.querySelectorAll("[role='tab']")) as HTMLElement[];
  return { root, items };
}

describe("tabs", () => {
  test("a click activates a trigger and swaps the panel visibility", async () => {
    const onValueChange = vi.fn((value: string) => value);
    const parts = tabs({ onValueChange, defaultValue: "alpha" });
    const { root, items } = mountList(parts);
    await awaitWiring(root);
    const alphaPanel = mountPart(parts.Content({ value: "alpha", children: "Alpha body" }));
    const betaPanel = mountPart(parts.Content({ value: "beta", children: "Beta body" }));
    expect(items[0]!.getAttribute("aria-selected")).toBe("true");
    expect(items[0]!.getAttribute("data-state")).toBe("active");
    expect(alphaPanel.getAttribute("data-state")).toBe("active");
    expect(alphaPanel.hasAttribute("hidden")).toBe(false);
    expect(betaPanel.hasAttribute("hidden")).toBe(true);
    items[1]!.dispatchEvent(new Event("click"));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]).toEqual(["beta"]);
    expect(items[1]!.getAttribute("aria-selected")).toBe("true");
    expect(items[1]!.getAttribute("data-state")).toBe("active");
    expect(items[0]!.getAttribute("data-state")).toBe("inactive");
    expect(betaPanel.getAttribute("data-state")).toBe("active");
    expect(betaPanel.hasAttribute("hidden")).toBe(false);
    expect(alphaPanel.hasAttribute("hidden")).toBe(true);
  });

  test("re-selecting the active value notifies no one", async () => {
    const onValueChange = vi.fn((value: string) => value);
    const parts = tabs({ onValueChange, defaultValue: "alpha" });
    const { root, items } = mountList(parts);
    await awaitWiring(root);
    items[0]!.dispatchEvent(new Event("click"));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("the defaultValue seeds the active tab and lands the tabindex walk", async () => {
    const parts = tabs({ defaultValue: "beta" });
    const { root, items } = mountList(parts);
    await awaitWiring(root);
    expect(items.map((item) => item.getAttribute("aria-selected"))).toEqual([
      "false",
      "true",
      "false",
    ]);
    expect(items.map((item) => item.tabIndex)).toEqual([-1, 0, -1]);
  });

  test("without a seed the tabindex walk lands the first trigger", async () => {
    const parts = tabs();
    const { root, items } = mountList(parts);
    await awaitWiring(root);
    expect(items.map((item) => item.tabIndex)).toEqual([0, -1, -1]);
    items[0]!.dispatchEvent(new Event("click"));
    expect(items[0]!.getAttribute("aria-selected")).toBe("true");
  });

  test("a controlled value accessor reports without writing; the controller's write reflects", async () => {
    const value = signal("alpha");
    const onValueChange = vi.fn((next: string) => value(next));
    const parts = tabs({ value: () => value(), onValueChange });
    const { root, items } = mountList(parts);
    await awaitWiring(root);
    const gammaPanel = mountPart(parts.Content({ value: "gamma", children: "Gamma body" }));
    items[2]!.dispatchEvent(new Event("click"));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]).toEqual(["gamma"]);
    flush();
    expect(items[2]!.getAttribute("aria-selected")).toBe("true");
    expect(gammaPanel.hasAttribute("hidden")).toBe(false);
  });

  test("arrows move focus and select the landed trigger with wrap-around", async () => {
    const onValueChange = vi.fn((value: string) => value);
    const parts = tabs({ onValueChange, defaultValue: "alpha" });
    const { root, items } = mountList(parts);
    await awaitWiring(root);
    const betaPanel = mountPart(parts.Content({ value: "beta", children: "Beta body" }));
    items[1]!.focus();
    expect(onValueChange.mock.calls.at(-1)).toEqual(["beta"]);
    expect(betaPanel.hasAttribute("hidden")).toBe(false);
    pressKey(items[1]!, "ArrowRight");
    expect(document.activeElement).toBe(items[2]!);
    expect(items[2]!.getAttribute("aria-selected")).toBe("true");
    expect(items.map((item) => item.tabIndex)).toEqual([-1, -1, 0]);
    pressKey(items[2]!, "ArrowRight");
    expect(document.activeElement).toBe(items[0]!);
    pressKey(items[0]!, "ArrowLeft");
    expect(document.activeElement).toBe(items[2]!);
    pressKey(items[2]!, "Home");
    expect(document.activeElement).toBe(items[0]!);
    expect(items[0]!.getAttribute("aria-selected")).toBe("true");
    pressKey(items[0]!, "End");
    expect(document.activeElement).toBe(items[2]!);
    expect(items[2]!.getAttribute("aria-selected")).toBe("true");
  });

  test("orientation renders the orientation attributes and scopes the arrow axis", async () => {
    const parts = tabs({ orientation: "vertical", defaultValue: "alpha" });
    const { root, items } = mountList(parts);
    await awaitWiring(root);
    expect(root.getAttribute("role")).toBe("tablist");
    expect(root.getAttribute("data-orientation")).toBe("vertical");
    expect(root.getAttribute("aria-orientation")).toBe("vertical");
    expect(items.map((item) => item.getAttribute("data-orientation"))).toEqual([
      "vertical",
      "vertical",
      "vertical",
    ]);
    items[0]!.focus();
    pressKey(items[0]!, "ArrowRight");
    expect(document.activeElement).toBe(items[0]!);
    pressKey(items[0]!, "ArrowDown");
    expect(document.activeElement).toBe(items[1]!);
  });

  test("the aria id cycle stays consistent across triggers and panels", () => {
    const parts = tabs({ defaultValue: "alpha" });
    const { root } = mountList(parts);
    expect(root.getAttribute("data-slot")).toBe("tabs-list");
    const items = Array.from(root.querySelectorAll("[role='tab']")) as HTMLElement[];
    const values = ["alpha", "beta", "gamma"];
    for (let i = 0; i < values.length; i++) {
      const item = items[i]!;
      const panel = mountPart(parts.Content({ value: values[i], children: "Body" }));
      expect(item.id).toBe(`hella-tabs-tab-${values[i]}`);
      expect(item.getAttribute("aria-controls")).toBe(`hella-tabs-panel-${values[i]}`);
      expect(panel.getAttribute("role")).toBe("tabpanel");
      expect(panel.getAttribute("data-slot")).toBe("tabs-content");
      expect(panel.id).toBe(`hella-tabs-panel-${values[i]}`);
      expect(panel.getAttribute("aria-labelledby")).toBe(item.id);
    }
  });

  test("disabled triggers drop out of the arrow walk and block clicks", async () => {
    const onValueChange = vi.fn((value: string) => value);
    const parts = tabs({ onValueChange, defaultValue: "gamma" });
    const { root, items } = mountList(parts, { disabled: true });
    await awaitWiring(root);
    expect(items[0]!.hasAttribute("disabled")).toBe(true);
    expect(items[2]!.getAttribute("aria-selected")).toBe("true");
    // Non-tab focusins and disabled triggers never drive the selection.
    root.dispatchEvent(new FocusEvent("focusin"));
    items[0]!.dispatchEvent(new Event("click"));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(items[0]!.getAttribute("aria-selected")).toBe("false");
    items[1]!.focus();
    pressKey(items[1]!, "ArrowLeft");
    expect(document.activeElement).toBe(items[2]!);
    pressKey(items[2]!, "ArrowLeft");
    expect(document.activeElement).toBe(items[1]!);
  });

  test("a trigger's active and onActivate overrides apply for manual composition", () => {
    const onActivate = vi.fn(() => {});
    const parts = tabs();
    const trigger = mountPart(
      parts.Trigger({ value: "solo", active: true, onActivate, children: "Solo" }),
    );
    expect(trigger.getAttribute("role")).toBe("tab");
    expect(trigger.getAttribute("id")).toBe("hella-tabs-tab-solo");
    expect(trigger.getAttribute("aria-selected")).toBe("true");
    expect(trigger.getAttribute("data-state")).toBe("active");
    trigger.dispatchEvent(new Event("click"));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  test("a content's active override applies and the wiring carries the labelledby", () => {
    const parts = tabs();
    const panel = mountPart(
      parts.Content({ value: "solo", active: () => true, children: "Solo body" }),
    );
    expect(panel.getAttribute("id")).toBe("hella-tabs-panel-solo");
    expect(panel.getAttribute("aria-labelledby")).toBe("hella-tabs-tab-solo");
    expect(panel.getAttribute("data-state")).toBe("active");
    expect(panel.hasAttribute("hidden")).toBe(false);
  });

  test("a user on:click chains before the owned select", () => {
    const userClick = vi.fn(function (this: HTMLElement, e: Event) {
      void e;
    });
    const parts = tabs({ defaultValue: "alpha" });
    const trigger = mountPart(parts.Trigger({ value: "beta", "on:click": userClick }));
    trigger.dispatchEvent(new Event("click"));
    expect(userClick).toHaveBeenCalledTimes(1);
    expect(trigger.getAttribute("aria-selected")).toBe("true");
  });

  test("attributes forward onto the parts", () => {
    const parts = tabs();
    const root = mountPart(parts.List({ title: "list", children: [] }));
    expect(root.getAttribute("title")).toBe("list");
    const trigger = mountPart(parts.Trigger({ value: "a", title: "trigger", children: "A" }));
    expect(trigger.getAttribute("title")).toBe("trigger");
    const panel = mountPart(parts.Content({ value: "a", title: "panel", children: "Body" }));
    expect(panel.getAttribute("title")).toBe("panel");
  });

  test("a valueless trigger and content render without the derived ids", () => {
    const parts = tabs({ defaultValue: "alpha" });
    const trigger = mountPart(parts.Trigger({ children: "No value" }));
    expect(trigger.getAttribute("role")).toBe("tab");
    expect(trigger.hasAttribute("id")).toBe(false);
    expect(trigger.hasAttribute("aria-controls")).toBe(false);
    expect(trigger.getAttribute("aria-selected")).toBe("false");
    const panel = mountPart(parts.Content({ children: "No value" }));
    expect(panel.getAttribute("role")).toBe("tabpanel");
    expect(panel.hasAttribute("id")).toBe(false);
    expect(panel.hasAttribute("aria-labelledby")).toBe(false);
    expect(panel.hasAttribute("hidden")).toBe(true);
  });

  test("list disposal stops the roving, selection, and focus wiring", async () => {
    const onValueChange = vi.fn((value: string) => value);
    const parts = tabs({ onValueChange, defaultValue: "alpha" });
    const { root, items } = mountList(parts);
    await awaitWiring(root);
    items[0]!.focus();
    root.remove();
    for (let i = 0; i < 50; i++) {
      if (!peekState(root)) break;
      await delay();
    }
    expect(peekState(root)).toBeUndefined();
    const before = document.activeElement;
    pressKey(items[0]!, "ArrowRight");
    expect(document.activeElement).toBe(before);
    items[1]!.dispatchEvent(new Event("click"));
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
