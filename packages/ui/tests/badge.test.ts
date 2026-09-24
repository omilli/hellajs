import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { assertStructuralParity, badgeVariants, classTokens, renderVariant } from "./helpers/variants";
import type { BadgeVariantProps } from "./helpers/variants";

/** Verbatim shadcn utility tokens per variant — asserted in the tailwind flavor. */
const VARIANT_TOKENS: Record<string, string[]> = {
  default: ["bg-primary", "text-primary-foreground", "[a&]:hover:bg-primary/90"],
  secondary: ["bg-secondary", "text-secondary-foreground", "[a&]:hover:bg-secondary/90"],
  destructive: ["bg-destructive", "text-white", "dark:bg-destructive/60", "[a&]:hover:bg-destructive/90"],
  outline: ["border-border", "text-foreground", "[a&]:hover:bg-accent", "[a&]:hover:text-accent-foreground"],
  ghost: ["[a&]:hover:bg-accent", "[a&]:hover:text-accent-foreground"],
  link: ["text-primary", "underline-offset-4", "[a&]:hover:underline"],
};

/** Base tokens shared by every variant. */
const BASE_TOKENS = ["inline-flex", "rounded-full", "border-transparent", "px-2", "py-0.5", "text-xs", "whitespace-nowrap", "focus-visible:ring-ring/50", "aria-invalid:border-destructive"];

beforeEach(() => {
  resetTestState();
});

describe("badge", () => {
  test.each(badgeVariants)("$format/$style renders the span root with its data-slot and class merge", (variant) => {
    const badge = renderVariant(variant, { children: variant.child("New"), class: "my-badge" });
    expect(badge.tagName).toBe("SPAN");
    expect(badge.getAttribute("data-slot")).toBe("badge");
    expect(badge.getAttribute("data-variant")).toBe("default");
    const tokens = classTokens(badge);
    expect(tokens.at(-1)).toBe("my-badge");
    if (variant.style === "css") {
      expect(tokens).toHaveLength(3);
      expect(tokens[0]!.startsWith("h-hella-badge-")).toBe(true);
      expect(tokens[1]!.startsWith("h-hella-badge-default-")).toBe(true);
    } else {
      for (const token of [...BASE_TOKENS, ...VARIANT_TOKENS.default!]) expect(tokens).toContain(token);
    }
  });

  test.each(badgeVariants)("$format/$style renders every variant's token set and data-variant", (variant) => {
    for (const [name, tokens] of Object.entries(VARIANT_TOKENS)) {
      const badge = renderVariant(variant, { children: variant.child("X"), variant: name as BadgeVariantProps["variant"] });
      expect(badge.getAttribute("data-variant")).toBe(name);
      const classes = classTokens(badge);
      if (variant.style === "css") {
        expect(classes[1]!.startsWith(`h-hella-badge-${name}-`)).toBe(true);
      } else {
        for (const token of tokens!) expect(classes).toContain(token);
      }
    }
  });

  test.each(badgeVariants)("$format/$style reflects the ariaInvalid prop on the root", (variant) => {
    const badge = renderVariant(variant, { children: variant.child("X"), ariaInvalid: true });
    expect(badge.getAttribute("aria-invalid")).toBe("true");
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(badgeVariants);
  });
});
