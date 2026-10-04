import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { delay, resetTestState, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount and the component's roving wiring share one dom instance.
import { html, mount, peekState } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  toggleGroupPartVariants,
  toggleGroupVariants,
} from "./helpers/variants";
import type { ComponentVariant, ToggleGroupVariantProps } from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

const items: ToggleGroupVariantProps["items"] = [
  { value: "bold", label: "Bold" },
  { value: "italic", label: "Italic" },
  { value: "underline", label: "Underline" },
];

interface MountedToggleGroup {
  container: HTMLElement;
  root: HTMLElement;
  items: HTMLElement[];
}

/** Mounts a toggle-group variant into a fresh container and resolves its root and item buttons. */
function mountToggleGroup(variant: ComponentVariant<ToggleGroupVariantProps>, props: ToggleGroupVariantProps): MountedToggleGroup {
  const container = setupContainer();
  const rendered = variant.render(props);
  // A reactive fn root cannot pass through mount's resolve-once unwrap — wrap it like the harness does.
  mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered, container);
  const root = container.firstElementChild as HTMLElement;
  const renderedItems = Array.from(root.querySelectorAll("[data-slot='toggle-group-item']")) as HTMLElement[];
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

/** Dispatches a bubbling keydown at an item; rovingTabIndex listens on the group ancestor. */
function press(item: HTMLElement, key: string): void {
  item.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

describe("toggle-group", () => {
  test.each(toggleGroupVariants)("$format/$style renders the group with every item as a pressed-off button", async (variant) => {
    const { root, items: rendered } = mountToggleGroup(variant, { items, type: "single" });
    await awaitWiring(root);
    expect(root.getAttribute("role")).toBe("group");
    expect(root.getAttribute("data-slot")).toBe("toggle-group");
    expect(root.getAttribute("data-variant")).toBe("default");
    expect(root.getAttribute("data-size")).toBe("default");
    expect(root.getAttribute("data-spacing")).toBe("0");
    expect(rendered).toHaveLength(3);
    expect(rendered.map((item) => item.getAttribute("aria-pressed"))).toEqual(["false", "false", "false"]);
    expect(rendered.map((item) => item.getAttribute("data-state"))).toEqual(["off", "off", "off"]);
    expect(rendered[0]!.textContent).toContain("Bold");
  });

  test.each(toggleGroupVariants)("$format/$style seeds uncontrolled single selection from the pressed item and deselects on re-click", async (variant) => {
    const onValueChange = mock((value: string | string[]) => value);
    const seeded: ToggleGroupVariantProps["items"] = [items[0]!, { ...items[1]!, pressed: true }, items[2]!];
    const { items: rendered } = mountToggleGroup(variant, { items: seeded, type: "single", onValueChange });
    await awaitWiring(rendered[0]!.closest("[role='group']") as HTMLElement);
    expect(rendered.map((item) => item.getAttribute("data-state"))).toEqual(["off", "on", "off"]);
    rendered[2]!.dispatchEvent(new Event("click"));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]).toEqual(["underline"]);
    expect(rendered.map((item) => item.getAttribute("data-state"))).toEqual(["off", "off", "on"]);
    // Single mode unsets the active item on re-click, reporting "".
    rendered[2]!.dispatchEvent(new Event("click"));
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange.mock.calls[1]).toEqual([""]);
    expect(rendered.map((item) => item.getAttribute("data-state"))).toEqual(["off", "off", "off"]);
  });

  test.each(toggleGroupVariants)("$format/$style toggles multiple membership and reports the full array payload", async (variant) => {
    const onValueChange = mock((value: string | string[]) => value);
    const { items: rendered } = mountToggleGroup(variant, { items, type: "multiple", onValueChange });
    await awaitWiring(rendered[0]!.closest("[role='group']") as HTMLElement);
    rendered[0]!.dispatchEvent(new Event("click"));
    rendered[2]!.dispatchEvent(new Event("click"));
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange.mock.calls[0]).toEqual([["bold"]]);
    expect(onValueChange.mock.calls[1]).toEqual([["bold", "underline"]]);
    expect(rendered.map((item) => item.getAttribute("aria-pressed"))).toEqual(["true", "false", "true"]);
    rendered[0]!.dispatchEvent(new Event("click"));
    expect(onValueChange.mock.calls[2]).toEqual([["underline"]]);
  });

  test.each(toggleGroupVariants)("$format/$style drives selection from controlled accessors without writing them", async (variant) => {
    const value = signal("bold");
    const values = signal(["bold", "italic"]);
    const onValueChange = mock((v: string | string[]) => v);
    const single = mountToggleGroup(variant, { items, type: "single", value: () => value(), onValueChange });
    const multiple = mountToggleGroup(variant, { items, type: "multiple", values: () => values(), onValueChange });
    await awaitWiring(single.root);
    expect(single.items[0]!.getAttribute("data-state")).toBe("on");
    value("underline");
    flush();
    expect(single.items.map((item) => item.getAttribute("data-state"))).toEqual(["off", "off", "on"]);
    single.items[0]!.dispatchEvent(new Event("click"));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]).toEqual(["bold"]);
    expect(single.items[0]!.getAttribute("data-state")).toBe("off");
    await awaitWiring(multiple.root);
    multiple.items[2]!.dispatchEvent(new Event("click"));
    expect(onValueChange).toHaveBeenCalledTimes(2);
    expect(onValueChange.mock.calls[1]).toEqual([["bold", "italic", "underline"]]);
    expect(values()).toEqual(["bold", "italic"]);
  });

  test.each(toggleGroupVariants)("$format/$style moves focus with the arrows and roves tabindex without changing selection", async (variant) => {
    const onValueChange = mock((value: string | string[]) => value);
    const { items: rendered } = mountToggleGroup(variant, { items, type: "single", onValueChange });
    await awaitWiring(rendered[0]!.closest("[role='group']") as HTMLElement);
    rendered[0]!.focus();
    press(rendered[0]!, "ArrowRight");
    expect(document.activeElement).toBe(rendered[1]!);
    expect(rendered.map((item) => item.tabIndex)).toEqual([-1, 0, -1]);
    // Arrows only move focus; selection stays untouched.
    expect(onValueChange).not.toHaveBeenCalled();
    expect(rendered.map((item) => item.getAttribute("data-state"))).toEqual(["off", "off", "off"]);
    press(rendered[1]!, "ArrowRight");
    expect(document.activeElement).toBe(rendered[2]!);
    press(rendered[2]!, "ArrowLeft");
    expect(document.activeElement).toBe(rendered[1]!);
    rendered[0]!.focus();
    press(rendered[0]!, "ArrowUp");
    expect(document.activeElement).toBe(rendered[2]!);
  });

  test.each(toggleGroupVariants)("$format/$style skips disabled items in the arrow walk and blocks their clicks", async (variant) => {
    const onValueChange = mock((value: string | string[]) => value);
    const disabledItems: ToggleGroupVariantProps["items"] = [items[0]!, { ...items[1]!, disabled: true }, items[2]!];
    const { items: rendered } = mountToggleGroup(variant, { items: disabledItems, type: "single", onValueChange });
    await awaitWiring(rendered[0]!.closest("[role='group']") as HTMLElement);
    expect(rendered[1]!.hasAttribute("disabled")).toBe(true);
    rendered[0]!.focus();
    press(rendered[0]!, "ArrowRight");
    expect(document.activeElement).toBe(rendered[2]!);
    rendered[1]!.dispatchEvent(new Event("click"));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(rendered[1]!.getAttribute("data-state")).toBe("off");
  });

  test.each(toggleGroupVariants)("$format/$style threads variant and size onto the root and every item", async (variant) => {
    const { root, items: rendered } = mountToggleGroup(variant, { items, type: "single", variant: "outline", size: "sm" });
    await awaitWiring(root);
    expect(root.getAttribute("data-variant")).toBe("outline");
    expect(root.getAttribute("data-size")).toBe("sm");
    for (const item of rendered) {
      expect(item.getAttribute("data-variant")).toBe("outline");
      expect(item.getAttribute("data-size")).toBe("sm");
    }
    if (variant.style === "tailwind") {
      expect(classTokens(rendered[0]!)).toContain("data-[spacing=0]:rounded-none");
    }
  });

  test.each(toggleGroupVariants)("$format/$style disposes the roving wiring when the root unmounts", async (variant) => {
    const onValueChange = mock((value: string | string[]) => value);
    const { root, items: rendered } = mountToggleGroup(variant, { items, type: "single", onValueChange });
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
    expect(document.activeElement).toBe(before);
    rendered[1]!.dispatchEvent(new Event("click"));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(toggleGroupVariants, { items, type: "single" });
    assertStructuralParity(toggleGroupVariants, { items, type: "multiple", variant: "outline", size: "lg" });
  });

  test("renders the manual item part with its joined-segment classes and pressed state across all four variants", () => {
    for (const variant of toggleGroupPartVariants) {
      const container = setupContainer();
      const rendered = variant.render({ value: "bold", pressed: () => true, variant: "outline", size: "sm", children: "Bold" });
      mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered, container);
      const el = container.firstElementChild as HTMLElement;
      expect(el.getAttribute("data-slot")).toBe("toggle-group-item");
      expect(el.getAttribute("aria-pressed")).toBe("true");
      expect(el.getAttribute("data-state")).toBe("on");
      expect(el.getAttribute("data-variant")).toBe("outline");
      expect(el.getAttribute("data-size")).toBe("sm");
      expect(el.getAttribute("data-spacing")).toBe("0");
      const tokens = classTokens(el);
      if (variant.style === "tailwind") {
        expect(tokens).toContain("data-[spacing=0]:rounded-none");
        expect(tokens).toContain("data-[spacing=0]:data-[variant=outline]:border-l-0");
      } else {
        expect(tokens.some((token) => token.startsWith("toggle-group-item"))).toBe(true);
      }
    }
  });
});
