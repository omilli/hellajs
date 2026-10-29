import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount } from "@hellajs/dom";
import { command } from "@hellajs/headless";
import type {
  CommandEntry,
  CommandInputProps,
  CommandItemProps,
  CommandListProps,
} from "@hellajs/headless";
import { pressKey } from "./helpers";

beforeEach(() => {
  resetTestState();
});

const ITEMS: CommandEntry[] = [
  { value: "apple", label: "Apple", group: "Fruits" },
  { value: "banana", label: "Banana", group: "Fruits" },
  { value: "carrot", label: "Carrot", group: "Vegetables" },
];

/** The disposable pair of mounts (input and list live in sibling containers; the factory closure is shared). */
interface CommandMount {
  handles: { unmount: () => void }[];
  container: HTMLElement;
  input: HTMLInputElement;
}

/** Mounts a command surface (input and list in sibling containers - the factory closure is shared) and returns the pieces. */
function mountCommand(
  parts: ReturnType<typeof command>,
  options: {
    items?: CommandEntry[];
    manual?: boolean;
    inputProps?: CommandInputProps;
    listProps?: CommandListProps;
    itemProps?: (entry: CommandEntry) => CommandItemProps;
  } = {},
): CommandMount {
  const inputHost = document.createElement("div");
  document.body.append(inputHost);
  const container = document.createElement("div");
  document.body.append(container);
  const manual = options.manual ?? options.items === undefined;
  const entries = options.items ?? [];
  const handles: { unmount: () => void }[] = [];
  handles.push(mount(parts.Input(options.inputProps ?? {}), inputHost));
  handles.push(
    mount(
      parts.List({
        ...options.listProps,
        children: manual
          ? entries.map((entry) =>
              parts.Item({ children: entry.label, ...options.itemProps?.(entry) }),
            )
          : [],
      }),
      container,
    ),
  );
  const input = inputHost.querySelector("[data-slot='command-input']") as HTMLInputElement;
  return { handles, container, input };
}

/** Types a query into the command input (value then a bubbling input event). */
const type = (input: HTMLInputElement, value: string): void => {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

/** Resolves the rendered item elements in DOM order. */
const items = (scope: ParentNode): HTMLElement[] =>
  [...scope.querySelectorAll("[data-slot='command-item']")] as HTMLElement[];

/** Polls (microtask hops) until the newest portaled node matching the slot is connected. */
async function awaitPortaled(slot: string): Promise<HTMLElement> {
  for (let i = 0; i < 50; i++) {
    const nodes = document.querySelectorAll(`[data-slot='${slot}']`);
    const node = nodes.length === 0 ? undefined : (nodes[nodes.length - 1] as HTMLElement);
    if (node && node.isConnected) return node;
    await delay();
  }
  throw new Error(`portaled ${slot} never mounted`);
}

/** Polls (microtask hops) until the node detaches from the document. */
async function awaitDetached(node: Element): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (!node.isConnected) return;
    await delay();
  }
  expect(node.isConnected).toBe(false);
}

describe("command", () => {
  test("typing ranks the items through the default filter", async () => {
    const itemsSource: CommandEntry[] = [
      { value: "orangish", label: "Orangish" },
      { value: "banana", label: "Banana", shortcut: "⌘B" },
    ];
    const parts = command({ items: itemsSource });
    const { container, input, handles } = mountCommand(parts, { items: itemsSource });
    type(input, "an");
    await delay();
    expect(items(container).map((el) => el.getAttribute("data-value"))).toEqual([
      "banana",
      "orangish",
    ]);
    expect(items(container)[0]!.getAttribute("aria-selected")).toBe("true");
    expect(items(container)[0]!.querySelector("[data-slot='command-shortcut']")!.textContent).toBe(
      "⌘B",
    );
    handles.forEach((handle) => handle.unmount());
  });

  test("a custom filter replaces the default ranking", async () => {
    const startsWith = (entries: CommandEntry[], query: string): CommandEntry[] =>
      query
        ? entries.filter((entry) => entry.label.toLowerCase().startsWith(query.toLowerCase()))
        : entries;
    const itemsSource: CommandEntry[] = [
      { value: "grape", label: "Grape" },
      { value: "apricot", label: "Apricot" },
    ];
    const parts = command({ items: itemsSource, filter: startsWith });
    const { container, input, handles } = mountCommand(parts, { items: itemsSource });
    type(input, "ap");
    await delay();
    expect(items(container).map((el) => el.getAttribute("data-value"))).toEqual(["apricot"]);
    handles.forEach((handle) => handle.unmount());
  });

  test("arrows rove the ranked list skipping disabled entries and Enter commits the active item", async () => {
    const onSelect = vi.fn(() => {});
    const onValueChange = vi.fn<(value: string) => void>(() => {});
    const itemsSource: CommandEntry[] = [
      { value: "a", label: "A" },
      { value: "b", label: "B", disabled: true },
      { value: "c", label: "C", onSelect },
    ];
    const parts = command({ items: itemsSource, onValueChange });
    const { container, input, handles } = mountCommand(parts, { items: itemsSource });
    expect(items(container)[0]!.getAttribute("aria-selected")).toBe("true");
    pressKey(input, "ArrowDown");
    expect(items(container)[2]!.getAttribute("aria-selected")).toBe("true");
    pressKey(input, "Enter");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("c");
    pressKey(input, "ArrowUp");
    expect(items(container)[0]!.getAttribute("aria-selected")).toBe("true");
    handles.forEach((handle) => handle.unmount());
  });

  test("Escape clears the query and restores the full list", async () => {
    const parts = command({ items: ITEMS });
    const { container, input, handles } = mountCommand(parts, { items: ITEMS });
    type(input, "ban");
    await delay();
    expect(items(container)).toHaveLength(1);
    pressKey(input, "Escape");
    await delay();
    expect(input.value).toBe("");
    expect(items(container)).toHaveLength(3);
    handles.forEach((handle) => handle.unmount());
  });

  test("loop wraps arrow movement at the edges", async () => {
    const parts = command({ items: ITEMS, loop: true });
    const { container, input, handles } = mountCommand(parts, { items: ITEMS });
    pressKey(input, "ArrowUp");
    expect(items(container)[2]!.getAttribute("aria-selected")).toBe("true");
    pressKey(input, "ArrowDown");
    expect(items(container)[0]!.getAttribute("aria-selected")).toBe("true");
    handles.forEach((handle) => handle.unmount());
  });

  test("the empty row renders when nothing matches", async () => {
    const parts = command({ items: ITEMS });
    const { container, input, handles } = mountCommand(parts, { items: ITEMS });
    type(input, "zzz");
    await delay();
    const emptyRow = container.querySelector("[data-slot='command-empty']");
    expect(emptyRow!.textContent).toBe("No results found.");
    handles.forEach((handle) => handle.unmount());
  });

  test("items rendered as children register in DOM order, filter in place, and commit through Enter", async () => {
    const calendar = vi.fn(() => {});
    const settings = vi.fn(() => {});
    const parts = command({});
    const { container, input, handles } = mountCommand(parts, {
      manual: true,
      itemProps: (entry) => ({
        value: entry.value,
        onSelect: entry.value === "calendar" ? calendar : settings,
      }),
      items: [
        { value: "calendar", label: "Calendar" },
        { value: "settings", label: "Settings" },
      ],
    });
    expect(items(container)).toHaveLength(2);
    expect(items(container)[0]!.getAttribute("aria-selected")).toBe("true");
    pressKey(input, "ArrowDown");
    expect(items(container)[1]!.getAttribute("aria-selected")).toBe("true");
    pressKey(input, "Enter");
    expect(settings).toHaveBeenCalledTimes(1);
    type(input, "cal");
    await delay();
    const visible = items(container).filter((el) => el.style.display !== "none");
    expect(visible.map((el) => el.getAttribute("data-value"))).toEqual(["calendar"]);
    pressKey(input, "Enter");
    expect(calendar).toHaveBeenCalledTimes(1);
    handles.forEach((handle) => handle.unmount());
  });

  test("controlled value respects the getter and reports every requested move and selection", async () => {
    const onValueChange = vi.fn<(value: string) => void>(() => {});
    const current = signal("apple");
    const itemsSource: CommandEntry[] = [
      { value: "apple", label: "Apple" },
      { value: "banana", label: "Banana" },
      { value: "carrot", label: "Carrot" },
    ];
    const parts = command({
      items: itemsSource,
      value: () => current(),
      onValueChange: (next) => {
        current(next);
        onValueChange(next);
      },
    });
    const { container, input, handles } = mountCommand(parts, { items: itemsSource });
    pressKey(input, "ArrowDown");
    expect(onValueChange).toHaveBeenCalledWith("banana");
    await delay();
    expect(items(container)[1]!.getAttribute("aria-selected")).toBe("true");
    pressKey(input, "End");
    expect(onValueChange).toHaveBeenLastCalledWith("carrot");
    pressKey(input, "Home");
    expect(onValueChange).toHaveBeenLastCalledWith("apple");
    pressKey(input, "Enter");
    expect(onValueChange).toHaveBeenLastCalledWith("apple");
    handles.forEach((handle) => handle.unmount());
  });

  test("the Dialog opens and closes through the passed state with modal semantics", async () => {
    const open = signal(true);
    const onClose = vi.fn(() => {
      open(false);
    });
    const parts = command({});
    const container = document.createElement("div");
    document.body.append(container);
    const handle = mount(
      parts.Dialog({
        open: () => open(),
        onClose,
        title: "Palette",
        description: "Search commands",
        children: [parts.Input({})],
      }),
      container,
    );
    const panel = await awaitPortaled("dialog-content");
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-modal")).toBe("true");
    const description = panel.querySelector("[data-slot='dialog-description']")!;
    expect(description.textContent).toBe("Search commands");
    expect(panel.getAttribute("aria-describedby")).toBe(description.id);
    expect(document.querySelector("[data-slot='dialog-overlay']")).not.toBeNull();
    expect(panel.querySelector("[data-slot='command']")).not.toBeNull();
    expect(panel.contains(document.activeElement)).toBe(true);
    pressKey(panel, "Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(panel.getAttribute("data-state")).toBe("closed");
    panel.dispatchEvent(new Event("animationend"));
    await awaitDetached(panel);
    handle.unmount();
  });

  test("unmounting the tree leaves no command or dialog residue", async () => {
    const open = signal(true);
    const parts = command({ items: ITEMS });
    const { handles } = mountCommand(parts, { items: ITEMS });
    const dialogHost = document.createElement("div");
    document.body.append(dialogHost);
    const dialogHandle = mount(parts.Dialog({ open: () => open(), onClose: () => {} }), dialogHost);
    await awaitPortaled("dialog-content");
    expect(document.querySelectorAll("[data-slot='dialog-content']").length).toBeGreaterThan(0);
    handles.forEach((handle) => handle.unmount());
    dialogHandle.unmount();
    await delay();
    expect(document.querySelectorAll("[data-slot='command']").length).toBe(0);
    expect(document.querySelectorAll("[data-slot='dialog-content']").length).toBe(0);
    expect(document.querySelectorAll("[data-slot='dialog-overlay']").length).toBe(0);
  });
});
