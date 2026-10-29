import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { mount } from "@hellajs/dom";
import { combobox } from "@hellajs/headless";

beforeEach(() => {
  resetTestState();
});

const FRUITS = [
  { value: "apple", label: "Apple" },
  { value: "blueberry", label: "Blueberry" },
  { value: "canteloupe", label: "Canteloupe" },
];

describe("combobox parts", () => {
  test("the input renders its value, gate overrides, and disabled affordances", async () => {
    const onToggle = vi.fn(() => {});
    const onClear = vi.fn(() => {});
    const parts = combobox({ items: FRUITS });
    const container = document.createElement("div");
    document.body.append(container);
    mount(
      parts.Input({
        value: () => "typed",
        disabled: true,
        showTrigger: true,
        showClear: true,
        onToggle,
        onClear,
        state: () => "open",
        activeDescendant: () => "custom-id",
      }),
      container,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("typed");
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(input.getAttribute("aria-activedescendant")).toBe("custom-id");
    expect(input.disabled).toBe(true);
    const trigger = container.querySelector("[data-slot='combobox-trigger']") as HTMLButtonElement;
    trigger.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    const clear = container.querySelector("[data-slot='combobox-clear']") as HTMLButtonElement;
    clear.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onClear).toHaveBeenCalledTimes(1);
    // The wrapper without showTrigger renders no addon toggle.
    const plain = combobox({ items: FRUITS });
    const bare = document.createElement("div");
    document.body.append(bare);
    mount(plain.Input({ showTrigger: false }), bare);
    expect(bare.querySelector("[data-slot='combobox-trigger']")).toBeNull();
  });

  test("the Value part renders the joined selection with getter reactivity", () => {
    const current = signal<string[]>(["apple", "blueberry"]);
    const parts = combobox({ items: FRUITS, multiple: true, value: () => current() });
    const container = document.createElement("div");
    document.body.append(container);
    mount(parts.Value({}), container);
    const valueEl = container.querySelector("[data-slot='combobox-value']")!;
    expect(valueEl.textContent).toBe("apple, blueberry");
    current(["canteloupe"]);
    flush();
    expect(valueEl.textContent).toBe("canteloupe");
  });

  test("the Clear part chains the user click and defaults to wiping the selection", () => {
    const onValueChange = vi.fn<(value: string | string[]) => void>(() => {});
    const parts = combobox({ items: FRUITS, onValueChange });
    const container = document.createElement("div");
    document.body.append(container);
    const userClick = vi.fn(() => {});
    mount(parts.Clear({ "on:click": userClick }), container);
    const clear = container.querySelector("[data-slot='combobox-clear']") as HTMLElement;
    clear.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(userClick).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("");
  });

  test("the structural parts render their slots and the Chips parts manage rows", () => {
    const onValueChange = vi.fn<(value: string | string[]) => void>(() => {});
    const parts = combobox({ items: FRUITS, multiple: true, onValueChange });
    const container = document.createElement("div");
    document.body.append(container);
    mount(
      parts.List({
        children: [
          parts.Group({ children: [parts.Label({ children: "Fruits" })] }),
          parts.Separator({}),
          parts.Collection({ children: null }),
          parts.Empty({ children: "Nothing" }),
        ],
      }),
      container,
    );
    expect(container.querySelector("[data-slot='combobox-group']")).not.toBeNull();
    expect(container.querySelector("[data-slot='combobox-label']")!.textContent).toBe("Fruits");
    expect(container.querySelector("[data-slot='combobox-separator']")).not.toBeNull();
    expect(container.querySelector("[data-slot='combobox-collection']")).not.toBeNull();
    expect(container.querySelector("[data-slot='combobox-empty']")!.textContent).toBe("Nothing");

    const chips = document.createElement("div");
    document.body.append(chips);
    mount(parts.Chips({ children: [parts.ChipsInput({})] }), chips);
    expect(chips.querySelectorAll("[data-slot='combobox-chip']")).toHaveLength(0);
    expect(chips.querySelector("[data-slot='combobox-chip-input']")).not.toBeNull();

    const chipRow = document.createElement("div");
    document.body.append(chipRow);
    const onRemove = vi.fn(() => {});
    mount(parts.Chip({ value: "apple", children: "Apple", showRemove: false, onRemove }), chipRow);
    expect(chipRow.querySelector("[data-slot='combobox-chip-remove']")).toBeNull();
    mount(parts.Chip({ value: "kiwi", children: "Kiwi" }), chipRow);
    const remove = chipRow.querySelector("[data-slot='combobox-chip-remove']") as HTMLElement;
    remove.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(onValueChange).toHaveBeenCalledWith(["kiwi"]);
  });

  test("the Item part chains the user click and honors prop overrides", () => {
    const onValueChange = vi.fn<(value: string | string[]) => void>(() => {});
    const parts = combobox({ items: FRUITS, onValueChange });
    const container = document.createElement("div");
    document.body.append(container);
    const userClick = vi.fn(() => {});
    const onSelect = vi.fn(() => {});
    mount(
      parts.Item({
        value: "apple",
        label: "Apple",
        selected: true,
        highlighted: false,
        onselect: onSelect,
        id: "custom-opt",
        "on:click": userClick,
      }),
      container,
    );
    const option = container.querySelector("[role='option']") as HTMLElement;
    expect(option.id).toBe("custom-opt");
    expect(option.getAttribute("aria-selected")).toBe("true");
    expect(option.hasAttribute("data-highlighted")).toBe(false);
    option.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(userClick).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("the List part resolves hidden from its own query and filter props", () => {
    const parts = combobox({ items: FRUITS });
    const container = document.createElement("div");
    document.body.append(container);
    const onselect = vi.fn<(value: string) => void>(() => {});
    mount(
      parts.List({
        id: "list-x",
        items: [...FRUITS],
        query: () => "blu",
        selected: (value) => value === "blueberry",
        active: () => "apple",
        onselect,
        children: [],
      }),
      container,
    );
    const list = container.querySelector("[role='listbox']") as HTMLElement;
    expect(list.id).toBe("list-x");
    const options = [...list.querySelectorAll("[role='option']")] as HTMLElement[];
    expect(options[0]!.style.display).toBe("none");
    expect(options[1]!.style.display).toBe("");
    expect(options[1]!.getAttribute("aria-selected")).toBe("true");
    expect(options[0]!.hasAttribute("data-highlighted")).toBe(true);
    options[1]!.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(onselect).toHaveBeenCalledWith("blueberry");
  });
});
