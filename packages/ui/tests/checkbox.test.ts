import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
// The bare "@hellajs/dom" index, not the bundle: the compiled registry components import the bare
// specifier, so the harness mount shares one dom instance with the components.
import { html, mount } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  checkboxVariants,
} from "./helpers/variants";
import type { CheckboxVariantProps, ComponentVariant } from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

/** Mounts a checkbox variant into a fresh container and resolves its root button and indicator. */
function mountCheckbox(variant: ComponentVariant<CheckboxVariantProps>, props: CheckboxVariantProps) {
  const container = setupContainer();
  const rendered = variant.render(props);
  // A reactive fn root cannot pass through mount's resolve-once unwrap — wrap it like the harness does.
  mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered, container);
  const root = container.firstElementChild as HTMLElement;
  const indicator = root.querySelector("[data-slot='checkbox-indicator']") as HTMLElement;
  return { root, indicator };
}

describe("checkbox", () => {
  test.each(checkboxVariants)("$format/$style renders unchecked by default and cycles checked on click", (variant) => {
    const { root, indicator } = mountCheckbox(variant, {});
    expect(root.getAttribute("role")).toBe("checkbox");
    expect(root.getAttribute("aria-checked")).toBe("false");
    expect(root.getAttribute("data-state")).toBe("unchecked");
    expect(indicator.querySelector("svg")).toBeNull();
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-checked")).toBe("true");
    expect(root.getAttribute("data-state")).toBe("checked");
    const icon = indicator.querySelector("svg path");
    expect(icon).not.toBeNull();
    expect(icon!.getAttribute("d")).toBe("M20 6 9 17l-5-5");
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-checked")).toBe("false");
    expect(root.getAttribute("data-state")).toBe("unchecked");
    expect(indicator.querySelector("svg")).toBeNull();
  });

  test.each(checkboxVariants)("$format/$style renders indeterminate as aria-checked mixed with the indicator present, and clicking reports checked", (variant) => {
    const onCheckedChange = mock((checked: boolean) => checked);
    const { root } = mountCheckbox(variant, { indeterminate: true, onCheckedChange });
    expect(root.getAttribute("aria-checked")).toBe("mixed");
    expect(root.getAttribute("data-state")).toBe("indeterminate");
    expect(root.querySelector("[data-slot='checkbox-indicator'] svg")).not.toBeNull();
    root.dispatchEvent(new Event("click"));
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange.mock.calls[0]).toEqual([true]);
    // The uncontrolled mixed state clears on click: the checkbox lands checked.
    expect(root.getAttribute("aria-checked")).toBe("true");
    expect(root.getAttribute("data-state")).toBe("checked");
  });

  test.each(checkboxVariants)("$format/$style reports every requested flip through onCheckedChange in order", (variant) => {
    const onCheckedChange = mock((checked: boolean) => checked);
    const { root } = mountCheckbox(variant, { onCheckedChange });
    root.dispatchEvent(new Event("click"));
    root.dispatchEvent(new Event("click"));
    expect(onCheckedChange).toHaveBeenCalledTimes(2);
    expect(onCheckedChange.mock.calls[0]).toEqual([true]);
    expect(onCheckedChange.mock.calls[1]).toEqual([false]);
  });

  test.each(checkboxVariants)("$format/$style drives state from a controlled checked() signal and keeps clicks from writing it", (variant) => {
    const checked = signal(false);
    const onCheckedChange = mock((checked: boolean) => checked);
    const { root } = mountCheckbox(variant, { checked: () => checked(), onCheckedChange });
    expect(root.getAttribute("aria-checked")).toBe("false");
    checked(true);
    flush();
    expect(root.getAttribute("aria-checked")).toBe("true");
    expect(root.getAttribute("data-state")).toBe("checked");
    root.dispatchEvent(new Event("click"));
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange.mock.calls[0]).toEqual([false]);
    expect(root.getAttribute("aria-checked")).toBe("true");
  });

  test.each(checkboxVariants)("$format/$style blocks clicks while disabled", (variant) => {
    const onCheckedChange = mock((checked: boolean) => checked);
    const { root } = mountCheckbox(variant, { disabled: true, onCheckedChange });
    expect(root.hasAttribute("disabled")).toBe(true);
    root.dispatchEvent(new Event("click"));
    expect(root.getAttribute("aria-checked")).toBe("false");
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  test.each(checkboxVariants)("$format/$style renders aria-invalid and the id when given", (variant) => {
    const { root } = mountCheckbox(variant, { ariaInvalid: true, id: "terms" });
    expect(root.getAttribute("aria-invalid")).toBe("true");
    expect(root.id).toBe("terms");
    if (variant.style === "tailwind") {
      expect(classTokens(root)).toContain("aria-invalid:border-destructive");
    }
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(checkboxVariants, {});
    assertStructuralParity(checkboxVariants, { checked: true, ariaInvalid: true, disabled: true });
  });
});
