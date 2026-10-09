import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount shares one dom instance with the components.
import { html, mount } from "@hellajs/dom";
import {
  assertAttrForwarded,
  assertHandlerForwarded,
  assertStructuralParity,
  classTokens,
  toggleVariants,
} from "./helpers/variants";
import type { ChildrenVariant, ToggleVariantProps } from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

/** Mounts a toggle variant into a fresh container with a child label. */
function mountToggle(variant: ChildrenVariant<ToggleVariantProps>, props: ToggleVariantProps) {
  const container = setupContainer();
  const rendered = variant.render(props);
  // A reactive fn root cannot pass through mount's resolve-once unwrap — wrap it like the harness does.
  mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered, container);
  return container.firstElementChild as HTMLElement;
}

describe("toggle", () => {
  test.each(toggleVariants)("$format/$style renders its label child and starts unpressed", (variant) => {
    const root = mountToggle(variant, { children: variant.child("Bold") });
    expect(root.getAttribute("data-slot")).toBe("toggle");
    expect(root.getAttribute("aria-pressed")).toBe("false");
    expect(root.getAttribute("data-state")).toBe("off");
    expect(root.textContent).toContain("Bold");
  });

  test.each(toggleVariants)("$format/$style flips aria-pressed and data-state on click", (variant) => {
    const root = mountToggle(variant, { children: variant.child("Bold") });
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-pressed")).toBe("true");
    expect(root.getAttribute("data-state")).toBe("on");
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-pressed")).toBe("false");
    expect(root.getAttribute("data-state")).toBe("off");
  });

  test.each(toggleVariants)("$format/$style reports each flip through onPressedChange", (variant) => {
    const onPressedChange = mock((pressed: boolean) => pressed);
    const root = mountToggle(variant, { onPressedChange, children: variant.child("Bold") });
    root.dispatchEvent(new Event("click"));
    root.dispatchEvent(new Event("click"));
    expect(onPressedChange).toHaveBeenCalledTimes(2);
    expect(onPressedChange.mock.calls[0]).toEqual([true]);
    expect(onPressedChange.mock.calls[1]).toEqual([false]);
  });

  test.each(toggleVariants)("$format/$style drives state from a controlled pressed() signal and keeps clicks from writing it", (variant) => {
    const pressed = signal(false);
    const onPressedChange = mock((pressed: boolean) => pressed);
    const root = mountToggle(variant, { pressed: () => pressed(), onPressedChange, children: variant.child("Bold") });
    pressed(true);
    flush();
    expect(root.getAttribute("aria-pressed")).toBe("true");
    expect(root.getAttribute("data-state")).toBe("on");
    root.dispatchEvent(new Event("click"));
    expect(onPressedChange).toHaveBeenCalledTimes(1);
    expect(onPressedChange.mock.calls[0]).toEqual([false]);
    expect(root.getAttribute("aria-pressed")).toBe("true");
  });

  test.each(toggleVariants)("$format/$style seeds the uncontrolled state from a boolean pressed", (variant) => {
    const root = mountToggle(variant, { pressed: true, children: variant.child("Bold") });
    expect(root.getAttribute("aria-pressed")).toBe("true");
    expect(root.getAttribute("data-state")).toBe("on");
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-pressed")).toBe("false");
  });

  test.each(toggleVariants)("$format/$style blocks clicks while disabled", (variant) => {
    const onPressedChange = mock((pressed: boolean) => pressed);
    const root = mountToggle(variant, { disabled: true, onPressedChange, children: variant.child("Bold") });
    expect(root.hasAttribute("disabled")).toBe(true);
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-pressed")).toBe("false");
    expect(onPressedChange).not.toHaveBeenCalled();
  });

  test.each(toggleVariants)("$format/$style applies the variant and size maps with the outline and lg selections", (variant) => {
    const outlineLg = mountToggle(variant, { variant: "outline", size: "lg", children: variant.child("Bold") });
    const tokens = classTokens(outlineLg);
    if (variant.style === "tailwind") {
      expect(tokens).toContain("border");
      expect(tokens).toContain("border-input");
      expect(tokens).toContain("shadow-xs");
      expect(tokens).toContain("h-10");
      expect(tokens).toContain("min-w-10");
      expect(tokens).toContain("px-2.5");
    } else {
      expect(tokens.some((token) => token.startsWith("toggle-outline"))).toBe(true);
      expect(tokens.some((token) => token.startsWith("toggle-size-lg"))).toBe(true);
    }
    // data-state=on styling rides the base class on both flavors.
    outlineLg.dispatchEvent(new Event("click"));
    if (variant.style === "tailwind") {
      expect(classTokens(outlineLg)).toContain("data-[state=on]:bg-accent");
    }
  });

  test.each(toggleVariants)("$format/$style chains a user on:click with the owned toggle", (variant) => {
    const userClick = mock(function (this: HTMLElement, e: Event) { void e; });
    const root = mountToggle(variant, { "on:click": userClick, children: variant.child("Bold") });
    root.dispatchEvent(new Event("click"));
    expect(userClick).toHaveBeenCalledTimes(1);
    expect(root.getAttribute("aria-pressed")).toBe("true");
    expect(root.getAttribute("data-state")).toBe("on");
  });

  test("forwards user attrs onto the root across all four variants", () => {
    assertAttrForwarded(toggleVariants, { title: "Hella", children: "Forwarded" } as never, "title", "Hella");
  });

  test("fires a forwarded on:click handler across all four variants", () => {
    const onClick = mock(() => {});
    assertHandlerForwarded(toggleVariants, { "on:click": onClick, children: "Forwarded" } as never, "on:click", "click", onClick);
  });

  test.each(toggleVariants)("$format/$style merges props.class into the class attribute", (variant) => {
    const root = mountToggle(variant, { class: "my-toggle", children: variant.child("Bold") });
    expect(classTokens(root).at(-1)).toBe("my-toggle");
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(toggleVariants, { children: "Bold" } as never);
    assertStructuralParity(toggleVariants, { pressed: true, variant: "outline", size: "sm", disabled: true, children: "Bold" } as never);
  });
});
