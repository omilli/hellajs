import { describe, test, expect, beforeEach, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import {
  assertStructuralParity,
  comboboxModules,
  comboboxPartVariants,
  comboboxVariants,
  menuModulePart,
  renderVariant,
  type ComboboxEntryVariant,
  type ComponentVariant,
  type ComboboxVariantProps,
} from "./helpers/variants";
import {
  awaitDetached,
  awaitPortaled,
  pinRect,
  pointerDownOutside,
  pressEscape,
  pressKey,
} from "./helpers/anchored";

beforeEach(() => {
  resetTestState();
});

const FRUITS = [
  { value: "apple", label: "Apple" },
  { value: "blueberry", label: "Blueberry" },
  { value: "canteloupe", label: "Canteloupe" },
];

/** The query input of a rendered combobox root (single or multiple). */
const queryInput = (root: Element): HTMLInputElement =>
  root.querySelector("input") as HTMLInputElement;

/** Opens the combobox by focusing the input and resolves the portaled panel once the mount walk finished. */
async function openCombobox(variant: ComponentVariant<ComboboxVariantProps>, props: ComboboxVariantProps = {}) {
  const onValueChange = mock<(value: string | string[]) => void>(() => {});
  const root = renderVariant(variant, { items: FRUITS, onValueChange, ...props });
  const input = queryInput(root);
  input.dispatchEvent(new Event("focus"));
  const content = await awaitPortaled("combobox-content");
  return { onValueChange, root, input, content };
}

/** Types a query into the input (value then a bubbling input event). */
const type = (input: HTMLInputElement, value: string): void => {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("combobox", () => {
  test.each(comboboxVariants)("$format/$style opens on input focus with combobox aria on the input", async (variant) => {
    const { input, content } = await openCombobox(variant);
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.getAttribute("role")).toBeNull();
    expect(input.getAttribute("role")).toBe("combobox");
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(input.getAttribute("aria-controls")).toBe(content.querySelector("[role='listbox']")!.id);
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
  });

  test.each(comboboxVariants)("$format/$style renders all options once, listbox roles, and anchors to the wrapper", async (variant) => {
    const { root, content } = await openCombobox(variant);
    const list = content.querySelector("[role='listbox']")!;
    const options = [...list.querySelectorAll("[role='option']")];
    expect(options).toHaveLength(3);
    expect(root.contains(list)).toBe(false);
    expect(content.getAttribute("data-side")).toBe("bottom");
  });

  test.each(comboboxVariants)("$format/$style filters case-insensitively by hiding non-matches", async (variant) => {
    const { input, content } = await openCombobox(variant);
    type(input, "BLU");
    await delay();
    const options = [...content.querySelectorAll("[role='option']")];
    expect(options).toHaveLength(3);
    const visible = options.filter((el) => (el as HTMLElement).style.display !== "none");
    expect(visible).toHaveLength(1);
    expect(visible[0]!.getAttribute("data-value")).toBe("blueberry");
    expect(content.hasAttribute("data-empty")).toBe(false);
  });

  test.each(comboboxVariants)("$format/$style marks the panel empty on zero matches", async (variant) => {
    const { input, content } = await openCombobox(variant);
    type(input, "zzz");
    await delay();
    expect(content.hasAttribute("data-empty")).toBe(true);
    expect(content.querySelector("[data-slot='combobox-empty']")!.textContent).toBe("No items found.");
  });

  test.each(comboboxVariants)("$format/$style roves arrows over data-highlighted and reports aria-activedescendant", async (variant) => {
    const { input, content } = await openCombobox(variant);
    const options = [...content.querySelectorAll("[role='option']")] as HTMLElement[];
    expect(options[0]!.hasAttribute("data-highlighted")).toBe(true);
    expect(input.getAttribute("aria-activedescendant")).toBe(options[0]!.id);
    pressKey(input, "ArrowDown");
    expect(options[1]!.hasAttribute("data-highlighted")).toBe(true);
    expect(options[0]!.hasAttribute("data-highlighted")).toBe(false);
    expect(input.getAttribute("aria-activedescendant")).toBe(options[1]!.id);
    pressKey(input, "ArrowUp");
    pressKey(input, "ArrowUp");
    expect(input.getAttribute("aria-activedescendant")).toBe(options[2]!.id);
    pressKey(input, "ArrowDown");
    expect(input.getAttribute("aria-activedescendant")).toBe(options[0]!.id);
  });

  test.each(comboboxVariants)("$format/$style selects on Enter, closes, and clears the query", async (variant) => {
    const { onValueChange, input, content } = await openCombobox(variant);
    pressKey(input, "Enter");
    expect(onValueChange).toHaveBeenCalledWith("apple");
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.value).toBe("");
  });

  test.each(comboboxVariants)("$format/$style selects the active option after typing, with its check state", async (variant) => {
    const onValueChange = mock<(value: string | string[]) => void>(() => {});
    const current = signal("blueberry");
    const root = renderVariant(variant, {
      items: FRUITS,
      value: () => current(),
      onValueChange: (next) => {
        current(next as string);
        onValueChange(next);
      },
    });
    const input = queryInput(root);
    input.dispatchEvent(new Event("focus"));
    const content = await awaitPortaled("combobox-content");
    const selected = content.querySelector("[aria-selected='true']")!;
    expect(selected.getAttribute("data-state")).toBe("checked");
    expect(selected.querySelector("[data-slot='combobox-item-indicator'] svg")).not.toBeNull();
    type(input, "blue");
    await delay();
    pressKey(input, "Enter");
    expect(onValueChange).toHaveBeenCalledWith("blueberry");
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(comboboxVariants)("$format/$style moves the active option through typeahead", async (variant) => {
    const { input, content } = await openCombobox(variant);
    // Real typing: the printable keydown buffers the typeahead query, then
    // the input event updates the filter.
    pressKey(input, "c");
    type(input, "c");
    await delay();
    const options = [...content.querySelectorAll("[role='option']")] as HTMLElement[];
    const active = options.find((el) => el.hasAttribute("data-highlighted"))!;
    expect(active.getAttribute("data-value")).toBe("canteloupe");
    expect(input.getAttribute("aria-activedescendant")).toBe(active.id);
  });

  test.each(comboboxVariants)("$format/$style clears the query on Escape and then closes", async (variant) => {
    const { input, content } = await openCombobox(variant);
    type(input, "blu");
    await delay();
    // Escape fires at the input (the typing position) and bubbles to the
    // document capture listener that owns the layered dismissal.
    pressKey(input, "Escape");
    expect(input.value).toBe("");
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(comboboxVariants)("$format/$style closes on an outside pointerdown", async (variant) => {
    const { content } = await openCombobox(variant);
    pointerDownOutside();
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(comboboxVariants)("$format/$style toggles through the addon trigger button", async (variant) => {
    const { root, input, content } = await openCombobox(variant);
    const trigger = root.querySelector("[data-slot='combobox-trigger']")!;
    expect(trigger).not.toBeNull();
    trigger.dispatchEvent(new Event("click", { bubbles: true }));
    expect(content.getAttribute("data-state")).toBe("closed");
    trigger.dispatchEvent(new Event("click", { bubbles: true }));
    expect(content.getAttribute("data-state")).toBe("open");
    expect(document.activeElement).not.toBeNull();
    expect(input.getAttribute("aria-expanded")).toBe("true");
  });

  test.each(comboboxVariants)("$format/$style wipes the selection through the clear button", async (variant) => {
    const onValueChange = mock<(value: string | string[]) => void>(() => {});
    const current = signal("apple");
    const root = renderVariant(variant, {
      items: FRUITS,
      showClear: true,
      value: () => current(),
      onValueChange: (next) => {
        current(next as string);
        onValueChange(next);
      },
    });
    const clear = root.querySelector("[data-slot='combobox-clear']")!;
    expect(clear).not.toBeNull();
    clear.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onValueChange).toHaveBeenCalledWith("");
  });

  test.each(comboboxVariants)("$format/$style respects a custom filter", async (variant) => {
    const startsWith = (items: ComboboxEntryVariant[], query: string): ComboboxEntryVariant[] =>
      query ? items.filter((entry) => entry.value.startsWith(query)) : items;
    const { input, content } = await openCombobox(variant, { filter: startsWith });
    type(input, "ap");
    await delay();
    const visible = [...content.querySelectorAll("[role='option']")].filter(
      (el) => (el as HTMLElement).style.display !== "none",
    );
    expect(visible).toHaveLength(1);
    expect(visible[0]!.getAttribute("data-value")).toBe("apple");
  });

  test.each(comboboxVariants)("$format/$style toggles multiple selections and keeps the panel open", async (variant) => {
    const { onValueChange, input, content } = await openCombobox(variant, { multiple: true });
    pressKey(input, "Enter");
    expect(onValueChange).toHaveBeenCalledWith(["apple"]);
    expect(content.getAttribute("data-state")).toBe("open");
    expect(input.value).toBe("");
    pressKey(input, "Enter");
    expect(onValueChange).toHaveBeenLastCalledWith([]);
  });

  test.each(comboboxVariants)("$format/$style renders chips for multiple selections and removes through the chip button", async (variant) => {
    const onValueChange = mock<(value: string | string[]) => void>(() => {});
    const current = signal<string[]>([]);
    const root = renderVariant(variant, {
      items: FRUITS,
      multiple: true,
      value: () => current(),
      onValueChange: (next) => {
        current(next as string[]);
        onValueChange(next);
      },
    });
    const input = queryInput(root);
    input.dispatchEvent(new Event("focus"));
    await awaitPortaled("combobox-content");
    current(["apple", "blueberry"]);
    await delay();
    const chips = [...root.querySelectorAll("[data-slot='combobox-chip']")];
    expect(chips).toHaveLength(2);
    expect(chips[0]!.getAttribute("data-value")).toBe("apple");
    expect(chips[0]!.textContent).toContain("Apple");
    const remove = chips[0]!.querySelector("[data-slot='combobox-chip-remove']")!;
    remove.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onValueChange).toHaveBeenCalledWith(["blueberry"]);
    await delay();
    expect(root.querySelectorAll("[data-slot='combobox-chip']")).toHaveLength(1);
  });

  test.each(comboboxVariants)("$format/$style marks chip-mode panels with data-chips", async (variant) => {
    const { content } = await openCombobox(variant, { multiple: true });
    expect(content.getAttribute("data-chips")).toBe("true");
  });

  test.each(comboboxVariants)("$format/$style respects a controlled value accessor", async (variant) => {
    const onValueChange = mock<(value: string | string[]) => void>(() => {});
    const current = signal("");
    const root = renderVariant(variant, {
      items: FRUITS,
      value: () => current(),
      onValueChange: (next) => onValueChange(next),
    });
    const input = queryInput(root);
    input.dispatchEvent(new Event("focus"));
    const content = await awaitPortaled("combobox-content");
    pressKey(input, "Enter");
    expect(onValueChange).toHaveBeenCalledWith("apple");
    expect(current()).toBe("");
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(comboboxVariants)("$format/$style reopens cleanly across open and close cycles", async (variant) => {
    const root = renderVariant(variant, { items: FRUITS });
    const input = queryInput(root);
    input.dispatchEvent(new Event("focus"));
    const first = await awaitPortaled("combobox-content");
    pressEscape();
    expect(first.getAttribute("data-state")).toBe("closed");
    first.dispatchEvent(new Event("animationend"));
    await awaitDetached(first);
    input.dispatchEvent(new Event("focus"));
    const second = await awaitPortaled("combobox-content");
    expect(second).not.toBe(first);
    expect(second.getAttribute("data-state")).toBe("open");
  });

  test.each(comboboxVariants)("$format/$style unmounts every layer on disposal and drains its wirings", async (variant) => {
    const container = setupContainer();
    const handle = mount(variant.render({ items: FRUITS }), container);
    const root = container.firstElementChild as HTMLElement;
    expect(peekState(root)?.isMounted).toBe(true);
    const input = queryInput(root);
    input.dispatchEvent(new Event("focus"));
    const content = await awaitPortaled("combobox-content");
    handle.unmount();
    await awaitDetached(content);
    expect(root.isConnected).toBe(false);
    pressEscape();
    pointerDownOutside();
    expect(content.isConnected).toBe(false);
  });

  test.each(comboboxVariants)("$format/$style opens with ArrowDown while closed", async (variant) => {
    const root = renderVariant(variant, { items: FRUITS });
    const input = queryInput(root);
    pressKey(input, "ArrowDown");
    const content = await awaitPortaled("combobox-content");
    expect(content.getAttribute("data-state")).toBe("open");
    expect(input.getAttribute("aria-expanded")).toBe("true");
  });

  test.each(comboboxVariants)("$format/$style drains the chips wiring on disposal", async (variant) => {
    const container = setupContainer();
    const handle = mount(variant.render({ items: FRUITS, multiple: true }), container);
    const root = container.firstElementChild as HTMLElement;
    expect(peekState(root)?.isMounted).toBe(true);
    const input = queryInput(root);
    input.dispatchEvent(new Event("focus"));
    const content = await awaitPortaled("combobox-content");
    handle.unmount();
    await awaitDetached(content);
    pressEscape();
    pointerDownOutside();
    expect(content.isConnected).toBe(false);
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(comboboxVariants, { items: FRUITS, placeholder: "Parity" });
  });

  test("renders every named part with its data-slot across all four variants", () => {
    for (const variant of comboboxPartVariants) {
      const container = setupContainer();
      const rendered = variant.render({ children: [] });
      mount(rendered, container);
      const el = container.firstElementChild!;
      const slot = variant.part === "Input" ? "input-group"
        : variant.part === "ChipsInput" ? "combobox-chip-input"
        : `combobox-${variant.part.toLowerCase()}`;
      expect(el.getAttribute("data-slot")).toBe(slot);
    }
  });

  test.each(comboboxPartVariants.filter((variant) => variant.part === "Content"))("$format/$style content part anchors with matchAnchorWidth, dismisses, and drains wirings on disposal", (variant) => {
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);
    pinRect(anchor, 100, 50, 200, 20);
    const onDismiss = mock(() => {});
    const container = setupContainer();
    const handle = mount(variant.render({ anchor: () => anchor, side: "bottom", onDismiss, children: [] }), container);
    const content = container.firstElementChild as HTMLElement;
    expect(content.style.width).toBe("200px");
    expect(content.style.left).toBe("50px");
    expect(content.style.top).toBe("126px");
    pressEscape();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    handle.unmount();
    expect(content.isConnected).toBe(false);
  });

  test.each(comboboxPartVariants.filter((variant) => variant.part === "Input"))("$format/$style input part threads onInput, onKeydown, and focus restores", (variant) => {
    const onInput = mock<(value: string) => void>(() => {});
    const onKeydown = mock<(e: KeyboardEvent) => void>(() => {});
    const onFocus = mock(() => {});
    const container = setupContainer();
    const handle = mount(variant.render({ children: [], onInput, onKeydown, onFocus }), container);
    const root = container.firstElementChild as HTMLElement;
    const input = root.querySelector("input") as HTMLInputElement;
    type(input, "ab");
    expect(onInput).toHaveBeenCalledWith("ab");
    pressKey(input, "Enter");
    expect(onKeydown).toHaveBeenCalledTimes(1);
    input.dispatchEvent(new Event("focus"));
    expect(onFocus).toHaveBeenCalledTimes(1);
    handle.unmount();
  });

  test.each(comboboxPartVariants.filter((variant) => variant.part === "List"))("$format/$style list part renders data-driven options with selection and highlight state", (variant) => {
    const container = setupContainer();
    const handle = mount(variant.render({
      id: "list-1",
      items: FRUITS,
      query: () => "",
      selected: (value: string): boolean => value === "blueberry",
      active: () => "canteloupe",
      empty: () => false,
      children: [],
    }), container);
    const list = container.firstElementChild as HTMLElement;
    expect(list.getAttribute("role")).toBe("listbox");
    expect(list.getAttribute("data-empty")).toBeNull();
    const options = [...list.querySelectorAll("[role='option']")] as HTMLElement[];
    expect(options).toHaveLength(3);
    expect(options[0]!.id).toBe("list-1-opt-0");
    expect(options[1]!.getAttribute("aria-selected")).toBe("true");
    expect(options[1]!.getAttribute("data-state")).toBe("checked");
    expect(options[2]!.hasAttribute("data-highlighted")).toBe(true);
    handle.unmount();
  });

  test.each(comboboxPartVariants.filter((variant) => variant.part === "Item"))("$format/$style item part blocks clicks when disabled and hides through its accessor", (variant) => {
    const onselect = mock(() => {});
    const container = setupContainer();
    const handle = mount(variant.render({ children: [], value: "a", disabled: true, hidden: () => true, onselect }), container);
    const item = container.firstElementChild as HTMLElement;
    expect(item.getAttribute("aria-disabled")).toBe("true");
    expect(item.style.display).toBe("none");
    item.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onselect).not.toHaveBeenCalled();
    handle.unmount();
  });

  test("builds content trees through the shared module table at each flavor", () => {
    for (const style of ["css", "tailwind"] as const) {
      for (const format of ["jsx", "html"] as const) {
        const Item = menuModulePart<{ value?: string; label?: string }>(comboboxModules, { style, format }, "ComboboxItem");
        expect(Item({ value: "a", label: "A" })).toBeDefined();
      }
    }
  });
});
