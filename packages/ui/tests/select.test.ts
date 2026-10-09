import { describe, test, expect, beforeEach, mock } from "bun:test";
import { signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  renderVariant,
  selectModules,
  selectPartVariants,
  selectVariants,
  menuModulePart,
  type ComponentVariant,
  type SelectVariantProps,
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

/** Installs a recording scrollIntoView on HTMLElement.prototype for the open-focus assertion. */
function spyScrollIntoView(): { scrolled: Element[]; restore: () => void } {
  const scrolled: Element[] = [];
  const desc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
  (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView = function (this: Element) {
    scrolled.push(this);
  };
  return {
    scrolled,
    restore: () => {
      if (desc?.value) HTMLElement.prototype.scrollIntoView = desc.value;
      else delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    },
  };
}

/** Opens the select by clicking the trigger and resolves the portaled listbox once the mount walk finished. */
async function openSelect(variant: ComponentVariant<SelectVariantProps>, props: SelectVariantProps = {}) {
  const onValueChange = mock<(value: string) => void>(() => {});
  const trigger = renderVariant(variant, { items: FRUITS, onValueChange, ...props });
  trigger.dispatchEvent(new Event("click"));
  const content = await awaitPortaled("select-content");
  return { onValueChange, trigger, content };
}

describe("select", () => {
  test.each(selectVariants)("$format/$style opens on click with listbox aria on trigger and content", async (variant) => {
    const { trigger, content } = await openSelect(variant);
    expect(content.getAttribute("data-state")).toBe("open");
    expect(content.getAttribute("role")).toBe("listbox");
    expect(trigger.getAttribute("data-state")).toBe("open");
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(content.id);
  });

  test.each(selectVariants)("$format/$style renders options with role, aria-selected, and the check indicator", async (variant) => {
    const onValueChange = mock<(value: string) => void>(() => {});
    const trigger = renderVariant(variant, { items: FRUITS, value: () => "blueberry", onValueChange });
    trigger.dispatchEvent(new Event("click"));
    const content = await awaitPortaled("select-content");
    const options = [...content.querySelectorAll("[role='option']")];
    expect(options).toHaveLength(3);
    const checked = content.querySelector("[aria-selected='true']")!;
    expect(checked.getAttribute("data-value")).toBe("blueberry");
    expect(checked.getAttribute("data-state")).toBe("checked");
    expect(checked.querySelector("[data-slot='select-item-indicator'] svg")).not.toBeNull();
    const unchecked = content.querySelector("[aria-selected='false']")!;
    expect(unchecked.getAttribute("data-state")).toBe("unchecked");
    expect(unchecked.querySelector("[data-slot='select-item-indicator'] svg")).toBeNull();
  });

  test.each(selectVariants)("$format/$style shows the placeholder with data-placeholder before selection", (variant) => {
    const trigger = renderVariant(variant, { items: FRUITS, placeholder: "Pick a fruit" });
    const value = trigger.querySelector("[data-slot='select-value']")!;
    expect(value.textContent).toBe("Pick a fruit");
    expect(value.hasAttribute("data-placeholder")).toBe(true);
  });

  test.each(selectVariants)("$format/$style selects on Enter, updates the trigger label, closes, and restores focus", async (variant) => {
    const { onValueChange, trigger, content } = await openSelect(variant);
    const first = content.querySelector("[role='option']") as HTMLElement;
    expect(document.activeElement).toBe(first);
    pressKey(content, "Enter");
    expect(onValueChange).toHaveBeenCalledWith("apple");
    expect(content.getAttribute("data-state")).toBe("closed");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    expect(trigger.textContent).toContain("Apple");
    const value = trigger.querySelector("[data-slot='select-value']")!;
    expect(value.hasAttribute("data-placeholder")).toBe(false);
  });

  test.each(selectVariants)("$format/$style opens with ArrowDown on the trigger", async (variant) => {
    const trigger = renderVariant(variant, { items: FRUITS });
    pressKey(trigger, "ArrowDown");
    const content = await awaitPortaled("select-content");
    expect(content.getAttribute("data-state")).toBe("open");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  test.each(selectVariants)("$format/$style roves arrows over data-highlighted with wrap and Home/End", async (variant) => {
    const { content } = await openSelect(variant);
    const options = [...content.querySelectorAll("[role='option']")] as HTMLElement[];
    expect(options[0]!.hasAttribute("data-highlighted")).toBe(true);
    pressKey(content, "ArrowDown");
    expect(document.activeElement).toBe(options[1]!);
    expect(options[1]!.hasAttribute("data-highlighted")).toBe(true);
    expect(options[0]!.hasAttribute("data-highlighted")).toBe(false);
    pressKey(content, "ArrowDown");
    pressKey(content, "ArrowDown");
    expect(document.activeElement).toBe(options[0]!);
    pressKey(content, "ArrowUp");
    expect(document.activeElement).toBe(options[2]!);
    pressKey(content, "Home");
    expect(document.activeElement).toBe(options[0]!);
    pressKey(content, "End");
    expect(document.activeElement).toBe(options[2]!);
  });

  test.each(selectVariants)("$format/$style focuses the first match on typeahead", async (variant) => {
    const { content } = await openSelect(variant);
    pressKey(content, "b");
    const options = [...content.querySelectorAll("[role='option']")] as HTMLElement[];
    expect(document.activeElement).toBe(options[1]!);
    expect(options[1]!.hasAttribute("data-highlighted")).toBe(true);
  });

  test.each(selectVariants)("$format/$style skips and styles disabled options", async (variant) => {
    const onValueChange = mock<(value: string) => void>(() => {});
    const trigger = renderVariant(variant, {
      items: [{ value: "apple", label: "Apple" }, { value: "blueberry", label: "Blueberry", disabled: true }, { value: "canteloupe", label: "Canteloupe" }],
      onValueChange,
    });
    trigger.dispatchEvent(new Event("click"));
    const content = await awaitPortaled("select-content");
    const options = [...content.querySelectorAll("[role='option']")] as HTMLElement[];
    const disabled = content.querySelector("[data-disabled]")!;
    expect(disabled.getAttribute("aria-disabled")).toBe("true");
    // Roving skips the disabled option; activation is blocked.
    pressKey(content, "ArrowDown");
    expect(document.activeElement).toBe(options[2]!);
    options[1]!.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(content.getAttribute("data-state")).toBe("open");
  });

  test.each(selectVariants)("$format/$style closes on Escape and on an outside pointerdown", async (variant) => {
    const first = await openSelect(variant);
    pressEscape();
    expect(first.content.getAttribute("data-state")).toBe("closed");
    expect(first.trigger.getAttribute("aria-expanded")).toBe("false");
    const second = await openSelect(variant);
    pointerDownOutside();
    expect(second.content.getAttribute("data-state")).toBe("closed");
  });

  test.each(selectVariants)("$format/$style toggles closed when the trigger is clicked again", async (variant) => {
    const { trigger, content } = await openSelect(variant);
    trigger.dispatchEvent(new Event("click"));
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(selectVariants)("$format/$style stretches the content to the trigger width and places it below", async (variant) => {
    const onValueChange = mock<(value: string) => void>(() => {});
    const trigger = renderVariant(variant, { items: FRUITS, onValueChange });
    pinRect(trigger, 50, 100, 200, 20);
    trigger.dispatchEvent(new Event("click"));
    const content = await awaitPortaled("select-content");
    expect(content.style.width).toBe("200px");
    expect(content.style.left).toBe("100px");
    expect(content.style.top).toBe("76px");
    expect(content.getAttribute("data-side")).toBe("bottom");
    expect(content.getAttribute("data-align")).toBe("start");
  });

  test.each(selectVariants)("$format/$style scrolls the selected option into view on open", async (variant) => {
    const spy = spyScrollIntoView();
    try {
      const onValueChange = mock<(value: string) => void>(() => {});
      const trigger = renderVariant(variant, { items: FRUITS, value: () => "blueberry", onValueChange });
      trigger.dispatchEvent(new Event("click"));
      const content = await awaitPortaled("select-content");
      await delay();
      const selected = content.querySelector("[aria-selected='true']") as Element;
      expect(spy.scrolled).toContain(selected);
      expect(document.activeElement).toBe(selected);
    } finally {
      spy.restore();
    }
  });

  test.each(selectVariants)("$format/$style hides scroll buttons at their edges and repeat-scrolls while hovered", async (variant) => {
    const onValueChange = mock<(value: string) => void>(() => {});
    const trigger = renderVariant(variant, { items: FRUITS, onValueChange });
    trigger.dispatchEvent(new Event("click"));
    const content = await awaitPortaled("select-content");
    let scrollTop = 0;
    Object.defineProperty(content, "scrollTop", { get: () => scrollTop, set: (v: number) => { scrollTop = v; }, configurable: true });
    Object.defineProperty(content, "scrollHeight", { get: () => 300, configurable: true });
    Object.defineProperty(content, "clientHeight", { get: () => 100, configurable: true });
    const up = content.querySelector("[data-slot='select-scroll-up-button']") as HTMLElement;
    const down = content.querySelector("[data-slot='select-scroll-down-button']") as HTMLElement;
    const scroll = (): void => {
      content.dispatchEvent(new Event("scroll"));
    };
    scroll();
    expect(up.style.visibility).toBe("hidden");
    expect(down.style.visibility).toBe("visible");
    scrollTop = 50;
    scroll();
    expect(up.style.visibility).toBe("visible");
    expect(down.style.visibility).toBe("visible");
    scrollTop = 200;
    scroll();
    expect(down.style.visibility).toBe("hidden");
    // Hovering repeats the step on an interval; leaving stops it (the
    // position freezes once the interval is gone).
    scrollTop = 50;
    up.dispatchEvent(new PointerEvent("pointerenter"));
    await delay(120);
    expect(scrollTop).toBeLessThan(50);
    up.dispatchEvent(new PointerEvent("pointerleave"));
    const afterLeave = scrollTop;
    await delay(120);
    expect(scrollTop).toBe(afterLeave);
  });

  test.each(selectVariants)("$format/$style clears the selection through the clear affordance without toggling", async (variant) => {
    const onValueChange = mock<(value: string) => void>(() => {});
    const trigger = renderVariant(variant, { items: FRUITS, clearable: true, value: () => "apple", onValueChange });
    const clear = trigger.querySelector("[data-slot='select-clear']")!;
    expect(clear).not.toBeNull();
    clear.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onValueChange).toHaveBeenCalledWith("");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.querySelector("[data-slot='select-content']")).toBeNull();
  });

  test.each(selectVariants)("$format/$style respects a controlled value accessor", async (variant) => {
    const current = signal("");
    const onValueChange = mock<(value: string) => void>(() => {});
    const trigger = renderVariant(variant, {
      items: FRUITS,
      value: () => current(),
      onValueChange: (next) => {
        current(next);
        onValueChange(next);
      },
    });
    trigger.dispatchEvent(new Event("click"));
    const content = await awaitPortaled("select-content");
    pressKey(content, "Enter");
    expect(current()).toBe("apple");
    expect(onValueChange).toHaveBeenCalledWith("apple");
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(selectVariants)("$format/$style reopens cleanly across open and close cycles", async (variant) => {
    const trigger = renderVariant(variant, { items: FRUITS });
    trigger.dispatchEvent(new Event("click"));
    const first = await awaitPortaled("select-content");
    pressEscape();
    expect(first.getAttribute("data-state")).toBe("closed");
    first.dispatchEvent(new Event("animationend"));
    await awaitDetached(first);
    trigger.dispatchEvent(new Event("click"));
    const second = await awaitPortaled("select-content");
    expect(second).not.toBe(first);
    expect(second.getAttribute("data-state")).toBe("open");
  });

  test.each(selectVariants)("$format/$style closes under Tab via the listbox keyboard model", async (variant) => {
    const { content } = await openSelect(variant);
    pressKey(content, "Tab");
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(selectVariants)("$format/$style unmounts the content through its exit animationend", async (variant) => {
    const { trigger, content } = await openSelect(variant);
    pressEscape();
    expect(content.getAttribute("data-state")).toBe("closed");
    content.dispatchEvent(new Event("animationend"));
    await awaitDetached(content);
    expect(trigger.isConnected).toBe(true);
  });

  test.each(selectVariants)("$format/$style unmounts every layer on disposal and drains its wirings", async (variant) => {
    const container = setupContainer();
    const handle = mount(variant.render({ items: FRUITS }), container);
    const trigger = container.firstElementChild as HTMLElement;
    expect(peekState(trigger)?.isMounted).toBe(true);
    trigger.dispatchEvent(new Event("click"));
    const content = await awaitPortaled("select-content");
    handle.unmount();
    await awaitDetached(content);
    expect(trigger.isConnected).toBe(false);
    pressEscape();
    pointerDownOutside();
    expect(content.isConnected).toBe(false);
  });

  test.each(selectVariants)("$format/$style forwards user attrs onto the trigger root across all four variants", (variant) => {
    const trigger = renderVariant(variant, { items: FRUITS, "aria-label": "fruit" });
    expect(trigger.getAttribute("aria-label")).toBe("fruit");
  });

  test.each(selectVariants)("$format/$style fires a user on:click handler on the trigger root across all four variants", (variant) => {
    const userClick = mock(() => {});
    const trigger = renderVariant(variant, { items: FRUITS, "on:click": userClick });
    trigger.dispatchEvent(new Event("click"));
    expect(userClick).toHaveBeenCalledTimes(1);
  });

  test.each(selectVariants)("$format/$style merges a user class into the trigger root's class across all four variants", (variant) => {
    const trigger = renderVariant(variant, { items: FRUITS, class: "user-class" });
    expect(classTokens(trigger).at(-1)).toBe("user-class");
  });

  test.each(selectPartVariants.filter((variant) => variant.part === "Trigger"))("$format/$style trigger part lands a user aria-controls and re-emits the id", (variant) => {
    const container = setupContainer();
    mount(variant.render({ children: [], id: "my-trigger", "aria-controls": "my-listbox" }), container);
    const trigger = container.firstElementChild!;
    expect(trigger.getAttribute("id")).toBe("my-trigger");
    expect(trigger.getAttribute("aria-controls")).toBe("my-listbox");
  });

  test.each(selectPartVariants.filter((variant) => variant.part === "Trigger"))("$format/$style trigger part leaves aria-controls to the caller when absent", (variant) => {
    const container = setupContainer();
    mount(variant.render({ children: [] }), container);
    expect(container.firstElementChild!.hasAttribute("aria-controls")).toBe(false);
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(selectVariants, { items: FRUITS, placeholder: "Parity" }, ["aria-controls"]);
  });

  test("renders every named part with its data-slot across all four variants", () => {
    for (const variant of selectPartVariants) {
      const container = setupContainer();
      const rendered = variant.render({ children: [] });
      mount(rendered, container);
      const el = container.firstElementChild!;
      const slot = variant.part === "ScrollUpButton" ? "select-scroll-up-button"
        : variant.part === "ScrollDownButton" ? "select-scroll-down-button"
        : `select-${variant.part.toLowerCase()}`;
      expect(el.getAttribute("data-slot")).toBe(slot);
    }
  });

  test.each(selectPartVariants.filter((variant) => variant.part === "Content"))("$format/$style content part anchors with matchAnchorWidth, dismisses, and drains wirings on disposal", (variant) => {
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
    expect(document.activeElement).toBe(content);
    pressEscape();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    handle.unmount();
    expect(content.isConnected).toBe(false);
  });

  test.each(selectPartVariants.filter((variant) => variant.part === "Trigger"))("$format/$style trigger part renders the clear affordance only while a value is selected", (variant) => {
    const onClear = mock(() => {});
    const container = setupContainer();
    const handle = mount(variant.render({ children: [], clearable: true, hasValue: () => true, onClear }), container);
    const trigger = container.firstElementChild as HTMLElement;
    const clear = trigger.querySelector("[data-slot='select-clear']")!;
    expect(clear).not.toBeNull();
    clear.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onClear).toHaveBeenCalledTimes(1);
    handle.unmount();
    const idle = renderVariant(variant, { children: [], clearable: true, hasValue: () => false, onClear });
    expect(idle.querySelector("[data-slot='select-clear']")).toBeNull();
  });

  test.each(selectPartVariants.filter((variant) => variant.part === "Trigger"))("$format/$style trigger part reports opens from click and ArrowDown", (variant) => {
    const onOpen = mock(() => {});
    const container = setupContainer();
    const handle = mount(variant.render({ children: [], onOpen }), container);
    const trigger = container.firstElementChild as HTMLElement;
    trigger.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    pressKey(trigger, "ArrowDown");
    expect(onOpen).toHaveBeenCalledTimes(2);
    pressKey(trigger, "ArrowLeft");
    expect(onOpen).toHaveBeenCalledTimes(2);
    handle.unmount();
  });

  test("builds content trees through the shared module table at each flavor", () => {
    for (const style of ["css", "tailwind"] as const) {
      for (const format of ["jsx", "html"] as const) {
        const Item = menuModulePart<{ value?: string; label?: string; selected?: boolean }>(selectModules, { style, format }, "SelectItem");
        expect(Item({ value: "a", label: "A" })).toBeDefined();
      }
    }
  });
});
