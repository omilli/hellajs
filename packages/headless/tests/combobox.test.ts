import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { combobox } from "@hellajs/headless";
import { pointerDown, pressKey } from "./helpers";

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

/** Polls (microtask hops) until the newest portaled combobox content finished its observer-driven mount walk. */
async function openContent(): Promise<HTMLElement> {
  for (let i = 0; i < 50; i++) {
    const nodes = document.querySelectorAll("[data-slot='combobox-content']");
    const node = nodes.length === 0 ? undefined : (nodes[nodes.length - 1] as HTMLElement);
    if (node && peekState(node)?.isMounted) return node;
    await delay();
  }
  throw new Error("portaled combobox content never mounted");
}

/** Polls (microtask hops) until the node detaches from the document. */
async function awaitDetached(node: Element): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (!node.isConnected) return;
    await delay();
  }
  expect(node.isConnected).toBe(false);
}

/** Mounts an input with its content layer as a child and returns the mount handle plus the wrapper element. */
function mountCombobox(
  parts: ReturnType<typeof combobox>,
  listChildren: JSX.Element[] = [],
): { handle: { unmount: () => void }; wrapper: HTMLElement } {
  const container = document.createElement("div");
  document.body.append(container);
  const handle = mount(
    parts.Input({ children: [parts.Content({ children: listChildren })] }),
    container,
  );
  return { handle, wrapper: container.firstElementChild as HTMLElement };
}

/** Mounts a full combobox (list rendered from the same FRUITS source) and opens it by focusing the input. */
async function openCombobox(parts: ReturnType<typeof combobox>): Promise<{
  handle: { unmount: () => void };
  input: HTMLInputElement;
  wrapper: HTMLElement;
  content: HTMLElement;
}> {
  const { handle, wrapper } = mountCombobox(parts, [
    parts.List({ items: FRUITS, children: [parts.Empty({ children: "No items found." })] }),
  ]);
  const input = wrapper.querySelector("input") as HTMLInputElement;
  input.dispatchEvent(new Event("focus"));
  const content = await openContent();
  return { handle, input, wrapper, content };
}

describe("combobox", () => {
  test("typing filters matches", async () => {
    const parts = combobox({ items: FRUITS });
    const { input, content } = await openCombobox(parts);
    const visible = () =>
      [...content.querySelectorAll("[role='option']")].filter(
        (el) => (el as HTMLElement).style.display !== "none",
      );
    expect(visible()).toHaveLength(3);
    input.value = "BLU";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    flush();
    expect(visible().map((el) => el.getAttribute("data-value"))).toEqual(["blueberry"]);
    expect(content.hasAttribute("data-empty")).toBe(false);
  });

  test("marks the panel empty on zero matches", async () => {
    const parts = combobox({ items: FRUITS });
    const { input, content } = await openCombobox(parts);
    input.value = "zzz";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    flush();
    expect(content.hasAttribute("data-empty")).toBe(true);
  });

  test("arrows rove the filtered enabled set with wrap-around", async () => {
    const parts = combobox({
      items: [...FRUITS, { value: "date", label: "Date", disabled: true }],
    });
    const { input } = await openCombobox(parts);
    const activeId = () => input.getAttribute("aria-activedescendant") ?? "";
    expect(activeId()).toContain("opt-apple");
    pressKey(input, "ArrowDown");
    expect(activeId()).toContain("opt-blueberry");
    // The disabled entry is skipped.
    pressKey(input, "ArrowDown");
    expect(activeId()).toContain("opt-canteloupe");
    pressKey(input, "ArrowDown");
    expect(activeId()).toContain("opt-apple");
    pressKey(input, "ArrowUp");
    expect(activeId()).toContain("opt-canteloupe");
  });

  test("Enter commits the active option: closes and clears the query single-mode", async () => {
    const onValueChange = vi.fn<(value: string | string[]) => void>(() => {});
    const parts = combobox({ items: FRUITS, onValueChange });
    const { input, content } = await openCombobox(parts);
    pressKey(input, "ArrowDown");
    pressKey(input, "Enter");
    flush();
    expect(onValueChange).toHaveBeenCalledWith("blueberry");
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(input.value).toBe("");
  });

  test("Enter toggles multi-selections and keeps the panel open", async () => {
    const onValueChange = vi.fn<(value: string | string[]) => void>(() => {});
    const parts = combobox({ items: FRUITS, multiple: true, onValueChange });
    const { input, content } = await openCombobox(parts);
    pressKey(input, "Enter");
    flush();
    expect(onValueChange).toHaveBeenCalledWith(["apple"]);
    expect(content.getAttribute("data-state")).toBe("open");
    pressKey(input, "Enter");
    flush();
    expect(onValueChange).toHaveBeenLastCalledWith([]);
  });

  test("Escape clears the query and then closes", async () => {
    const parts = combobox({ items: FRUITS });
    const { input, content } = await openCombobox(parts);
    input.value = "blu";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    flush();
    pressKey(input, "Escape");
    flush();
    expect(input.value).toBe("");
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test("focus opens with the selection active, else the first match", async () => {
    const parts = combobox({ items: FRUITS, value: () => "canteloupe" });
    const { input } = await openCombobox(parts);
    expect(input.getAttribute("aria-activedescendant")).toContain("opt-canteloupe");
  });

  test("typeahead jumps to the matching option through stable value-derived ids", async () => {
    const parts = combobox({ items: FRUITS });
    const { input, content } = await openCombobox(parts);
    pressKey(input, "c");
    flush();
    const options = [...content.querySelectorAll("[role='option']")] as HTMLElement[];
    const highlighted = options.find((el) => el.hasAttribute("data-highlighted"))!;
    expect(highlighted.getAttribute("data-value")).toBe("canteloupe");
    expect(highlighted.id).toBe(`${content.querySelector("[role='listbox']")!.id}-opt-canteloupe`);
    expect(input.getAttribute("aria-activedescendant")).toBe(highlighted.id);
  });

  test("multi-select renders chips from the value array and removal deselects", async () => {
    const onValueChange = vi.fn<(value: string | string[]) => void>(() => {});
    const current = signal<string[]>(["apple", "blueberry"]);
    const parts = combobox({
      items: FRUITS,
      multiple: true,
      value: () => current(),
      onValueChange,
    });
    const { wrapper } = mountCombobox(parts, [
      parts.List({ items: FRUITS, children: [parts.Empty({ children: "No items found." })] }),
    ]);
    const chips = [...wrapper.querySelectorAll("[data-slot='combobox-chip']")];
    expect(chips.map((el) => el.getAttribute("data-value"))).toEqual(["apple", "blueberry"]);
    const remove = chips[0]!.querySelector("[data-slot='combobox-chip-remove']")!;
    remove.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(onValueChange).toHaveBeenCalledWith(["blueberry"]);
  });

  test("a controlled value accessor drives selection and keeps internal state out", async () => {
    const current = signal("");
    const onValueChange = vi.fn<(value: string | string[]) => void>(() => {});
    const parts = combobox({
      items: FRUITS,
      value: () => current(),
      onValueChange: (next) => {
        current(next as string);
        onValueChange(next);
      },
    });
    const { input } = await openCombobox(parts);
    pressKey(input, "Enter");
    flush();
    expect(onValueChange).toHaveBeenCalledWith("apple");
    expect(current()).toBe("apple");
  });

  test("an internal value fallback works standalone", () => {
    const onValueChange = vi.fn<(value: string | string[]) => void>(() => {});
    const parts = combobox({ items: FRUITS, onValueChange });
    const container = document.createElement("div");
    document.body.append(container);
    mount(parts.Item({ value: "apple", children: "Apple" }), container);
    const option = container.querySelector("[role='option']") as HTMLElement;
    option.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(onValueChange).toHaveBeenCalledWith("apple");
    expect(option.getAttribute("aria-selected")).toBe("true");
    expect(option.getAttribute("data-state")).toBe("checked");
  });

  test("the content anchors to the input wrapper and stretches to its width", async () => {
    const parts = combobox({ items: FRUITS });
    const { wrapper } = mountCombobox(parts, [
      parts.List({ items: FRUITS, children: [parts.Empty({ children: "No items found." })] }),
    ]);
    pinRect(wrapper, 100, 50, 200, 20);
    const input = wrapper.querySelector("input") as HTMLInputElement;
    input.dispatchEvent(new Event("focus"));
    const content = await openContent();
    expect(content.style.width).toBe("200px");
    expect(content.style.left).toBe("50px");
    expect(content.style.top).toBe("126px");
    expect(content.getAttribute("data-side")).toBe("bottom");
    expect(content.getAttribute("data-chips")).toBeNull();
  });

  test("escape and an outside pointerdown dismiss the open layer", async () => {
    const parts = combobox({ items: FRUITS });
    const { input } = await openCombobox(parts);
    const content = document.querySelector("[data-slot='combobox-content']")!;
    pressKey(document.body, "Escape");
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
    content.dispatchEvent(new Event("animationend"));
    await awaitDetached(content);
    input.dispatchEvent(new Event("focus"));
    const reopened = await openContent();
    pointerDown(document.body);
    flush();
    expect(reopened.getAttribute("data-state")).toBe("closed");
  });

  test("the exit unmounts the content through animationend and reopens cleanly", async () => {
    const parts = combobox({ items: FRUITS });
    const { input } = await openCombobox(parts);
    const content = document.querySelector("[data-slot='combobox-content']")!;
    pressKey(input, "Escape");
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
    content.dispatchEvent(new Event("animationend"));
    await awaitDetached(content);
    input.dispatchEvent(new Event("focus"));
    const reopened = await openContent();
    expect(reopened).not.toBe(content);
    expect(reopened.getAttribute("data-state")).toBe("open");
  });

  test("unmounting the tree leaves no dismissal residue", async () => {
    const onValueChange = vi.fn<(value: string | string[]) => void>(() => {});
    const parts = combobox({ items: FRUITS, onValueChange });
    const { handle, wrapper } = mountCombobox(parts, [
      parts.List({ items: FRUITS, children: [parts.Empty({ children: "No items found." })] }),
    ]);
    const input = wrapper.querySelector("input") as HTMLInputElement;
    input.dispatchEvent(new Event("focus"));
    const content = await openContent();
    expect(peekState(wrapper)?.isMounted).toBe(true);
    handle.unmount();
    await awaitDetached(content);
    pressKey(document.body, "Escape");
    pointerDown(document.body);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("a composed Item list commits through stable value-derived ids", async () => {
    const onValueChange = vi.fn<(value: string | string[]) => void>(() => {});
    const parts = combobox({ items: FRUITS, onValueChange });
    const { handle, wrapper } = mountCombobox(parts, [
      parts.List({
        children: parts
          .matches()
          .map((entry) => parts.Item({ value: entry.value, children: entry.label })),
      }),
    ]);
    const input = wrapper.querySelector("input") as HTMLInputElement;
    input.dispatchEvent(new Event("focus"));
    const content = await openContent();
    const options = document.querySelectorAll("[data-slot='combobox-item']");
    expect(options.length).toBe(3);
    const option = options[0] as HTMLElement;
    expect(option.id).toContain("opt-apple");
    expect(input.getAttribute("aria-activedescendant")).toBe(option.id);
    option.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(onValueChange).toHaveBeenCalledWith("apple");
    expect(content.getAttribute("data-state")).toBe("closed");
    handle.unmount();
  });

  test("a custom filter replaces the default substring match", async () => {
    const parts = combobox({
      items: FRUITS,
      filter: (items, query) => items.filter((entry) => entry.value.startsWith(query)),
    });
    const { input } = await openCombobox(parts);
    input.value = "ap";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    flush();
    expect(parts.matches().map((entry) => entry.value)).toEqual(["apple"]);
    pressKey(input, "Enter");
    flush();
    expect(input.value).toBe("");
  });

  test("a controlled open getter drives the parts and keeps internal state out", async () => {
    const open = signal(false);
    const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
    const parts = combobox({ items: FRUITS, open: () => open(), onOpenChange });
    const { handle, wrapper } = mountCombobox(parts, [
      parts.List({ items: FRUITS, children: [parts.Empty({ children: "No items found." })] }),
    ]);
    const input = wrapper.querySelector("input") as HTMLInputElement;
    input.dispatchEvent(new Event("focus"));
    flush();
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(onOpenChange).toHaveBeenCalledWith(true);
    open(true);
    const content = await openContent();
    expect(content.getAttribute("data-state")).toBe("open");
    open(false);
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
    // The controller's own flip notifies no one; only the focus attempt reported.
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    handle.unmount();
  });
});
