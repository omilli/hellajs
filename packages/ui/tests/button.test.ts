import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertStructuralParity,
  buttonVariants,
  classTokens,
  renderVariant,
} from "./helpers/variants";
import type { ButtonVariantProps } from "./helpers/variants";

const VARIANT_OPTIONS = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const;
const SIZE_OPTIONS = ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"] as const;

/** Discriminating tailwind utility tokens per variant option (first token is unique per option). */
const VARIANT_TOKENS: Record<(typeof VARIANT_OPTIONS)[number], string[]> = {
  default: ["bg-primary", "text-primary-foreground", "hover:bg-primary/90"],
  destructive: ["bg-destructive", "text-white", "dark:bg-destructive/60"],
  outline: ["shadow-xs", "dark:bg-input/30", "hover:bg-accent"],
  secondary: ["bg-secondary", "text-secondary-foreground", "hover:bg-secondary/80"],
  ghost: ["hover:bg-accent", "dark:hover:bg-accent/50"],
  link: ["text-primary", "underline-offset-4", "hover:underline"],
};

/** Tailwind utility tokens per size option (first token is unique per option). */
const SIZE_TOKENS: Record<(typeof SIZE_OPTIONS)[number], string[]> = {
  default: ["h-9", "px-4", "py-2", "has-[>svg]:px-3"],
  xs: ["h-6", "gap-1", "text-xs", "has-[>svg]:px-1.5"],
  sm: ["h-8", "gap-1.5", "has-[>svg]:px-2.5"],
  lg: ["h-10", "px-6", "has-[>svg]:px-4"],
  icon: ["size-9"],
  "icon-xs": ["size-6", "rounded-md"],
  "icon-sm": ["size-8"],
  "icon-lg": ["size-10"],
};

/** Variant-unique tokens for the cross-option exclusion assertions (shared utilities like hover:bg-accent excluded). */
const VARIANT_UNIQUE: Record<(typeof VARIANT_OPTIONS)[number], string> = {
  default: "bg-primary",
  destructive: "bg-destructive",
  outline: "dark:bg-input/30",
  secondary: "bg-secondary",
  ghost: "dark:hover:bg-accent/50",
  link: "underline-offset-4",
};

/** True when a hashed class token's label segment (token minus the trailing hash) equals `label`. */
function hasLabel(token: string | undefined, label: string): boolean {
  return token !== undefined && token.slice(0, token.lastIndexOf("-")) === label;
}

/** The children bag every render needs (html flavors take the value, jsx flavors an array). */
function propsOf(variant: (typeof buttonVariants)[number], extra: Partial<ButtonVariantProps>): ButtonVariantProps {
  return { children: variant.child("Save"), ...extra };
}

beforeEach(() => {
  resetTestState();
});

describe("button", () => {
  test.each(buttonVariants)("$format/$style renders a button element with its data-slot attributes", (variant) => {
    const btn = renderVariant(variant, propsOf(variant, { variant: "ghost", size: "lg" }));
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.getAttribute("data-slot")).toBe("button");
    expect(btn.getAttribute("data-variant")).toBe("ghost");
    expect(btn.getAttribute("data-size")).toBe("lg");
  });

  test.each(buttonVariants)("$format/$style fires the onclick handler on click", (variant) => {
    const onclick = mock(() => {});
    const btn = renderVariant(variant, propsOf(variant, { onclick }));
    btn.dispatchEvent(new Event("click"));
    expect(onclick).toHaveBeenCalledTimes(1);
  });

  test.each(buttonVariants)("$format/$style applies every variant's tokens at a representative size", (variant) => {
    for (const option of VARIANT_OPTIONS) {
      const btn = renderVariant(variant, propsOf(variant, { variant: option, size: "lg" }));
      const tokens = classTokens(btn);
      if (variant.style === "css") {
        expect(tokens[1]!.startsWith(`h-hella-button-${option}-`)).toBe(true);
        expect(tokens[2]!.startsWith("h-hella-button-size-lg-")).toBe(true);
      } else {
        for (const token of VARIANT_TOKENS[option]) expect(tokens).toContain(token);
      }
      for (const other of VARIANT_OPTIONS) {
        if (other === option) continue;
        if (variant.style === "css") {
          expect(hasLabel(tokens[1], `h-hella-button-${other}`)).toBe(false);
        } else {
          expect(tokens).not.toContain(VARIANT_UNIQUE[other]);
        }
      }
    }
  });

  test.each(buttonVariants)("$format/$style applies every size's tokens at the default variant", (variant) => {
    for (const option of SIZE_OPTIONS) {
      const btn = renderVariant(variant, propsOf(variant, { size: option }));
      const tokens = classTokens(btn);
      if (variant.style === "css") {
        expect(hasLabel(tokens[2], `h-hella-button-size-${option}`)).toBe(true);
      } else {
        for (const token of SIZE_TOKENS[option]) expect(tokens).toContain(token);
      }
      for (const other of SIZE_OPTIONS) {
        if (other === option) continue;
        if (variant.style === "css") {
          expect(hasLabel(tokens[2], `h-hella-button-size-${other}`)).toBe(false);
        } else {
          expect(tokens).not.toContain(SIZE_TOKENS[other][0]!);
        }
      }
    }
  });

  test.each(buttonVariants)("$format/$style defaults to the default variant and size", (variant) => {
    const btn = renderVariant(variant, propsOf(variant, {}));
    const tokens = classTokens(btn);
    expect(btn.getAttribute("data-variant")).toBe("default");
    expect(btn.getAttribute("data-size")).toBe("default");
    if (variant.style === "css") {
      expect(tokens[1]!.startsWith("h-hella-button-default-")).toBe(true);
      expect(tokens[2]!.startsWith("h-hella-button-size-default-")).toBe(true);
    } else {
      expect(tokens).toContain("bg-primary");
      expect(tokens).toContain("h-9");
    }
  });

  test.each(buttonVariants)("$format/$style sets aria-invalid only from the prop", (variant) => {
    const invalid = renderVariant(variant, propsOf(variant, { ariaInvalid: true }));
    expect(invalid.getAttribute("aria-invalid")).toBe("true");
    const valid = renderVariant(variant, propsOf(variant, {}));
    expect(valid.hasAttribute("aria-invalid")).toBe(false);
  });

  test.each(buttonVariants)("$format/$style merges props.class into the class attribute", (variant) => {
    const btn = renderVariant(variant, propsOf(variant, { class: "my-btn" }));
    const tokens = classTokens(btn);
    if (variant.style === "css") {
      expect(tokens).toHaveLength(4);
      expect(tokens[0]!.startsWith("h-hella-button-")).toBe(true);
      expect(tokens[1]!.startsWith("h-hella-button-default-")).toBe(true);
      expect(tokens[2]!.startsWith("h-hella-button-size-default-")).toBe(true);
      expect(tokens[3]).toBe("my-btn");
    } else {
      expect(tokens.at(-1)).toBe("my-btn");
      expect(tokens).toContain("bg-primary");
      expect(tokens).toContain("h-9");
    }
  });

  test.each(buttonVariants)("$format/$style renders bare-signal children reactively", (variant) => {
    const label = signal("Save");
    const btn = renderVariant(variant, propsOf(variant, { children: variant.child(label) }));
    expect(btn.textContent).toBe("Save");
    label("Saved");
    flush();
    expect(btn.textContent).toBe("Saved");
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(buttonVariants);
  });
});
