import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount and the component's roving wiring share one dom instance.
import { mount, peekState } from "@hellajs/dom";
import {
  assertAttrForwarded,
  assertHandlerForwarded,
  assertStructuralParity,
  classTokens,
} from "../../helpers/variants-core";
import { radioGroupVariants } from "./variants";
import type { ComponentVariant } from "../../helpers/variants-core";
import type { RadioGroupEntryVariant, RadioGroupVariantProps } from "./variants";

beforeEach(() => {
  resetTestState();
});

const items: RadioGroupVariantProps["items"] = [
  { value: "alpha", label: "Alpha" },
  { value: "beta", label: "Beta" },
  { value: "gamma", label: "Gamma" },
];

interface MountedRadioGroup {
  container: HTMLElement;
  root: HTMLElement;
  items: HTMLElement[];
}

/** Mounts a radio-group variant into a fresh container and resolves its root and item buttons. */
function mountRadioGroup(
  variant: ComponentVariant<RadioGroupVariantProps>,
  props: RadioGroupVariantProps,
): MountedRadioGroup {
  const container = setupContainer();
  const rendered = variant.render(props);
  mount(rendered, container);
  const root = container.firstElementChild as HTMLElement;
  const renderedItems = Array.from(root.querySelectorAll("[role='radio']")) as HTMLElement[];
  return { container, root, items: renderedItems };
}

/** Polls (microtask hops) until the observer-driven mount walk has wired the root's afterMount hooks. */
async function awaitWiring(root: HTMLElement): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (peekState(root)?.isMounted) return;
    await delay();
  }
  expect(peekState(root)?.isMounted).toBe(true);
}

/** Dispatches a bubbling keydown at a radio item; rovingTabIndex listens on the radiogroup ancestor. */
function press(item: HTMLElement, key: string): void {
  item.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

describe("radio-group", () => {
  test.each(radioGroupVariants)(
    "$style nests label rows with the item button and label text inside the radiogroup",
    (variant) => {
      const { root, items: rendered } = mountRadioGroup(variant, { items });
      expect(root.getAttribute("role")).toBe("radiogroup");
      expect(root.getAttribute("data-slot")).toBe("radio-group");
      expect(rendered).toHaveLength(3);
      const row = rendered[0]!.closest("[data-slot='radio-group-row']") as HTMLElement;
      expect(row).not.toBeNull();
      expect(row.textContent).toContain("Alpha");
      expect(row.querySelector("[role='radio']")).toBe(rendered[0]!);
    },
  );

  test.each(radioGroupVariants)(
    "$style checks only the controlled value's item with its indicator icon and roves tabindex onto it",
    async (variant) => {
      const { root, items: rendered } = mountRadioGroup(variant, { items, value: () => "beta" });
      await awaitWiring(root);
      expect(rendered.map((item) => item.getAttribute("aria-checked"))).toEqual([
        "false",
        "true",
        "false",
      ]);
      flush();
      expect(rendered.map((item) => item.getAttribute("data-state"))).toEqual([
        "unchecked",
        "checked",
        "unchecked",
      ]);
      flush();
      expect(rendered[1]!.querySelector("[data-slot='radio-group-indicator'] svg")).not.toBeNull();
      expect(rendered[0]!.querySelector("[data-slot='radio-group-indicator'] svg")).toBeNull();
      expect(rendered.map((item) => item.tabIndex)).toEqual([-1, 0, -1]);
    },
  );

  test.each(radioGroupVariants)(
    "$style selects on click and fires onValueChange with the new value",
    async (variant) => {
      const onValueChange = vi.fn((value: string) => value);
      const { items: rendered } = mountRadioGroup(variant, { items, onValueChange });
      await awaitWiring(rendered[0]!.closest("[role='radiogroup']") as HTMLElement);
      rendered[2]!.dispatchEvent(new Event("click"));
      flush();
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange.mock.calls[0]).toEqual(["gamma"]);
      expect(rendered.map((item) => item.getAttribute("aria-checked"))).toEqual([
        "false",
        "false",
        "true",
      ]);
      // Radios never unset: clicking the active item is a no-op.
      rendered[2]!.dispatchEvent(new Event("click"));
      flush();
      expect(onValueChange).toHaveBeenCalledTimes(1);
    },
  );

  test.each(radioGroupVariants)(
    "$style keeps clicks from writing a controlled value that ignores the request",
    async (variant) => {
      const value = signal("alpha");
      const onValueChange = vi.fn((next: string) => next);
      const { items: rendered } = mountRadioGroup(variant, {
        items,
        value: () => value(),
        onValueChange,
      });
      await awaitWiring(rendered[0]!.closest("[role='radiogroup']") as HTMLElement);
      rendered[1]!.dispatchEvent(new Event("click"));
      flush();
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange.mock.calls[0]).toEqual(["beta"]);
      expect(rendered.map((item) => item.getAttribute("aria-checked"))).toEqual([
        "true",
        "false",
        "false",
      ]);
    },
  );

  test.each(radioGroupVariants)(
    "$style moves focus with the arrows, wrapping at both ends, and roves tabindex",
    async (variant) => {
      const onValueChange = vi.fn((value: string) => value);
      const { items: rendered } = mountRadioGroup(variant, {
        items,
        value: () => "alpha",
        onValueChange,
      });
      await awaitWiring(rendered[0]!.closest("[role='radiogroup']") as HTMLElement);
      rendered[0]!.focus();
      flush();
      expect(document.activeElement).toBe(rendered[0]!);
      press(rendered[0]!, "ArrowRight");
      flush();
      expect(document.activeElement).toBe(rendered[1]!);
      // Selection follows focus: the arrow lands on beta and checks it.
      expect(onValueChange.mock.calls.at(-1)).toEqual(["beta"]);
      expect(rendered.map((item) => item.tabIndex)).toEqual([-1, 0, -1]);
      press(rendered[1]!, "ArrowRight");
      flush();
      expect(document.activeElement).toBe(rendered[2]!);
      press(rendered[2]!, "ArrowLeft");
      flush();
      expect(document.activeElement).toBe(rendered[1]!);
      rendered[0]!.focus();
      press(rendered[0]!, "ArrowUp");
      flush();
      expect(document.activeElement).toBe(rendered[2]!);
      press(rendered[2]!, "ArrowDown");
      flush();
      expect(document.activeElement).toBe(rendered[0]!);
    },
  );

  test.each(radioGroupVariants)(
    "$style skips disabled items in the arrow walk and blocks their clicks",
    async (variant) => {
      const onValueChange = vi.fn((value: string) => value);
      const disabledItems: RadioGroupVariantProps["items"] = [
        { value: "alpha", label: "Alpha" },
        { value: "beta", label: "Beta", disabled: true },
        { value: "gamma", label: "Gamma" },
      ];
      const { items: rendered } = mountRadioGroup(variant, {
        items: disabledItems,
        value: () => "alpha",
        onValueChange,
      });
      await awaitWiring(rendered[0]!.closest("[role='radiogroup']") as HTMLElement);
      expect(rendered[1]!.hasAttribute("disabled")).toBe(true);
      rendered[0]!.focus();
      press(rendered[0]!, "ArrowRight");
      flush();
      expect(document.activeElement).toBe(rendered[2]!);
      expect(onValueChange.mock.calls.at(-1)).toEqual(["gamma"]);
      rendered[1]!.dispatchEvent(new Event("click"));
      flush();
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(rendered[1]!.getAttribute("aria-checked")).toBe("false");
    },
  );

  test.each(radioGroupVariants)("$style renders aria-orientation when given", (variant) => {
    const { root } = mountRadioGroup(variant, { items, orientation: "horizontal" });
    expect(root.getAttribute("aria-orientation")).toBe("horizontal");
  });

  test.each(radioGroupVariants)(
    "$style disposes the roving and selection wiring when the root unmounts",
    async (variant) => {
      const onValueChange = vi.fn((value: string) => value);
      const { root, items: rendered } = mountRadioGroup(variant, {
        items,
        value: () => "alpha",
        onValueChange,
      });
      await awaitWiring(root);
      rendered[0]!.focus();
      // Removing the root from its observed mount container runs the destroy hooks.
      root.remove();
      for (let i = 0; i < 50; i++) {
        if (!peekState(root)) break;
        await delay();
      }
      expect(peekState(root)).toBeUndefined();
      rendered[0]!.focus();
      const before = document.activeElement;
      press(rendered[0]!, "ArrowRight");
      flush();
      expect(document.activeElement).toBe(before);
      rendered[1]!.dispatchEvent(new Event("click"));
      flush();
      expect(onValueChange).not.toHaveBeenCalled();
    },
  );

  test("forwards user attrs onto the root across both styles", () => {
    assertAttrForwarded(radioGroupVariants, { items, title: "Hella" }, "title", "Hella");
  });

  test("fires a user on:click handler on the root across both styles", () => {
    const onClick = vi.fn(() => {});
    assertHandlerForwarded(
      radioGroupVariants,
      { items, "on:click": onClick },
      "on:click",
      "click",
      onClick,
    );
  });

  test.each(radioGroupVariants)("$style merges props.class into the class attribute", (variant) => {
    const { root } = mountRadioGroup(variant, { items, class: "my-radio-group" });
    expect(classTokens(root).at(-1)).toBe("my-radio-group");
  });

  test.each(radioGroupVariants)(
    "$style re-renders a signal items list across append, remove, and reorder",
    (variant) => {
      const liveItems = signal<RadioGroupEntryVariant[]>([...items]);
      const { root } = mountRadioGroup(variant, { items: liveItems });
      const values = () =>
        Array.from(root.querySelectorAll("[role='radio']")).map((el) => el.getAttribute("value"));
      flush();
      expect(values()).toEqual(["alpha", "beta", "gamma"]);
      liveItems([...liveItems(), { value: "delta", label: "Delta" }]);
      flush();
      expect(values()).toEqual(["alpha", "beta", "gamma", "delta"]);
      liveItems(liveItems().filter((entry) => entry.value !== "beta"));
      flush();
      expect(values()).toEqual(["alpha", "gamma", "delta"]);
      liveItems([liveItems()[2]!, liveItems()[0]!, liveItems()[1]!]);
      flush();
      expect(values()).toEqual(["delta", "alpha", "gamma"]);
    },
  );

  test.each(radioGroupVariants)(
    "$style reuses the checked item's row through a reorder when keyBy is value",
    async (variant) => {
      const liveItems = signal<RadioGroupEntryVariant[]>([...items]);
      const { root } = mountRadioGroup(variant, { items: liveItems, keyBy: "value" });
      await awaitWiring(root);
      const rows = () =>
        Array.from(root.querySelectorAll("[data-slot='radio-group-row']")) as HTMLElement[];
      rows()[1]!.querySelector("[role='radio']")!.dispatchEvent(new Event("click"));
      const rowBefore = rows()[1]!;
      flush();
      expect(rowBefore.querySelector("[role='radio']")!.getAttribute("aria-checked")).toBe("true");
      liveItems([liveItems()[2]!, liveItems()[0]!, liveItems()[1]!]);
      flush();
      expect(rows().map((el) => el.querySelector("[role='radio']")!.getAttribute("value"))).toEqual(
        ["gamma", "alpha", "beta"],
      );
      const rowAfter = rows()[2]!;
      expect(rowAfter).toBe(rowBefore);
      expect(rowAfter.querySelector("[role='radio']")!.getAttribute("aria-checked")).toBe("true");
    },
  );

  test.each(radioGroupVariants)(
    "$style keeps the reconciliation key out of the markup when keyBy is value",
    (variant) => {
      const { root } = mountRadioGroup(variant, { items, keyBy: "value" });
      expect(root.outerHTML).not.toContain("key=");
    },
  );

  test("keeps structural parity across both styles", () => {
    assertStructuralParity(radioGroupVariants, { items });
    assertStructuralParity(radioGroupVariants, { items, orientation: "vertical", name: "plan" });
  });
});
