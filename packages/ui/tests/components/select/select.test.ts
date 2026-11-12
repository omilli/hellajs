import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
import { mount, peekState } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  renderVariant,
  type ComponentVariant,
} from "../../helpers/variants-core";
import { selectVariants } from "./variants";
import type { SelectEntryVariant, SelectVariantProps } from "./variants";
import {
  awaitDetached,
  awaitPortaled,
  pinRect,
  pointerDownOutside,
  pressEscape,
  pressKey,
} from "../../helpers/anchored";
import { FRUITS, openSelect, spyScrollIntoView } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("select", () => {
  test.each(selectVariants)(
    "$style opens on click with listbox aria on trigger and content",
    async (variant) => {
      const { trigger, content } = await openSelect(variant);
      expect(content.getAttribute("data-state")).toBe("open");
      expect(content.getAttribute("role")).toBe("listbox");
      expect(trigger.getAttribute("data-state")).toBe("open");
      expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(trigger.getAttribute("aria-controls")).toBe(content.id);
    },
  );

  test.each(selectVariants)(
    "$style shows the placeholder with data-placeholder before selection",
    (variant) => {
      const trigger = renderVariant(variant, { items: FRUITS, placeholder: "Pick a fruit" });
      const value = trigger.querySelector("[data-slot='select-value']")!;
      expect(value.textContent).toBe("Pick a fruit");
      expect(value.hasAttribute("data-placeholder")).toBe(true);
    },
  );

  test.each(selectVariants)(
    "$style closes on Escape and on an outside pointerdown",
    async (variant) => {
      const first = await openSelect(variant);
      pressEscape();
      flush();
      expect(first.content.getAttribute("data-state")).toBe("closed");
      expect(first.trigger.getAttribute("aria-expanded")).toBe("false");
      const second = await openSelect(variant);
      pointerDownOutside();
      flush();
      expect(second.content.getAttribute("data-state")).toBe("closed");
    },
  );

  test.each(selectVariants)(
    "$style toggles closed when the trigger is clicked again",
    async (variant) => {
      const { trigger, content } = await openSelect(variant);
      trigger.dispatchEvent(new Event("click"));
      flush();
      expect(content.getAttribute("data-state")).toBe("closed");
    },
  );

  test.each(selectVariants)(
    "$style stretches the content to the trigger width and places it below",
    async (variant) => {
      const onValueChange = vi.fn<(value: string) => void>(() => {});
      const trigger = renderVariant(variant, { items: FRUITS, onValueChange });
      pinRect(trigger, 50, 100, 200, 20);
      trigger.dispatchEvent(new Event("click"));
      const content = await awaitPortaled("select-content");
      expect(content.style.width).toBe("200px");
      expect(content.style.left).toBe("100px");
      expect(content.style.top).toBe("76px");
      expect(content.getAttribute("data-side")).toBe("bottom");
      expect(content.getAttribute("data-align")).toBe("start");
    },
  );

  test.each(selectVariants)(
    "$style scrolls the selected option into view on open",
    async (variant) => {
      const spy = spyScrollIntoView();
      try {
        const onValueChange = vi.fn<(value: string) => void>(() => {});
        const trigger = renderVariant(variant, {
          items: FRUITS,
          value: () => "blueberry",
          onValueChange,
        });
        trigger.dispatchEvent(new Event("click"));
        const content = await awaitPortaled("select-content");
        await delay();
        const selected = content.querySelector("[aria-selected='true']") as Element;
        expect(spy.scrolled).toContain(selected);
        expect(document.activeElement).toBe(selected);
      } finally {
        spy.restore();
      }
    },
  );

  test.each(selectVariants)(
    "$style hides scroll buttons at their edges and repeat-scrolls while hovered",
    async (variant) => {
      const onValueChange = vi.fn<(value: string) => void>(() => {});
      const trigger = renderVariant(variant, { items: FRUITS, onValueChange });
      trigger.dispatchEvent(new Event("click"));
      const content = await awaitPortaled("select-content");
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
      const scroll = (): void => {
        content.dispatchEvent(new Event("scroll"));
      };
      scroll();
      flush();
      expect(up.style.visibility).toBe("hidden");
      expect(down.style.visibility).toBe("visible");
      scrollTop = 50;
      scroll();
      flush();
      expect(up.style.visibility).toBe("visible");
      expect(down.style.visibility).toBe("visible");
      scrollTop = 200;
      scroll();
      flush();
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
    },
  );

  test.each(selectVariants)(
    "$style clears the selection through the clear affordance without toggling",
    async (variant) => {
      const onValueChange = vi.fn<(value: string) => void>(() => {});
      const trigger = renderVariant(variant, {
        items: FRUITS,
        clearable: true,
        value: () => "apple",
        onValueChange,
      });
      const clear = trigger.querySelector("[data-slot='select-clear']")!;
      expect(clear).not.toBeNull();
      clear.dispatchEvent(new Event("click", { bubbles: true }));
      flush();
      expect(onValueChange).toHaveBeenCalledWith("");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(trigger.querySelector("[data-slot='select-content']")).toBeNull();
    },
  );

  test.each(selectVariants)("$style respects a controlled value accessor", async (variant) => {
    const current = signal("");
    const onValueChange = vi.fn<(value: string) => void>(() => {});
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
    flush();
    expect(current()).toBe("apple");
    expect(onValueChange).toHaveBeenCalledWith("apple");
    flush();
    expect(content.getAttribute("data-state")).toBe("closed");
  });

  test.each(selectVariants)(
    "$style reopens cleanly across open and close cycles",
    async (variant) => {
      const trigger = renderVariant(variant, { items: FRUITS });
      trigger.dispatchEvent(new Event("click"));
      const first = await awaitPortaled("select-content");
      pressEscape();
      flush();
      expect(first.getAttribute("data-state")).toBe("closed");
      first.dispatchEvent(new Event("animationend"));
      await awaitDetached(first);
      trigger.dispatchEvent(new Event("click"));
      const second = await awaitPortaled("select-content");
      expect(second).not.toBe(first);
      expect(second.getAttribute("data-state")).toBe("open");
    },
  );

  test.each(selectVariants)(
    "$style unmounts the content through its exit animationend",
    async (variant) => {
      const { trigger, content } = await openSelect(variant);
      pressEscape();
      flush();
      expect(content.getAttribute("data-state")).toBe("closed");
      content.dispatchEvent(new Event("animationend"));
      await awaitDetached(content);
      expect(trigger.isConnected).toBe(true);
    },
  );

  test.each(selectVariants)(
    "$style unmounts every layer on disposal and drains its wirings",
    async (variant) => {
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
      flush();
      expect(content.isConnected).toBe(false);
    },
  );

  test.each(selectVariants)(
    "$style forwards user attrs onto the trigger root across both styles",
    (variant) => {
      const trigger = renderVariant(variant, { items: FRUITS, "aria-label": "fruit" });
      expect(trigger.getAttribute("aria-label")).toBe("fruit");
    },
  );

  test.each(selectVariants)(
    "$style merges a user class into the trigger root's class across both styles",
    (variant) => {
      const trigger = renderVariant(variant, { items: FRUITS, class: "user-class" });
      expect(classTokens(trigger).at(-1)).toBe("user-class");
    },
  );

  test.each(selectVariants)(
    "$style re-renders a signal items list across append, remove, and reorder",
    async (variant) => {
      const liveItems = signal<SelectEntryVariant[]>([...FRUITS]);
      const { content } = await openSelect(variant, { items: liveItems });
      const values = () =>
        [...content.querySelectorAll("[role='option']")].map((el) => el.getAttribute("data-value"));
      flush();
      expect(values()).toEqual(["apple", "blueberry", "canteloupe"]);
      liveItems([...liveItems(), { value: "date", label: "Date" }]);
      flush();
      expect(values()).toEqual(["apple", "blueberry", "canteloupe", "date"]);
      liveItems(liveItems().filter((entry) => entry.value !== "blueberry"));
      flush();
      expect(values()).toEqual(["apple", "canteloupe", "date"]);
      liveItems([liveItems()[2]!, liveItems()[0]!, liveItems()[1]!]);
      flush();
      expect(values()).toEqual(["date", "apple", "canteloupe"]);
    },
  );

  test.each(selectVariants)(
    "$style reuses the selected item's node through a reorder when keyBy is value",
    async (variant) => {
      const liveItems = signal<SelectEntryVariant[]>([...FRUITS]);
      const { content } = await openSelect(variant, {
        items: liveItems,
        value: () => "blueberry",
        keyBy: "value",
      });
      const itemEls = () => [...content.querySelectorAll("[role='option']")] as HTMLElement[];
      const blueberryBefore = itemEls().find(
        (el) => el.getAttribute("data-value") === "blueberry",
      )!;
      expect(blueberryBefore.getAttribute("data-state")).toBe("checked");
      liveItems([liveItems()[2]!, liveItems()[0]!, liveItems()[1]!]);
      flush();
      expect(itemEls().map((el) => el.getAttribute("data-value"))).toEqual([
        "canteloupe",
        "apple",
        "blueberry",
      ]);
      const blueberryAfter = itemEls().find((el) => el.getAttribute("data-value") === "blueberry")!;
      expect(blueberryAfter).toBe(blueberryBefore);
      expect(blueberryAfter.getAttribute("data-state")).toBe("checked");
    },
  );

  test.each(selectVariants)(
    "$style keeps the reconciliation key out of the markup when keyBy is value",
    async (variant) => {
      const { content } = await openSelect(variant, { items: FRUITS, keyBy: "value" });
      expect(content.outerHTML).not.toContain("key=");
    },
  );

  test("keeps structural parity across both styles", () => {
    assertStructuralParity(selectVariants, { items: FRUITS, placeholder: "Parity" }, [
      "aria-controls",
    ]);
  });
});
