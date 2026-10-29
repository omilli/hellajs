import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import { select } from "@hellajs/headless";
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

/** Polls (microtask hops) until the node detaches from the document. */
async function awaitDetached(node: Element): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (!node.isConnected) return;
    await delay();
  }
  expect(node.isConnected).toBe(false);
}

/** Mounts a trigger (with its value label and content listbox, one Item part per entry) as a child and returns the pieces. */
function mountSelect(
  parts: ReturnType<typeof select>,
  options: {
    items?: { value: string; label: string; disabled?: boolean }[];
    triggerProps?: Record<string, unknown>;
    current?: () => string;
  } = {},
): { handle: { unmount: () => void }; trigger: HTMLElement } {
  const entries: { value: string; label: string; disabled?: boolean }[] = options.items ?? FRUITS;
  const container = document.createElement("div");
  document.body.append(container);
  const current = options.current;
  const handle = mount(
    parts.Trigger({
      ...options.triggerProps,
      children: [
        parts.Value({
          value: current
            ? () => entries.find((entry) => entry.value === current())?.label
            : undefined,
        }),
        parts.Content({
          children: entries.map((entry) =>
            parts.Item({ value: entry.value, disabled: entry.disabled, children: entry.label }),
          ),
        }),
      ],
    }),
    container,
  );
  return { handle, trigger: container.firstElementChild as HTMLElement };
}

/** Opens the select by clicking the trigger and resolves the portaled listbox. */
async function openSelect(
  parts: ReturnType<typeof select>,
  options?: Parameters<typeof mountSelect>[1],
): Promise<{ trigger: HTMLElement; content: HTMLElement }> {
  const { trigger } = mountSelect(parts, options);
  trigger.dispatchEvent(new Event("click"));
  const content = await openContent();
  return { trigger, content };
}

describe("select", () => {
  test("the trigger opens the listbox with its aria contract", async () => {
    const parts = select();
    const { trigger, content } = await openSelect(parts);
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(content.id);
    expect(content.getAttribute("role")).toBe("listbox");
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.querySelectorAll("[role='option']")).toHaveLength(3);
  });

  test("open focus lands on the selected option, else the first", async () => {
    const parts = select({ value: () => "blueberry" });
    const { content } = await openSelect(parts);
    const options = [...content.querySelectorAll("[role='option']")] as HTMLElement[];
    expect(document.activeElement).toBe(options[1]);
    expect(options[1]!.hasAttribute("data-highlighted")).toBe(true);
  });

  test("arrows and Home/End rove the options with focus", async () => {
    const parts = select();
    const { content } = await openSelect(parts);
    const options = [...content.querySelectorAll("[role='option']")] as HTMLElement[];
    pressKey(content, "ArrowDown");
    expect(document.activeElement).toBe(options[1]);
    expect(options[1]!.hasAttribute("data-highlighted")).toBe(true);
    expect(options[0]!.hasAttribute("data-highlighted")).toBe(false);
    pressKey(content, "ArrowDown");
    pressKey(content, "ArrowDown");
    expect(document.activeElement).toBe(options[0]);
    pressKey(content, "ArrowUp");
    expect(document.activeElement).toBe(options[2]);
    pressKey(content, "Home");
    expect(document.activeElement).toBe(options[0]);
    pressKey(content, "End");
    expect(document.activeElement).toBe(options[2]);
  });

  test("roving skips disabled options and their clicks are blocked", async () => {
    const onValueChange = vi.fn<(value: string) => void>(() => {});
    const parts = select({ onValueChange });
    const { content } = await openSelect(parts, {
      items: [
        { value: "apple", label: "Apple" },
        { value: "blueberry", label: "Blueberry", disabled: true },
        { value: "canteloupe", label: "Canteloupe" },
      ],
    });
    const options = [...content.querySelectorAll("[role='option']")] as HTMLElement[];
    const disabled = content.querySelector("[data-disabled]")!;
    expect(disabled.getAttribute("aria-disabled")).toBe("true");
    pressKey(content, "ArrowDown");
    expect(document.activeElement).toBe(options[2]);
    options[1]!.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(onValueChange).not.toHaveBeenCalled();
    expect(content.getAttribute("data-state")).toBe("open");
  });

  test("Enter selects the focused option, closes, and restores trigger focus", async () => {
    const onValueChange = vi.fn<(value: string) => void>(() => {});
    const parts = select({ onValueChange });
    const { trigger, content } = await openSelect(parts);
    const first = content.querySelector("[role='option']") as HTMLElement;
    expect(document.activeElement).toBe(first);
    pressKey(content, "Enter");
    flush();
    expect(onValueChange).toHaveBeenCalledWith("apple");
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  test("Space selects the focused option like Enter", async () => {
    const onValueChange = vi.fn<(value: string) => void>(() => {});
    const parts = select({ onValueChange });
    const { content } = await openSelect(parts);
    pressKey(content, "ArrowDown");
    pressKey(content, " ");
    flush();
    expect(onValueChange).toHaveBeenCalledWith("blueberry");
  });

  test("Tab closes the listbox", async () => {
    const parts = select();
    const { content } = await openSelect(parts);
    pressKey(content, "Tab");
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test("Value renders the placeholder while empty and the selection after", async () => {
    const onValueChange = vi.fn<(value: string) => void>(() => {});
    const current = signal("");
    const parts = select({
      value: () => current(),
      onValueChange: (next) => {
        current(next);
        onValueChange(next);
      },
    });
    const { trigger, content } = await openSelect(parts, { current: () => current() });
    const valueEl = trigger.querySelector("[data-slot='select-value']")!;
    expect(valueEl.textContent).toBe("");
    expect(valueEl.hasAttribute("data-placeholder")).toBe(true);
    pressKey(content, "Enter");
    flush();
    expect(valueEl.textContent).toBe("Apple");
    expect(valueEl.hasAttribute("data-placeholder")).toBe(false);
    expect(onValueChange).toHaveBeenCalledWith("apple");
  });

  test("a controlled value accessor drives selection and keeps internal state out", async () => {
    const current = signal("");
    const onValueChange = vi.fn<(value: string) => void>(() => {});
    const parts = select({
      value: () => current(),
      onValueChange: (next) => {
        current(next);
        onValueChange(next);
      },
    });
    const { content } = await openSelect(parts);
    pressKey(content, "Enter");
    flush();
    expect(onValueChange).toHaveBeenCalledWith("apple");
    expect(current()).toBe("apple");
  });

  test("an internal value fallback works standalone", () => {
    const onValueChange = vi.fn<(value: string) => void>(() => {});
    const parts = select({ onValueChange });
    const container = document.createElement("div");
    document.body.append(container);
    mount(parts.Item({ value: "apple", children: "Apple" }), container);
    const option = container.querySelector("[role='option']") as HTMLElement;
    option.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(onValueChange).toHaveBeenCalledWith("apple");
    expect(option.getAttribute("aria-selected")).toBe("true");
  });

  test("the content anchors to the trigger and stretches to its width", async () => {
    const parts = select();
    const { trigger } = mountSelect(parts);
    pinRect(trigger, 50, 100, 200, 20);
    trigger.dispatchEvent(new Event("click"));
    const content = await openContent();
    expect(content.style.width).toBe("200px");
    expect(content.style.left).toBe("100px");
    expect(content.style.top).toBe("76px");
    expect(content.getAttribute("data-side")).toBe("bottom");
  });

  test("the listbox arms typeahead and the scroll-edge visibility sync", async () => {
    const parts = select();
    const { content } = await openSelect(parts);
    pressKey(content, "b");
    const options = [...content.querySelectorAll("[role='option']")] as HTMLElement[];
    expect(document.activeElement).toBe(options[1]);
    let scrollTop = 0;
    Object.defineProperty(content, "scrollTop", {
      get: () => scrollTop,
      set: (v: number) => {
        scrollTop = v;
      },
      configurable: true,
    });
    Object.defineProperty(content, "scrollHeight", { get: () => 300, configurable: true });
    Object.defineProperty(content, "clientHeight", { get: () => 100, configurable: true });
    const up = content.querySelector("[data-slot='select-scroll-up-button']") as HTMLElement;
    const down = content.querySelector("[data-slot='select-scroll-down-button']") as HTMLElement;
    content.dispatchEvent(new Event("scroll"));
    expect(up.style.visibility).toBe("hidden");
    expect(down.style.visibility).toBe("visible");
    scrollTop = 200;
    content.dispatchEvent(new Event("scroll"));
    expect(down.style.visibility).toBe("hidden");
  });

  test("the trigger's clear affordance resets without toggling", () => {
    const onValueChange = vi.fn<(value: string) => void>(() => {});
    const parts = select({ value: () => "apple", onValueChange });
    const { trigger } = mountSelect(parts, { triggerProps: { clearable: true } });
    const clear = trigger.querySelector("[data-slot='select-clear']")!;
    clear.dispatchEvent(new Event("click", { bubbles: true }));
    flush();
    expect(onValueChange).toHaveBeenCalledWith("");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  test("escape and an outside pointerdown dismiss the open layer", async () => {
    const parts = select();
    const { trigger } = await openSelect(parts);
    const content = document.querySelector("[data-slot='select-content']")!;
    pressKey(document.body, "Escape");
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
    content.dispatchEvent(new Event("animationend"));
    await awaitDetached(content);
    trigger.dispatchEvent(new Event("click"));
    const reopened = await openContent();
    pointerDown(document.body);
    flush();
    expect(reopened.getAttribute("data-state")).toBe("closed");
  });

  test("the exit unmounts the content through animationend", async () => {
    const onValueChange = vi.fn<(value: string) => void>(() => {});
    const parts = select({ onValueChange });
    const { trigger } = await openSelect(parts);
    const content = document.querySelector("[data-slot='select-content']")!;
    pressKey(content, "Enter");
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
    content.dispatchEvent(new Event("animationend"));
    await awaitDetached(content);
    expect(trigger.isConnected).toBe(true);
  });

  test("the content exits through the fallback budget when no animationend fires", async () => {
    const parts = select();
    const { trigger } = await openSelect(parts);
    const content = document.querySelector("[data-slot='select-content']")!;
    pressKey(document.body, "Escape");
    flush();
    expect(content.isConnected).toBe(true);
    await delay(320);
    expect(content.isConnected).toBe(false);
    trigger.dispatchEvent(new Event("click"));
    await openContent();
  });

  test("unmounting the tree leaves no dismissal residue", async () => {
    const onValueChange = vi.fn<(value: string) => void>(() => {});
    const parts = select({ onValueChange });
    const { handle, trigger } = mountSelect(parts);
    trigger.dispatchEvent(new Event("click"));
    const content = await openContent();
    expect(peekState(trigger)?.isMounted).toBe(true);
    handle.unmount();
    await awaitDetached(content);
    pressKey(document.body, "Escape");
    pointerDown(document.body);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("closing does not steal focus when the trigger left the document", async () => {
    const parts = select();
    const { handle, trigger } = mountSelect(parts);
    trigger.dispatchEvent(new Event("click"));
    await openContent();
    handle.unmount();
    const active = document.activeElement;
    expect(active).not.toBe(trigger);
  });
});
