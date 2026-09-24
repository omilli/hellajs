import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount shares one dom instance with the components.
import { html, mount } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  switchVariants,
} from "./helpers/variants";
import type { ComponentVariant, SwitchVariantProps } from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

/** Mounts a switch variant into a fresh container and resolves its root button and thumb. */
function mountSwitch(variant: ComponentVariant<SwitchVariantProps>, props: SwitchVariantProps) {
  const container = setupContainer();
  const rendered = variant.render(props);
  // A reactive fn root cannot pass through mount's resolve-once unwrap — wrap it like the harness does.
  mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered, container);
  const root = container.firstElementChild as HTMLElement;
  const thumb = root.querySelector("[data-slot='switch-thumb']") as HTMLElement;
  return { root, thumb };
}

describe("switch", () => {
  test.each(switchVariants)("$format/$style renders unchecked by default and toggles on click", (variant) => {
    const { root, thumb } = mountSwitch(variant, {});
    expect(root.getAttribute("role")).toBe("switch");
    expect(root.getAttribute("aria-checked")).toBe("false");
    expect(root.getAttribute("data-state")).toBe("unchecked");
    expect(thumb.getAttribute("data-state")).toBe("unchecked");
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-checked")).toBe("true");
    expect(root.getAttribute("data-state")).toBe("checked");
    expect(thumb.getAttribute("data-state")).toBe("checked");
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-checked")).toBe("false");
  });

  test.each(switchVariants)("$format/$style is a native button, so the platform Space activation drives toggle()", (variant) => {
    // Native button activation (Space/Enter) synthesizes a click in browsers; the
    // test asserts the mechanism — the toggle rides click, so keyboard activation works.
    const { root } = mountSwitch(variant, {});
    expect(root.tagName).toBe("BUTTON");
    expect(root.getAttribute("type")).toBe("button");
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-checked")).toBe("true");
  });

  test.each(switchVariants)("$format/$style reports each flip through onCheckedChange", (variant) => {
    const onCheckedChange = mock((checked: boolean) => checked);
    const { root } = mountSwitch(variant, { onCheckedChange });
    root.dispatchEvent(new Event("click"));
    root.dispatchEvent(new Event("click"));
    expect(onCheckedChange).toHaveBeenCalledTimes(2);
    expect(onCheckedChange.mock.calls[0]).toEqual([true]);
    expect(onCheckedChange.mock.calls[1]).toEqual([false]);
  });

  test.each(switchVariants)("$format/$style drives state from a controlled checked() signal and keeps clicks from writing it", (variant) => {
    const checked = signal(true);
    const onCheckedChange = mock((checked: boolean) => checked);
    const { root } = mountSwitch(variant, { checked: () => checked(), onCheckedChange });
    expect(root.getAttribute("aria-checked")).toBe("true");
    checked(false);
    flush();
    expect(root.getAttribute("aria-checked")).toBe("false");
    root.dispatchEvent(new Event("click"));
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange.mock.calls[0]).toEqual([true]);
    expect(root.getAttribute("aria-checked")).toBe("false");
  });

  test.each(switchVariants)("$format/$style blocks clicks while disabled", (variant) => {
    const onCheckedChange = mock((checked: boolean) => checked);
    const { root } = mountSwitch(variant, { disabled: true, onCheckedChange });
    expect(root.hasAttribute("disabled")).toBe(true);
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-checked")).toBe("false");
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  test.each(switchVariants)("$format/$style carries the state classes for the thumb translation on both flavors", (variant) => {
    const { root, thumb } = mountSwitch(variant, { checked: true });
    if (variant.style === "tailwind") {
      expect(classTokens(thumb)).toContain("data-[state=checked]:translate-x-[calc(100%-2px)]");
      expect(classTokens(root)).toContain("data-[size=default]:h-[1.15rem]");
    } else {
      expect(classTokens(thumb).some((token) => token.startsWith("h-hella-switch-thumb"))).toBe(true);
    }
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(switchVariants, {});
    assertStructuralParity(switchVariants, { checked: true, disabled: true });
  });
});
