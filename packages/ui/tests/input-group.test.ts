import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState, setupContainer } from "@utils/test-helpers.js";
import { html, mount } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  inputGroupPartVariants,
  inputGroupVariants,
  renderVariant,
} from "./helpers/variants";
import type { ChildrenVariant, InputGroupVariantProps } from "./helpers/variants";
import type { UiFormat, UiStyle } from "@hellajs/ui";

beforeEach(() => {
  resetTestState();
});

/** Renders one part node from the PartVariant matching the given flavor (children-spreading parts default to an empty list). */
function partNode(variant: { style: UiStyle; format: UiFormat }, part: string, props: Record<string, unknown> = {}): unknown {
  const flavor = inputGroupPartVariants.find((candidate) => candidate.part === part
    && candidate.style === variant.style && candidate.format === variant.format)!;
  const merged = ["Addon", "Button", "Text"].includes(part) && props.children === undefined
    ? { children: [], ...props }
    : props;
  return (flavor.render as (props: Record<string, unknown>) => unknown)(merged);
}

/** Mounts an InputGroup with a composed child tree and returns the group root. */
function mountGroup(variant: ChildrenVariant<InputGroupVariantProps>, children: unknown[]): HTMLElement {
  const container = setupContainer();
  const rendered = variant.render({ children } as InputGroupVariantProps);
  mount(typeof rendered === "function" ? html`<div>${rendered as never}</div>` : rendered, container);
  return container.firstElementChild as HTMLElement;
}

describe("input-group", () => {
  test.each(inputGroupVariants)("$format/$style renders the group role, slot, and base composition", (variant) => {
    const root = renderVariant(variant, { children: variant.child!("x") });
    expect(root.getAttribute("data-slot")).toBe("input-group");
    expect(root.getAttribute("role")).toBe("group");
    const tokens = classTokens(root);
    if (variant.style === "css") {
      expect(tokens[0]!.startsWith("h-hella-input-group")).toBe(true);
    } else {
      expect(tokens).toContain("group/input-group");
      expect(tokens).toContain("h-9");
    }
    expect(root.textContent).toBe("x");
  });

  test.each(inputGroupVariants)("$format/$style renders data-disabled from the disabled prop", (variant) => {
    const bare = renderVariant(variant, { children: variant.child!("x") });
    expect(bare.hasAttribute("data-disabled")).toBe(false);
    const disabled = renderVariant(variant, { disabled: true, children: variant.child!("x") });
    expect(disabled.getAttribute("data-disabled")).toBe("true");
  });

  test.each(inputGroupVariants)("$format/$style carries the focus-visible :has ring wiring at the class level", (variant) => {
    const root = renderVariant(variant, { children: variant.child!("x") });
    const tokens = classTokens(root);
    if (variant.style === "css") {
      // The hashed base class owns the &:has([data-slot='input-group-control']:focus-visible) rule.
      expect(tokens.filter((token) => token.startsWith("h-hella-input-group"))).toHaveLength(1);
    } else {
      expect(tokens).toContain("has-[[data-slot=input-group-control]:focus-visible]:border-ring");
      expect(tokens).toContain("has-[[data-slot=input-group-control]:focus-visible]:ring-[3px]");
      expect(tokens).toContain("has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50");
    }
  });

  test.each(inputGroupPartVariants.filter((variant) => variant.part === "Addon"))("$part $format/$style renders align variants", (variant) => {
    const start = renderVariant(variant, { align: "inline-start", children: ["x"] });
    expect(start.getAttribute("data-align")).toBe("inline-start");
    const block = renderVariant(variant, { align: "block-end", children: ["x"] });
    expect(block.getAttribute("data-align")).toBe("block-end");
    if (variant.style === "css") {
      const tokens = classTokens(block);
      expect(tokens.some((token) => token.startsWith("h-hella-input-group-addon-block-end"))).toBe(true);
    } else {
      expect(classTokens(block)).toContain("order-last");
    }
  });

  test("addon click focuses the group's input", () => {
    for (const variant of inputGroupVariants) {
      const root = mountGroup(variant, [partNode(variant, "Addon"), partNode(variant, "Input", { ariaLabel: "target" })]);
      const addon = root.querySelector("[data-slot='input-group-addon']") as HTMLElement;
      const input = root.querySelector("input") as HTMLInputElement;
      addon.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(document.activeElement).toBe(input);
    }
  });

  test("addon click over a button child does not steal focus", () => {
    for (const variant of inputGroupVariants) {
      const root = mountGroup(variant, [
        partNode(variant, "Addon", { children: [partNode(variant, "Button")] }),
        partNode(variant, "Input", { ariaLabel: "target" }),
      ]);
      const button = root.querySelector("[data-slot='button']") as HTMLElement;
      const input = root.querySelector("input") as HTMLInputElement;
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(document.activeElement).not.toBe(input);
    }
  });

  test.each(inputGroupPartVariants.filter((variant) => variant.part === "Button"))("$part $format/$style composes the button base, ghost variant, and group size", (variant) => {
    const root = renderVariant(variant, { children: ["x"] });
    expect(root.getAttribute("data-slot")).toBe("button");
    expect(root.getAttribute("data-variant")).toBe("ghost");
    expect(root.getAttribute("data-size")).toBe("xs");
    expect(root.getAttribute("type")).toBe("button");
    if (variant.style === "css") {
      const tokens = classTokens(root);
      expect(tokens.some((token) => token.startsWith("h-hella-input-group-button-ghost"))).toBe(true);
      expect(tokens.some((token) => token.startsWith("h-hella-input-group-size-xs"))).toBe(true);
    } else {
      expect(classTokens(root)).toContain("rounded-[calc(var(--radius)-5px)]");
    }
  });

  test.each(inputGroupPartVariants.filter((variant) => variant.part === "Text"))("$part $format/$style renders the text span", (variant) => {
    const root = renderVariant(variant, { children: ["hint"] });
    expect(root.tagName).toBe("SPAN");
    expect(root.getAttribute("data-slot")).toBe("input-group-text");
    expect(root.textContent).toBe("hint");
  });

  test.each(inputGroupPartVariants.filter((variant) => variant.part === "Input" || variant.part === "Textarea"))("$part $format/$style carries the input-group-control slot with the stripped ring", (variant) => {
    const root = renderVariant(variant, { placeholder: "type" });
    expect(root.getAttribute("data-slot")).toBe("input-group-control");
    expect(root.getAttribute("placeholder")).toBe("type");
    const tokens = classTokens(root);
    if (variant.style === "css") {
      expect(tokens.some((token) => token.startsWith(`h-hella-input-group-${variant.part.toLowerCase()}-control`))).toBe(true);
    } else {
      expect(tokens).toContain("focus-visible:ring-0");
      expect(tokens).toContain("border-0");
    }
  });

  test("textarea control renders the textarea tag and row passthrough", () => {
    for (const variant of inputGroupPartVariants.filter((candidate) => candidate.part === "Textarea")) {
      const root = renderVariant(variant, { rows: 4 });
      expect(root.tagName).toBe("TEXTAREA");
      expect(root.getAttribute("rows")).toBe("4");
    }
  });

  test("all four flavors agree on tag and attributes", () => {
    assertStructuralParity(inputGroupVariants, { children: ["x"] });
    assertStructuralParity(inputGroupVariants, { disabled: true, children: ["x"] });
  });
});
