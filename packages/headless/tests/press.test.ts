import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { toggle, checkbox, toggleSwitch, toggleGroup, radioGroup } from "@hellajs/headless";
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

describe("press family", () => {
  test("an uncontrolled toggle flips aria-pressed and data-state on click", () => {
    const root = mountPart(toggle().Root({ id: "bold-toggle", children: "Bold" }));
    expect(root.id).toBe("bold-toggle");
    expect(root.getAttribute("aria-pressed")).toBe("false");
    expect(root.getAttribute("data-state")).toBe("off");
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-pressed")).toBe("true");
    expect(root.getAttribute("data-state")).toBe("on");
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-pressed")).toBe("false");
    expect(root.getAttribute("data-state")).toBe("off");
  });

  test("an uncontrolled toggle seeds its state from a boolean pressed", () => {
    const root = mountPart(toggle({ pressed: true }).Root({ children: "Bold" }));
    expect(root.getAttribute("aria-pressed")).toBe("true");
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-pressed")).toBe("false");
  });

  test("a controlled toggle reports onPressedChange without writing the accessor", () => {
    const pressed = signal(false);
    const onPressedChange = vi.fn((value: boolean) => value);
    const root = mountPart(
      toggle({ pressed: () => pressed(), onPressedChange }).Root({ children: "Bold" }),
    );
    root.dispatchEvent(new Event("click"));
    expect(onPressedChange).toHaveBeenCalledTimes(1);
    expect(onPressedChange.mock.calls[0]).toEqual([true]);
    expect(root.getAttribute("aria-pressed")).toBe("false");
    pressed(true);
    flush();
    expect(root.getAttribute("aria-pressed")).toBe("true");
  });

  test("a disabled toggle blocks clicks and renders the disabled attribute", () => {
    const onPressedChange = vi.fn((value: boolean) => value);
    const root = mountPart(toggle({ onPressedChange }).Root({ disabled: true, children: "Bold" }));
    expect(root.hasAttribute("disabled")).toBe(true);
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-pressed")).toBe("false");
    expect(onPressedChange).not.toHaveBeenCalled();
  });

  test("a toggle chains a user on:click before the owned press", () => {
    const userClick = vi.fn(function (this: HTMLElement, e: Event) {
      void e;
    });
    const root = mountPart(toggle().Root({ "on:click": userClick, children: "Bold" }));
    root.dispatchEvent(new Event("click"));
    expect(userClick).toHaveBeenCalledTimes(1);
    expect(root.getAttribute("aria-pressed")).toBe("true");
  });

  test("an uncontrolled checkbox cycles aria-checked and data-state with its indicator icon", () => {
    const onCheckedChange = vi.fn((value: boolean) => value);
    const parts = checkbox({ onCheckedChange });
    const root = mountPart(
      parts.Root({
        title: "terms",
        children: parts.Indicator({ title: "terms-indicator", children: "icon" }),
      }),
    );
    expect(root.getAttribute("title")).toBe("terms");
    expect(root.getAttribute("role")).toBe("checkbox");
    expect(root.getAttribute("aria-checked")).toBe("false");
    expect(root.getAttribute("data-state")).toBe("unchecked");
    expect(root.textContent).not.toContain("icon");
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-checked")).toBe("true");
    expect(root.getAttribute("data-state")).toBe("checked");
    expect(root.textContent).toContain("icon");
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange.mock.calls[0]).toEqual([true]);
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-checked")).toBe("false");
    expect(root.textContent).not.toContain("icon");
  });

  test("an uncontrolled checkbox seeds indeterminate and lands checked on click", () => {
    const onCheckedChange = vi.fn((value: boolean) => value);
    const parts = checkbox({ indeterminate: true, onCheckedChange });
    const root = mountPart(parts.Root({ children: parts.Indicator({}) }));
    expect(root.getAttribute("aria-checked")).toBe("mixed");
    expect(root.getAttribute("data-state")).toBe("indeterminate");
    expect(root.querySelector("[data-slot='checkbox-check-icon']")).not.toBeNull();
    root.dispatchEvent(new Event("click"));
    expect(onCheckedChange.mock.calls[0]).toEqual([true]);
    expect(root.getAttribute("aria-checked")).toBe("true");
    expect(root.getAttribute("data-state")).toBe("checked");
  });

  test("a controlled indeterminate accessor stays mixed across clicks", () => {
    const parts = checkbox({ checked: () => false, indeterminate: () => true });
    const root = mountPart(parts.Root({ children: parts.Indicator({}) }));
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-checked")).toBe("mixed");
    expect(root.getAttribute("data-state")).toBe("indeterminate");
  });

  test("a controlled checkbox reports onCheckedChange without writing the accessor", () => {
    const checked = signal(false);
    const onCheckedChange = vi.fn((value: boolean) => value);
    const parts = checkbox({ checked: () => checked(), onCheckedChange });
    const root = mountPart(parts.Root({ children: parts.Indicator({}) }));
    root.dispatchEvent(new Event("click"));
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange.mock.calls[0]).toEqual([true]);
    expect(root.getAttribute("aria-checked")).toBe("false");
    checked(true);
    flush();
    expect(root.getAttribute("aria-checked")).toBe("true");
  });

  test("a disabled checkbox blocks clicks", () => {
    const onCheckedChange = vi.fn((value: boolean) => value);
    const root = mountPart(checkbox({ onCheckedChange }).Root({ disabled: true }));
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-checked")).toBe("false");
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  test("the checkbox indicator renders its default icon while checked", () => {
    const parts = checkbox({ checked: true });
    const root = mountPart(parts.Root({ children: parts.Indicator({}) }));
    expect(root.querySelector("[data-slot='checkbox-check-icon']")).not.toBeNull();
  });

  test("an uncontrolled switch toggles role=switch state and its thumb", () => {
    const onCheckedChange = vi.fn((value: boolean) => value);
    const parts = toggleSwitch({ onCheckedChange });
    const root = mountPart(
      parts.Root({ title: "power", children: parts.Indicator({ title: "power-thumb" }) }),
    );
    const thumb = root.querySelector("[data-slot='switch-thumb']") as HTMLElement;
    expect(root.getAttribute("title")).toBe("power");
    expect(thumb.getAttribute("title")).toBe("power-thumb");
    expect(root.getAttribute("role")).toBe("switch");
    expect(root.getAttribute("aria-checked")).toBe("false");
    expect(thumb.getAttribute("data-state")).toBe("unchecked");
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-checked")).toBe("true");
    expect(root.getAttribute("data-state")).toBe("checked");
    expect(thumb.getAttribute("data-state")).toBe("checked");
    expect(onCheckedChange.mock.calls[0]).toEqual([true]);
  });

  test("a controlled switch reports onCheckedChange without writing the accessor", () => {
    const checked = signal(true);
    const onCheckedChange = vi.fn((value: boolean) => value);
    const root = mountPart(toggleSwitch({ checked: () => checked(), onCheckedChange }).Root({}));
    root.dispatchEvent(new Event("click"));
    expect(onCheckedChange.mock.calls.at(-1)).toEqual([false]);
    expect(root.getAttribute("aria-checked")).toBe("true");
    checked(false);
    flush();
    expect(root.getAttribute("aria-checked")).toBe("false");
  });

  test("a switch is a native button so platform activation drives the toggle", () => {
    const root = mountPart(toggleSwitch().Root({}));
    expect(root.tagName).toBe("BUTTON");
    expect(root.getAttribute("type")).toBe("button");
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-checked")).toBe("true");
  });

  test("a disabled switch blocks clicks", () => {
    const onCheckedChange = vi.fn((value: boolean) => value);
    const root = mountPart(toggleSwitch({ onCheckedChange }).Root({ disabled: true }));
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-checked")).toBe("false");
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  test("single-mode exclusion keeps one active value and deselects on re-click", () => {
    const onValueChange = vi.fn((value: string | string[]) => value);
    const parts = toggleGroup({ onValueChange });
    const root = mountPart(
      parts.Root({
        title: "styles",
        children: [parts.Item({ value: "bold", title: "bold-item", children: "Bold" })],
      }),
    );
    const item = root.querySelector("[data-slot='toggle-group-item']") as HTMLElement;
    expect(root.getAttribute("title")).toBe("styles");
    expect(item.getAttribute("title")).toBe("bold-item");
    item.dispatchEvent(new Event("click"));
    expect(onValueChange.mock.calls[0]).toEqual(["bold"]);
    expect(item.getAttribute("data-state")).toBe("on");
    item.dispatchEvent(new Event("click"));
    expect(onValueChange.mock.calls[1]).toEqual([""]);
    expect(item.getAttribute("data-state")).toBe("off");
  });

  test("multiple-mode membership toggles report the full active array", () => {
    const onValueChange = vi.fn((value: string | string[]) => value);
    const parts = toggleGroup({ multiple: true, onValueChange });
    const root = mountPart(
      parts.Root({
        children: [
          parts.Item({ value: "bold", children: "Bold" }),
          parts.Item({ value: "italic", children: "Italic" }),
        ],
      }),
    );
    const items = Array.from(
      root.querySelectorAll("[data-slot='toggle-group-item']"),
    ) as HTMLElement[];
    items[0]!.dispatchEvent(new Event("click"));
    expect(onValueChange.mock.calls[0]).toEqual([["bold"]]);
    items[1]!.dispatchEvent(new Event("click"));
    expect(onValueChange.mock.calls[1]).toEqual([["bold", "italic"]]);
    items[0]!.dispatchEvent(new Event("click"));
    expect(onValueChange.mock.calls[2]).toEqual([["italic"]]);
  });

  test("seeded defaults land the uncontrolled group state at first read", () => {
    const single = toggleGroup({ defaultValue: "bold" });
    const singleRoot = mountPart(
      single.Root({ children: [single.Item({ value: "bold", children: "Bold" })] }),
    );
    expect(
      singleRoot.querySelector("[data-slot='toggle-group-item']")!.getAttribute("data-state"),
    ).toBe("on");
    const multiple = toggleGroup({ multiple: true, defaultValues: ["bold", "italic"] });
    const multipleRoot = mountPart(
      multiple.Root({
        children: [
          multiple.Item({ value: "bold", children: "Bold" }),
          multiple.Item({ value: "italic", children: "Italic" }),
          multiple.Item({ value: "underline", children: "Underline" }),
        ],
      }),
    );
    const states = Array.from(multipleRoot.querySelectorAll("[data-slot='toggle-group-item']")).map(
      (item) => item.getAttribute("data-state"),
    );
    expect(states).toEqual(["on", "on", "off"]);
  });

  test("a controlled single value reports requests without writing the accessor", () => {
    const value = signal("bold");
    const onValueChange = vi.fn((value: string | string[]) => value);
    const parts = toggleGroup({ value: () => value(), onValueChange });
    const root = mountPart(
      parts.Root({ children: [parts.Item({ value: "bold", children: "Bold" })] }),
    );
    const item = root.querySelector("[data-slot='toggle-group-item']") as HTMLElement;
    expect(item.getAttribute("data-state")).toBe("on");
    item.dispatchEvent(new Event("click"));
    expect(onValueChange.mock.calls[0]).toEqual([""]);
    expect(item.getAttribute("data-state")).toBe("on");
    value("");
    flush();
    expect(item.getAttribute("data-state")).toBe("off");
  });

  test("arrow keys rove focus and tabindex without changing selection", async () => {
    const onValueChange = vi.fn((value: string | string[]) => value);
    const parts = toggleGroup({ onValueChange });
    const root = mountPart(
      parts.Root({
        children: [
          parts.Item({ value: "bold", children: "Bold" }),
          parts.Item({ value: "italic", children: "Italic" }),
          parts.Item({ value: "underline", children: "Underline" }),
        ],
      }),
    );
    const items = Array.from(
      root.querySelectorAll("[data-slot='toggle-group-item']"),
    ) as HTMLElement[];
    await awaitWiring(root);
    items[0]!.focus();
    pressKey(items[0]!, "ArrowRight");
    expect(document.activeElement).toBe(items[1]!);
    expect(items.map((item) => item.tabIndex)).toEqual([-1, 0, -1]);
    expect(onValueChange).not.toHaveBeenCalled();
    pressKey(items[1]!, "ArrowRight");
    expect(document.activeElement).toBe(items[2]!);
    pressKey(items[2]!, "ArrowLeft");
    expect(document.activeElement).toBe(items[1]!);
  });

  test("disabled items drop out of the arrow walk and block clicks", async () => {
    const onValueChange = vi.fn((value: string | string[]) => value);
    const parts = toggleGroup({ onValueChange });
    const root = mountPart(
      parts.Root({
        children: [
          parts.Item({ value: "bold", children: "Bold" }),
          parts.Item({ value: "italic", children: "Italic", disabled: true }),
        ],
      }),
    );
    const items = Array.from(
      root.querySelectorAll("[data-slot='toggle-group-item']"),
    ) as HTMLElement[];
    await awaitWiring(root);
    expect(items[1]!.hasAttribute("disabled")).toBe(true);
    items[0]!.focus();
    pressKey(items[0]!, "ArrowRight");
    expect(document.activeElement).toBe(items[0]!);
    items[1]!.dispatchEvent(new Event("click"));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("an item's pressed and onSelect overrides apply for manual composition", () => {
    const onSelect = vi.fn(() => {});
    const parts = toggleGroup();
    const root = mountPart(
      parts.Item({ value: "solo", pressed: () => true, onSelect, children: "Solo" }),
    );
    expect(root.getAttribute("aria-pressed")).toBe("true");
    expect(root.getAttribute("data-state")).toBe("on");
    root.dispatchEvent(new Event("click"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test("group disposal stops the roving wiring and delegated clicks", async () => {
    const onValueChange = vi.fn((value: string | string[]) => value);
    const parts = toggleGroup({ onValueChange });
    const root = mountPart(
      parts.Root({
        children: [
          parts.Item({ value: "bold", children: "Bold" }),
          parts.Item({ value: "italic", children: "Italic" }),
        ],
      }),
    );
    const items = Array.from(
      root.querySelectorAll("[data-slot='toggle-group-item']"),
    ) as HTMLElement[];
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

  test("an uncontrolled radio group selects exclusively and never unsets", () => {
    const onValueChange = vi.fn((value: string) => value);
    const parts = radioGroup({ onValueChange });
    const root = mountPart(
      parts.Root({
        title: "plan",
        children: [
          parts.Item({
            value: "alpha",
            title: "alpha-item",
            children: parts.Indicator({ value: "alpha", title: "alpha-indicator" }),
          }),
          parts.Item({ value: "beta", children: parts.Indicator({ value: "beta" }) }),
        ],
      }),
    );
    expect(root.getAttribute("title")).toBe("plan");
    expect(root.querySelector("[title='alpha-indicator']")).not.toBeNull();
    const items = Array.from(root.querySelectorAll("[role='radio']")) as HTMLElement[];
    expect(items[0]!.getAttribute("title")).toBe("alpha-item");
    items[1]!.dispatchEvent(new Event("click"));
    expect(onValueChange.mock.calls[0]).toEqual(["beta"]);
    expect(items.map((item) => item.getAttribute("aria-checked"))).toEqual(["false", "true"]);
    expect(items[1]!.querySelector("[data-slot='radio-group-icon']")).not.toBeNull();
    items[1]!.dispatchEvent(new Event("click"));
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  test("a controlled radio group reports requests without writing the accessor", () => {
    const value = signal("alpha");
    const onValueChange = vi.fn((value: string) => value);
    const parts = radioGroup({ value: () => value(), onValueChange });
    const root = mountPart(
      parts.Root({
        children: [
          parts.Item({ value: "alpha", children: parts.Indicator({ value: "alpha" }) }),
          parts.Item({ value: "beta", children: parts.Indicator({ value: "beta" }) }),
        ],
      }),
    );
    const items = Array.from(root.querySelectorAll("[role='radio']")) as HTMLElement[];
    items[1]!.dispatchEvent(new Event("click"));
    expect(onValueChange.mock.calls[0]).toEqual(["beta"]);
    expect(items.map((item) => item.getAttribute("aria-checked"))).toEqual(["true", "false"]);
    value("beta");
    flush();
    expect(items.map((item) => item.getAttribute("aria-checked"))).toEqual(["false", "true"]);
  });

  test("arrows move focus and select the landed radio with wrap-around", async () => {
    const onValueChange = vi.fn((value: string) => value);
    const parts = radioGroup({ value: () => "alpha", onValueChange });
    const root = mountPart(
      parts.Root({
        children: [
          parts.Item({ value: "alpha", children: parts.Indicator({ value: "alpha" }) }),
          parts.Item({ value: "beta", children: parts.Indicator({ value: "beta" }) }),
          parts.Item({ value: "gamma", children: parts.Indicator({ value: "gamma" }) }),
        ],
      }),
    );
    const items = Array.from(root.querySelectorAll("[role='radio']")) as HTMLElement[];
    await awaitWiring(root);
    items[0]!.focus();
    pressKey(items[0]!, "ArrowRight");
    expect(document.activeElement).toBe(items[1]!);
    expect(onValueChange.mock.calls.at(-1)).toEqual(["beta"]);
    expect(items.map((item) => item.tabIndex)).toEqual([-1, 0, -1]);
    pressKey(items[1]!, "ArrowRight");
    expect(document.activeElement).toBe(items[2]!);
    pressKey(items[2]!, "ArrowLeft");
    expect(document.activeElement).toBe(items[1]!);
    items[0]!.focus();
    pressKey(items[0]!, "ArrowUp");
    expect(document.activeElement).toBe(items[2]!);
  });

  test("the selection lands the tabindex walk at mount", async () => {
    const parts = radioGroup({ value: () => "beta" });
    const root = mountPart(
      parts.Root({
        children: [
          parts.Item({ value: "alpha", children: parts.Indicator({ value: "alpha" }) }),
          parts.Item({ value: "beta", children: parts.Indicator({ value: "beta" }) }),
          parts.Item({ value: "gamma", children: parts.Indicator({ value: "gamma" }) }),
        ],
      }),
    );
    const items = Array.from(root.querySelectorAll("[role='radio']")) as HTMLElement[];
    await awaitWiring(root);
    expect(items.map((item) => item.tabIndex)).toEqual([-1, 0, -1]);
  });

  test("disabled radios drop out of the arrow walk and block clicks", async () => {
    const onValueChange = vi.fn((value: string) => value);
    const parts = radioGroup({ value: () => "alpha", onValueChange });
    const root = mountPart(
      parts.Root({
        children: [
          parts.Item({ value: "alpha", children: parts.Indicator({ value: "alpha" }) }),
          parts.Item({
            value: "beta",
            disabled: true,
            children: parts.Indicator({ value: "beta" }),
          }),
        ],
      }),
    );
    const items = Array.from(root.querySelectorAll("[role='radio']")) as HTMLElement[];
    await awaitWiring(root);
    // Non-radio focusins and disabled radios never drive the selection.
    root.dispatchEvent(new FocusEvent("focusin"));
    expect(onValueChange).not.toHaveBeenCalled();
    items[1]!.focus();
    expect(onValueChange).not.toHaveBeenCalled();
    expect(items[1]!.getAttribute("aria-checked")).toBe("false");
    expect(items[1]!.hasAttribute("disabled")).toBe(true);
    items[0]!.focus();
    pressKey(items[0]!, "ArrowRight");
    expect(document.activeElement).toBe(items[0]!);
    items[1]!.dispatchEvent(new Event("click"));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("orientation renders aria-orientation and scopes the arrow axis", async () => {
    const parts = radioGroup({ orientation: "vertical" });
    const root = mountPart(
      parts.Root({
        children: [
          parts.Item({ value: "alpha", children: parts.Indicator({ value: "alpha" }) }),
          parts.Item({ value: "beta", children: parts.Indicator({ value: "beta" }) }),
        ],
      }),
    );
    const items = Array.from(root.querySelectorAll("[role='radio']")) as HTMLElement[];
    await awaitWiring(root);
    expect(root.getAttribute("aria-orientation")).toBe("vertical");
    items[0]!.focus();
    pressKey(items[0]!, "ArrowRight");
    expect(document.activeElement).toBe(items[0]!);
    pressKey(items[0]!, "ArrowDown");
    expect(document.activeElement).toBe(items[1]!);
  });

  test("an item's checked and onSelect overrides apply for manual composition", () => {
    const onSelect = vi.fn(() => {});
    const parts = radioGroup();
    const root = mountPart(
      parts.Item({
        value: "solo",
        name: "plan",
        checked: () => true,
        onSelect,
        children: parts.Indicator({ checked: () => true, children: "dot" }),
      }),
    );
    expect(root.getAttribute("role")).toBe("radio");
    expect(root.getAttribute("name")).toBe("plan");
    expect(root.getAttribute("aria-checked")).toBe("true");
    expect(root.getAttribute("data-state")).toBe("checked");
    expect(root.textContent).toContain("dot");
    root.dispatchEvent(new Event("click"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  test("radio disposal stops the roving, selection, and focus wiring", async () => {
    const onValueChange = vi.fn((value: string) => value);
    const parts = radioGroup({ value: () => "alpha", onValueChange });
    const root = mountPart(
      parts.Root({
        children: [
          parts.Item({ value: "alpha", children: parts.Indicator({ value: "alpha" }) }),
          parts.Item({ value: "beta", children: parts.Indicator({ value: "beta" }) }),
        ],
      }),
    );
    const items = Array.from(root.querySelectorAll("[role='radio']")) as HTMLElement[];
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
