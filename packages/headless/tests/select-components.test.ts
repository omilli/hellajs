import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { select } from "@hellajs/headless";
import { pressKey } from "./helpers";

beforeEach(() => {
  resetTestState();
});

const FRUITS = [
  { value: "apple", label: "Apple" },
  { value: "blueberry", label: "Blueberry" },
  { value: "canteloupe", label: "Canteloupe" },
];

/** Pins a rect on the element - the injectable seam the positioning assertions read through the anchored-layer engine. */
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

/** Polls (microtask hops) until the newest portaled select content finished its observer-driven mount walk. */
async function openContent(): Promise<HTMLElement> {
  for (let i = 0; i < 50; i++) {
    const nodes = document.querySelectorAll("[data-slot='select-content']");
    const node = nodes.length === 0 ? undefined : (nodes[nodes.length - 1] as HTMLElement);
    if (node && peekState(node)?.isMounted) return node;
    await delay();
  }
  throw new Error("portaled select content never mounted");
}

describe("select parts", () => {
  test("the content lands focus on itself when no option exists", async () => {
    const parts = select();
    const container = document.createElement("div");
    document.body.append(container);
    mount(
      parts.Trigger({ children: [parts.Value({}), parts.Content({ children: [] })] }),
      container,
    );
    container.firstElementChild!.dispatchEvent(new Event("click"));
    const content = await openContent();
    expect(document.activeElement).toBe(content);
  });

  test("the content honors id, side, and anchor overrides", async () => {
    const parts = select();
    const container = document.createElement("div");
    document.body.append(container);
    mount(
      parts.Trigger({
        children: [parts.Content({ id: "custom-listbox", side: "top", children: [] })],
      }),
      container,
    );
    pinRect(container.firstElementChild!, 100, 50, 200, 20);
    container.firstElementChild!.dispatchEvent(new Event("click"));
    const content = await openContent();
    expect(content.id).toBe("custom-listbox");
    expect(content.getAttribute("data-side")).toBe("top");
    expect(content.style.top).toBe("94px");
  });

  test("the trigger honors id, size, state, and the open/clear overrides", () => {
    const parts = select({ value: () => "apple" });
    const onOpen = vi.fn(() => {});
    const onClear = vi.fn(() => {});
    const container = document.createElement("div");
    document.body.append(container);
    mount(
      parts.Trigger({
        id: "my-trigger",
        size: "sm",
        state: () => "open",
        onOpen,
        clearable: true,
        onClear,
        hasValue: () => true,
        disabled: true,
      }),
      container,
    );
    const trigger = container.firstElementChild as HTMLButtonElement;
    expect(trigger.id).toBe("my-trigger");
    expect(trigger.getAttribute("data-size")).toBe("sm");
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.disabled).toBe(true);
    trigger.dispatchEvent(new Event("click", { bubbles: true }));
    pressKey(trigger, "ArrowDown");
    expect(onOpen).not.toHaveBeenCalled();
    const clear = trigger.querySelector("[data-slot='select-clear']") as HTMLElement;
    clear.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  test("the trigger chains the user click and reports opens from arrows", () => {
    const parts = select();
    const onOpen = vi.fn(() => {});
    const container = document.createElement("div");
    document.body.append(container);
    const userClick = vi.fn(() => {});
    mount(parts.Trigger({ onOpen, "on:click": userClick }), container);
    const trigger = container.firstElementChild as HTMLElement;
    trigger.dispatchEvent(new Event("click", { bubbles: true }));
    pressKey(trigger, "ArrowUp");
    expect(onOpen).toHaveBeenCalledTimes(2);
    pressKey(trigger, "ArrowLeft");
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(userClick).toHaveBeenCalledTimes(1);
  });

  test("the structural parts render their slots", async () => {
    const parts = select();
    const container = document.createElement("div");
    document.body.append(container);
    mount(
      parts.Trigger({
        children: [
          parts.Content({
            children: [
              parts.Group({ children: [parts.Label({ children: "Fruits" })] }),
              parts.Separator({}),
              parts.ScrollUpButton({}),
              parts.ScrollDownButton({ children: "Down" }),
            ],
          }),
        ],
      }),
      container,
    );
    container.firstElementChild!.dispatchEvent(new Event("click"));
    const content = await openContent();
    expect(content.querySelector("[data-slot='select-group']")).not.toBeNull();
    expect(content.querySelector("[data-slot='select-label']")!.textContent).toBe("Fruits");
    expect(content.querySelector("[data-slot='select-separator']")).not.toBeNull();
    const up = content.querySelector("[data-slot='select-scroll-up-button']")!;
    expect(up.querySelector("svg")).not.toBeNull();
    const down = content.querySelector("[data-slot='select-scroll-down-button']")!;
    expect(down.textContent).toBe("Down");
  });

  test("the Value part shows a static value and the placeholder while empty", () => {
    const parts = select();
    const container = document.createElement("div");
    document.body.append(container);
    mount(parts.Value({ placeholder: "Pick", value: "apple" }), container);
    const valueEl = container.querySelector("[data-slot='select-value']")!;
    expect(valueEl.textContent).toBe("apple");
    expect(valueEl.hasAttribute("data-placeholder")).toBe(false);
    const empty = document.createElement("div");
    document.body.append(empty);
    mount(select().Value({ placeholder: "Pick" }), empty);
    const emptyEl = empty.querySelector("[data-slot='select-value']")!;
    expect(emptyEl.textContent).toBe("Pick");
    expect(emptyEl.hasAttribute("data-placeholder")).toBe(true);
  });

  test("the Item part honors selected, onselect, and the label fallback", () => {
    const parts = select();
    const onSelect = vi.fn(() => {});
    const container = document.createElement("div");
    document.body.append(container);
    mount(
      parts.Item({ value: "apple", label: "Apple", selected: true, onselect: onSelect }),
      container,
    );
    const option = container.querySelector("[role='option']") as HTMLElement;
    expect(option.getAttribute("aria-selected")).toBe("true");
    expect(option.querySelector("[data-slot='select-item-indicator'] svg")).not.toBeNull();
    expect(option.textContent).toContain("Apple");
    option.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(onSelect).toHaveBeenCalledTimes(1);
    const bare = document.createElement("div");
    document.body.append(bare);
    mount(select().Item({ value: "kiwi", children: "Kiwi" }), bare);
    const bareOption = bare.querySelector("[role='option']") as HTMLElement;
    bareOption.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(bareOption.getAttribute("aria-selected")).toBe("true");
  });
});
