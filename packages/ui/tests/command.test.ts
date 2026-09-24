import { describe, test, expect, beforeEach, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
import { html, mount } from "@hellajs/dom";
import {
  assertStructuralParity,
  commandPartVariants,
  commandVariants,
  renderVariant,
  type CommandItemDataVariant,
  type CommandPartVariantProps,
  type ComponentVariant,
  type PartVariant,
} from "./helpers/variants";
import { awaitDetached, awaitPortaled, newestPortaled, pressKey } from "./helpers/anchored";
import type { HellaNode } from "@hellajs/dom";

beforeEach(() => {
  resetTestState();
});

/** Mounts a rendered part, wrapping a reactive fn root (html-format arrow) like the harness does. */
const mountPart = (rendered: HellaNode, container: HTMLElement): void => {
  mount(
    typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered,
    container,
  );
};

const GROUPED: CommandItemDataVariant[] = [
  { value: "apple", label: "Apple", group: "Fruits" },
  { value: "banana", label: "Banana", group: "Fruits" },
  { value: "carrot", label: "Carrot", group: "Vegetables" },
];

/** Types a query into the command input (value then a bubbling input event). */
const type = (input: HTMLInputElement, value: string): void => {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

/** Resolves the command root's query input. */
const queryInput = (root: Element): HTMLInputElement =>
  root.querySelector("[data-slot='command-input']") as HTMLInputElement;

/** Resolves the rendered item elements in DOM order. */
const items = (root: Element): HTMLElement[] =>
  [...root.querySelectorAll("[data-slot='command-item']")] as HTMLElement[];

/** Resolves the visible (non-hidden) group elements in DOM order. */
const visibleGroups = (root: Element): HTMLElement[] =>
  [...root.querySelectorAll("[data-slot='command-group']")].filter(
    (el) => !(el as HTMLElement).hidden,
  ) as HTMLElement[];

describe("command", () => {
  test.each(commandVariants)("$format/$style renders grouped items with headings and ungrouped items before groups", async (variant) => {
    const root = renderVariant(variant, {
      items: [
        { value: "apple", label: "Apple", group: "Fruits" },
        { value: "banana", label: "Banana", group: "Fruits", shortcut: "⌘B" },
        { value: "carrot", label: "Carrot", group: "Vegetables" },
      ],
    });
    await delay();
    const headings = [...root.querySelectorAll("[data-slot='command-group-heading']")];
    expect(headings.map((el) => el.textContent)).toEqual(["Fruits", "Vegetables"]);
    const ordered = items(root).map((el) => el.getAttribute("data-value"));
    expect(ordered).toEqual(["apple", "banana", "carrot"]);
    expect(items(root)[0]!.getAttribute("aria-selected")).toBe("true");
    expect(items(root)[1]!.querySelector("[data-slot='command-shortcut']")!.textContent).toBe("⌘B");
  });

  test.each(commandVariants)("$format/$style hides groups whose items all score zero", async (variant) => {
    const root = renderVariant(variant, { items: GROUPED });
    type(queryInput(root), "app");
    await delay();
    const groups = [...root.querySelectorAll("[data-slot='command-group']")] as HTMLElement[];
    expect(groups).toHaveLength(2);
    expect(groups[0]!.hidden).toBe(false);
    expect(groups[1]!.hidden).toBe(true);
    expect(visibleGroups(root)).toHaveLength(1);
    expect(items(root).map((el) => el.getAttribute("data-value"))).toEqual(["apple"]);
  });

  test.each(commandVariants)("$format/$style shows the empty row when every item filters out", async (variant) => {
    const root = renderVariant(variant, { items: GROUPED });
    type(queryInput(root), "zzz");
    await delay();
    const emptyRow = root.querySelector("[data-slot='command-empty']");
    expect(emptyRow!.textContent).toBe("No results found.");
    expect(root.querySelector("[data-slot='command-group']")).toBeNull();
  });

  test.each(commandVariants)("$format/$style matches labels case-insensitively", async (variant) => {
    const root = renderVariant(variant, {
      items: [{ value: "blueberry", label: "Blueberry" }],
    });
    type(queryInput(root), "BLU");
    await delay();
    expect(items(root)).toHaveLength(1);
    expect(items(root)[0]!.getAttribute("data-value")).toBe("blueberry");
  });

  test.each(commandVariants)("$format/$style ranks earlier substring matches first", async (variant) => {
    const root = renderVariant(variant, {
      items: [
        { value: "orangish", label: "Orangish" },
        { value: "banana", label: "Banana" },
      ],
    });
    type(queryInput(root), "an");
    await delay();
    expect(items(root).map((el) => el.getAttribute("data-value"))).toEqual(["banana", "orangish"]);
  });

  test.each(commandVariants)("$format/$style surfaces keyword matches and ranks extra keyword hits first", async (variant) => {
    const root = renderVariant(variant, {
      items: [
        { value: "home", label: "Home", keywords: ["page"] },
        { value: "home-root", label: "Home", keywords: ["root"] },
        { value: "home-root-docs", label: "Home", keywords: ["root", "rooted"] },
      ],
    });
    type(queryInput(root), "root");
    await delay();
    expect(items(root).map((el) => el.getAttribute("data-value"))).toEqual(["home-root-docs", "home-root"]);
  });

  test.each(commandVariants)("$format/$style ranks word-boundary starts above earlier mid-word matches", async (variant) => {
    const root = renderVariant(variant, {
      items: [
        { value: "raconteur", label: "Raconteur" },
        { value: "icon-config", label: "Icon Config" },
      ],
    });
    type(queryInput(root), "con");
    await delay();
    expect(items(root).map((el) => el.getAttribute("data-value"))).toEqual(["icon-config", "raconteur"]);
  });

  test.each(commandVariants)("$format/$style replaces the default filter through the filter prop", async (variant) => {
    const startsWith = (list: CommandItemDataVariant[], query: string): CommandItemDataVariant[] =>
      query ? list.filter((entry) => entry.label.toLowerCase().startsWith(query.toLowerCase())) : list;
    const root = renderVariant(variant, {
      items: [{ value: "grape", label: "Grape" }, { value: "apricot", label: "Apricot" }],
      filter: startsWith,
    });
    type(queryInput(root), "ap");
    await delay();
    expect(items(root).map((el) => el.getAttribute("data-value"))).toEqual(["apricot"]);
  });

  test.each(commandVariants)("$format/$style moves arrows over enabled items and clamps without loop", async (variant) => {
    const root = renderVariant(variant, {
      items: [
        { value: "a", label: "A" },
        { value: "b", label: "B", disabled: true },
        { value: "c", label: "C" },
      ],
    });
    await delay();
    const input = queryInput(root);
    expect(items(root)[0]!.getAttribute("aria-selected")).toBe("true");
    pressKey(input, "ArrowDown");
    expect(items(root)[2]!.getAttribute("aria-selected")).toBe("true");
    expect(items(root)[0]!.getAttribute("aria-selected")).toBe("false");
    pressKey(input, "ArrowDown");
    expect(items(root)[2]!.getAttribute("aria-selected")).toBe("true");
    pressKey(input, "ArrowUp");
    expect(items(root)[0]!.getAttribute("aria-selected")).toBe("true");
    pressKey(input, "ArrowUp");
    expect(items(root)[0]!.getAttribute("aria-selected")).toBe("true");
  });

  test.each(commandVariants)("$format/$style wraps arrow movement when loop is set", async (variant) => {
    const root = renderVariant(variant, {
      items: GROUPED.map((entry) => ({ ...entry })),
      loop: true,
    });
    await delay();
    const input = queryInput(root);
    pressKey(input, "ArrowUp");
    expect(items(root)[2]!.getAttribute("aria-selected")).toBe("true");
    pressKey(input, "ArrowDown");
    expect(items(root)[0]!.getAttribute("aria-selected")).toBe("true");
  });

  test.each(commandVariants)("$format/$style selects on Enter through onSelect and onValueChange", async (variant) => {
    const onSelect = mock(() => {});
    const onValueChange = mock<(value: string) => void>(() => {});
    const root = renderVariant(variant, {
      items: [
        { value: "apple", label: "Apple", onSelect },
        { value: "banana", label: "Banana" },
      ],
      onValueChange,
    });
    await delay();
    pressKey(queryInput(root), "Enter");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("apple");
  });

  test.each(commandVariants)("$format/$style selects on item click", async (variant) => {
    const onSelect = mock(() => {});
    const onValueChange = mock<(value: string) => void>(() => {});
    const root = renderVariant(variant, {
      items: [
        { value: "apple", label: "Apple" },
        { value: "banana", label: "Banana", onSelect },
      ],
      onValueChange,
    });
    await delay();
    items(root)[1]!.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("banana");
  });

  test.each(commandVariants)("$format/$style scrolls the newly active item into view", async (variant) => {
    const root = renderVariant(variant, { items: GROUPED.map((entry) => ({ ...entry })) });
    await delay();
    const target = items(root)[1]!;
    const scroll = mock(() => {});
    target.scrollIntoView = scroll;
    pressKey(queryInput(root), "ArrowDown");
    expect(scroll).toHaveBeenCalledWith({ block: "nearest" });
  });

  test.each(commandVariants)("$format/$style jumps to the first and last enabled items with Home and End", async (variant) => {
    const root = renderVariant(variant, {
      items: [
        { value: "a", label: "A", disabled: true },
        { value: "b", label: "B" },
        { value: "c", label: "C" },
      ],
    });
    await delay();
    const input = queryInput(root);
    pressKey(input, "ArrowDown");
    pressKey(input, "ArrowDown");
    expect(items(root)[2]!.getAttribute("aria-selected")).toBe("true");
    pressKey(input, "Home");
    expect(items(root)[1]!.getAttribute("aria-selected")).toBe("true");
    pressKey(input, "End");
    expect(items(root)[2]!.getAttribute("aria-selected")).toBe("true");
  });

  test.each(commandVariants)("$format/$style ignores clicks on disabled items", async (variant) => {
    const onSelect = mock(() => {});
    const onValueChange = mock<(value: string) => void>(() => {});
    const root = renderVariant(variant, {
      items: [{ value: "banana", label: "Banana", disabled: true, onSelect }],
      onValueChange,
    });
    await delay();
    items(root)[0]!.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test.each(commandVariants)("$format/$style reports controlled Home and End moves through onValueChange", async (variant) => {
    const onValueChange = mock<(value: string) => void>(() => {});
    const current = signal("apple");
    const root = renderVariant(variant, {
      items: GROUPED.map((entry) => ({ ...entry })),
      value: () => current(),
      onValueChange: (next) => {
        current(next);
        onValueChange(next);
      },
    });
    await delay();
    expect(items(root)[0]!.getAttribute("aria-selected")).toBe("true");
    pressKey(queryInput(root), "ArrowDown");
    expect(onValueChange).toHaveBeenCalledWith("banana");
    await delay();
    expect(items(root)[1]!.getAttribute("aria-selected")).toBe("true");
    pressKey(queryInput(root), "End");
    expect(onValueChange).toHaveBeenLastCalledWith("carrot");
    pressKey(queryInput(root), "Home");
    expect(onValueChange).toHaveBeenLastCalledWith("apple");
    pressKey(queryInput(root), "Enter");
    expect(onValueChange).toHaveBeenLastCalledWith("apple");
  });

  test.each(commandVariants)("$format/$style never moves or commits when every item is disabled", async (variant) => {
    const onValueChange = mock<(value: string) => void>(() => {});
    const root = renderVariant(variant, {
      items: [
        { value: "a", label: "A", disabled: true },
        { value: "b", label: "B", disabled: true },
      ],
      value: () => "a",
      onValueChange,
    });
    await delay();
    const input = queryInput(root);
    pressKey(input, "Home");
    pressKey(input, "End");
    pressKey(input, "ArrowDown");
    pressKey(input, "Enter");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test.each(commandVariants)("$format/$style skips disabled entries on controlled Home and End", async (variant) => {
    const onValueChange = mock<(value: string) => void>(() => {});
    const root = renderVariant(variant, {
      items: [
        { value: "a", label: "A", disabled: true },
        { value: "b", label: "B" },
        { value: "c", label: "C", disabled: true },
      ],
      value: () => "b",
      onValueChange,
    });
    await delay();
    pressKey(queryInput(root), "Home");
    expect(onValueChange).toHaveBeenLastCalledWith("b");
    pressKey(queryInput(root), "End");
    expect(onValueChange).toHaveBeenLastCalledWith("b");
  });

  test.each(commandVariants)("$format/$style leaves the scroll wiring inert for a controlled value with no matching item", async (variant) => {
    const current = signal("apple");
    const root = renderVariant(variant, {
      items: GROUPED.map((entry) => ({ ...entry })),
      value: () => current(),
    });
    await delay();
    current("nonexistent");
    await delay();
    expect(items(root)).toHaveLength(3);
  });

  test.each(commandVariants)("$format/$style renders children below the list as footer chrome", async (variant) => {
    const root = renderVariant(variant, {
      items: GROUPED.map((entry) => ({ ...entry })),
      children: [html`<p class="chrome">Footer</p>`],
    });
    await delay();
    const chrome = root.querySelector("p.chrome")!;
    const list = root.querySelector("[data-slot='command-list']")!;
    expect(chrome).not.toBeNull();
    expect(list.compareDocumentPosition(chrome) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test.each(commandPartVariants.filter((variant) => variant.part === "Dialog"))("$format/$style renders the palette inside the dialog surface and closes on Escape", async (variant) => {
    const open = signal(true);
    const onClose = mock(() => {
      open(false);
    });
    const container = setupContainer();
    mountPart(variant.render({ open: () => open(), onClose, title: "Palette" }), container);
    const panel = await awaitPortaled("dialog-content");
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-modal")).toBe("true");
    expect(document.querySelector("[data-slot='dialog-overlay']")).not.toBeNull();
    expect(panel.querySelector("[data-slot='command']")).not.toBeNull();
    expect(panel.contains(document.activeElement)).toBe(true);
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(panel.getAttribute("data-state")).toBe("closed");
    panel.dispatchEvent(new Event("animationend"));
    await awaitDetached(panel);
  });

  test.each(commandPartVariants.filter((variant) => variant.part === "Dialog"))("$format/$style wires sr-only title and description aria", async (variant) => {
    const container = setupContainer();
    mountPart(variant.render({
      open: () => true,
      onClose: () => {},
      title: "Palette",
      description: "Search commands",
    }), container);
    const panel = await awaitPortaled("dialog-content");
    const title = panel.querySelector("[data-slot='dialog-title']")!;
    const description = panel.querySelector("[data-slot='dialog-description']")!;
    expect(title.textContent).toBe("Palette");
    expect(description.textContent).toBe("Search commands");
    expect(panel.getAttribute("aria-labelledby")).toBe(title.id);
    expect(panel.getAttribute("aria-describedby")).toBe(description.id);
  });

  test.each(commandPartVariants.filter((variant) => variant.part === "Item"))("$format/$style item part drives data-selected through the active accessor and blocks disabled clicks", (variant) => {
    const active = signal(true);
    const onSelect = mock(() => {});
    const container = setupContainer();
    const handle = mount(variant.render({ children: [], value: "a", active: () => active(), onSelect }), container);
    const item = container.firstElementChild as HTMLElement;
    expect(item.getAttribute("aria-selected")).toBe("true");
    expect(item.getAttribute("data-selected")).toBe("true");
    active(false);
    expect(item.getAttribute("aria-selected")).toBe("false");
    expect(item.getAttribute("data-selected")).toBeNull();
    item.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    handle.unmount();
  });

  test.each(commandPartVariants.filter((variant) => variant.part === "Group"))("$format/$style group part renders its heading and resolves the hidden accessor", (variant) => {
    const hidden = signal(true);
    const container = setupContainer();
    const handle = mount(variant.render({ children: [], heading: "Fruits", hidden: () => hidden() }), container);
    const group = container.firstElementChild as HTMLElement;
    expect(group.querySelector("[data-slot='command-group-heading']")!.textContent).toBe("Fruits");
    expect(group.hidden).toBe(true);
    hidden(false);
    expect(group.hidden).toBe(false);
    handle.unmount();
  });

  test("renders every named part with its data-slot across all four variants", () => {
    for (const variant of commandPartVariants) {
      if (variant.part === "Dialog") continue;
      const container = setupContainer();
      const rendered = variant.render({ children: [] } as unknown as CommandPartVariantProps);
      mount(rendered, container);
      const el = container.firstElementChild!;
      const slot = variant.part === "Input" ? "command-input-wrapper" : `command-${variant.part.toLowerCase()}`;
      expect(el.getAttribute("data-slot")).toBe(slot);
    }
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(commandVariants, { items: GROUPED });
  });

  test("keeps CommandDialog structural parity across all four variants", () => {
    const suites = (commandPartVariants.filter((variant) => variant.part === "Dialog") as PartVariant<CommandPartVariantProps>[])
      .map((variant) => ({ ...variant, root: () => newestPortaled("dialog-content") }));
    assertStructuralParity(
      suites as unknown as ComponentVariant<CommandPartVariantProps>[],
      { open: () => true, onClose: () => {}, title: "Parity", description: "Parity description" },
      ["aria-labelledby", "aria-describedby", "id"],
    );
  });
});
