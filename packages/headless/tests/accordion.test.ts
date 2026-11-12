import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { accordion } from "@hellajs/headless";
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

/** Mounts the root with three value-keyed items and returns the root plus its triggers and regions. */
function mountItems(
  parts: ReturnType<typeof accordion>,
  first?: { disabled?: boolean },
): {
  root: HTMLElement;
  triggers: HTMLElement[];
  contents: HTMLElement[];
} {
  const root = mountPart(
    parts.Root({
      children: [
        parts.Item({
          value: "alpha",
          children: [
            parts.Trigger({ value: "alpha", disabled: first?.disabled, children: "Alpha" }),
            parts.Content({ value: "alpha", children: "Alpha body" }),
          ],
        }),
        parts.Item({
          value: "beta",
          children: [
            parts.Trigger({ value: "beta", children: "Beta" }),
            parts.Content({ value: "beta", children: "Beta body" }),
          ],
        }),
        parts.Item({
          value: "gamma",
          children: [
            parts.Trigger({ value: "gamma", children: "Gamma" }),
            parts.Content({ value: "gamma", children: "Gamma body" }),
          ],
        }),
      ],
    }),
  );
  const triggers = Array.from(root.querySelectorAll("button")) as HTMLElement[];
  const contents = Array.from(root.querySelectorAll("[role='region']")) as HTMLElement[];
  return { root, triggers, contents };
}

describe("accordion", () => {
  test("a click opens a closed item and flips data-state and aria-expanded", () => {
    const parts = accordion({ type: "multiple" });
    const { triggers, contents } = mountItems(parts);
    expect(triggers[0]!.getAttribute("aria-expanded")).toBe("false");
    expect(triggers[0]!.getAttribute("data-state")).toBe("closed");
    expect(contents[0]!.getAttribute("data-state")).toBe("closed");
    triggers[0]!.dispatchEvent(new Event("click"));
    flush();
    expect(triggers[0]!.getAttribute("aria-expanded")).toBe("true");
    expect(triggers[0]!.getAttribute("data-state")).toBe("open");
    expect(contents[0]!.getAttribute("data-state")).toBe("open");
    expect(contents[0]!.textContent).toBe("Alpha body");
  });

  test("single mode swaps the open item and refuses the last close without collapsible", () => {
    const onValueChange = vi.fn((value: string | string[]) => value);
    const parts = accordion({ onValueChange, defaultValue: "beta" });
    const { triggers } = mountItems(parts);
    expect(triggers.map((trigger) => trigger.getAttribute("data-state"))).toEqual([
      "closed",
      "open",
      "closed",
    ]);
    triggers[2]!.dispatchEvent(new Event("click"));
    flush();
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]).toEqual(["gamma"]);
    expect(triggers.map((trigger) => trigger.getAttribute("data-state"))).toEqual([
      "closed",
      "closed",
      "open",
    ]);
    triggers[2]!.dispatchEvent(new Event("click"));
    flush();
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(triggers[2]!.getAttribute("data-state")).toBe("open");
  });

  test("multiple mode opens and closes items independently", () => {
    const parts = accordion({ type: "multiple", defaultValue: ["beta"] });
    const { triggers } = mountItems(parts);
    triggers[0]!.dispatchEvent(new Event("click"));
    triggers[2]!.dispatchEvent(new Event("click"));
    flush();
    expect(triggers.map((trigger) => trigger.getAttribute("data-state"))).toEqual([
      "open",
      "open",
      "open",
    ]);
    triggers[1]!.dispatchEvent(new Event("click"));
    flush();
    expect(triggers.map((trigger) => trigger.getAttribute("data-state"))).toEqual([
      "open",
      "closed",
      "open",
    ]);
  });

  test("a controlled value accessor reports without writing; the controller's write reflects", () => {
    const value = signal<string | string[]>("alpha");
    const onValueChange = vi.fn((next: string | string[]) => next);
    const parts = accordion({ value: () => value(), onValueChange });
    const { triggers } = mountItems(parts);
    triggers[2]!.dispatchEvent(new Event("click"));
    flush();
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]).toEqual(["gamma"]);
    // The controller ignored the request: the display holds the controlled value.
    expect(triggers.map((trigger) => trigger.getAttribute("data-state"))).toEqual([
      "open",
      "closed",
      "closed",
    ]);
    value("gamma");
    flush();
    expect(triggers.map((trigger) => trigger.getAttribute("data-state"))).toEqual([
      "closed",
      "closed",
      "open",
    ]);
  });

  test("arrows and Home/End move focus between triggers without toggling", async () => {
    const parts = accordion({ defaultValue: "beta" });
    const { root, triggers } = mountItems(parts);
    await awaitWiring(root);
    // The arming init makes the first trigger the tab stop; no walk to the seed.
    expect(triggers.map((trigger) => trigger.tabIndex)).toEqual([0, -1, -1]);
    triggers[0]!.focus();
    pressKey(triggers[0]!, "ArrowDown");
    expect(document.activeElement).toBe(triggers[1]!);
    // Focus never toggles: the seeded-open beta stays open under the moved focus.
    expect(triggers[1]!.getAttribute("data-state")).toBe("open");
    expect(triggers.map((trigger) => trigger.tabIndex)).toEqual([-1, 0, -1]);
    pressKey(triggers[1]!, "ArrowDown");
    expect(document.activeElement).toBe(triggers[2]!);
    pressKey(triggers[2]!, "ArrowUp");
    expect(document.activeElement).toBe(triggers[1]!);
    pressKey(triggers[1]!, "Home");
    expect(document.activeElement).toBe(triggers[0]!);
    pressKey(triggers[0]!, "End");
    expect(document.activeElement).toBe(triggers[2]!);
    expect(triggers[2]!.getAttribute("data-state")).toBe("closed");
  });

  test("a disabled trigger is a click no-op with aria-disabled and drops out of the walk", async () => {
    const onValueChange = vi.fn((value: string | string[]) => value);
    const parts = accordion({ onValueChange, defaultValue: "gamma" });
    const { root, triggers } = mountItems(parts, { disabled: true });
    await awaitWiring(root);
    expect(triggers[0]!.getAttribute("aria-disabled")).toBe("true");
    expect(triggers[0]!.hasAttribute("disabled")).toBe(true);
    triggers[0]!.dispatchEvent(new Event("click"));
    flush();
    expect(onValueChange).not.toHaveBeenCalled();
    expect(triggers[0]!.getAttribute("data-state")).toBe("closed");
    triggers[1]!.focus();
    pressKey(triggers[1]!, "ArrowUp");
    expect(document.activeElement).toBe(triggers[2]!);
  });

  test("the aria id cycle pairs each trigger with its value-keyed region", () => {
    const parts = accordion({ defaultValue: "alpha" });
    const { triggers, contents } = mountItems(parts);
    const values = ["alpha", "beta", "gamma"];
    for (let i = 0; i < values.length; i++) {
      expect(triggers[i]!.id).toBe(`hella-accordion-trigger-${values[i]}`);
      expect(triggers[i]!.getAttribute("aria-controls")).toBe(
        `hella-accordion-content-${values[i]}`,
      );
      expect(contents[i]!.id).toBe(`hella-accordion-content-${values[i]}`);
      expect(contents[i]!.getAttribute("aria-labelledby")).toBe(
        `hella-accordion-trigger-${values[i]}`,
      );
      expect(contents[i]!.getAttribute("role")).toBe("region");
      expect(contents[i]!.getAttribute("data-slot")).toBe("accordion-content");
    }
  });

  test("root disposal stops the roving wiring", async () => {
    const parts = accordion({ defaultValue: "alpha" });
    const { root, triggers } = mountItems(parts);
    await awaitWiring(root);
    triggers[0]!.focus();
    root.remove();
    for (let i = 0; i < 50; i++) {
      if (!peekState(root)) break;
      await delay();
    }
    expect(peekState(root)).toBeUndefined();
    const before = document.activeElement;
    pressKey(triggers[0]!, "ArrowRight");
    expect(document.activeElement).toBe(before);
  });

  test("active and onToggle overrides apply for manual composition", () => {
    const onToggle = vi.fn(() => {});
    const parts = accordion();
    const trigger = mountPart(
      parts.Trigger({ value: "solo", active: true, onToggle, children: "Solo" }),
    );
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("data-state")).toBe("open");
    trigger.dispatchEvent(new Event("click"));
    flush();
    expect(onToggle).toHaveBeenCalledTimes(1);
    const content = mountPart(
      parts.Content({ value: "solo", active: () => false, children: "Solo body" }),
    );
    expect(content.getAttribute("id")).toBe("hella-accordion-content-solo");
    expect(content.getAttribute("aria-labelledby")).toBe("hella-accordion-trigger-solo");
    expect(content.getAttribute("data-state")).toBe("closed");
  });
});
