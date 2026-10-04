import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertStructuralParity,
  classTokens,
  kbdPartVariants,
  kbdVariants,
  renderVariant,
} from "./helpers/variants";

/** Verbatim shadcn utility tokens — asserted in the tailwind flavor. */
const TOKENS = {
  base: ["pointer-events-none", "inline-flex", "h-5", "min-w-5", "rounded-sm", "bg-muted", "px-1", "font-sans", "text-xs", "text-muted-foreground", "select-none", "[&_svg:not([class*='size-'])]:size-3", "[[data-slot=tooltip-content]_&]:bg-background/20"],
  group: ["inline-flex", "items-center", "gap-1"],
};

beforeEach(() => {
  resetTestState();
});

describe("kbd", () => {
  test.each(kbdVariants)("$format/$style renders the kbd root with its data-slot and class merge", (variant) => {
    const kbd = renderVariant(variant, { children: variant.child("⌘K"), class: "my-kbd" });
    expect(kbd.tagName).toBe("KBD");
    expect(kbd.getAttribute("data-slot")).toBe("kbd");
    const tokens = classTokens(kbd);
    expect(tokens.at(-1)).toBe("my-kbd");
    if (variant.style === "css") {
      expect(tokens).toHaveLength(2);
      expect(tokens[0]!.startsWith("kbd-")).toBe(true);
    } else {
      for (const token of TOKENS.base) expect(tokens).toContain(token);
    }
  });

  test.each(kbdVariants)("$format/$style renders children directly", (variant) => {
    const kbd = renderVariant(variant, { children: variant.child("⌘K") });
    expect(kbd.textContent).toBe("⌘K");
  });

  test.each(kbdPartVariants)("$format/$style KbdGroup renders its data-slot and classes", (variant) => {
    const group = renderVariant(variant, { children: [], class: "my-group" });
    expect(group.tagName).toBe("KBD");
    expect(group.getAttribute("data-slot")).toBe("kbd-group");
    const tokens = classTokens(group);
    expect(tokens.at(-1)).toBe("my-group");
    if (variant.style === "css") {
      expect(tokens[0]!.startsWith("kbd-group-")).toBe(true);
    } else {
      for (const token of TOKENS.group) expect(tokens).toContain(token);
    }
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(kbdVariants);
  });

  test("keeps structural parity for KbdGroup across all four variants", () => {
    const suites = kbdPartVariants.filter((variant) => variant.part === "Group");
    assertStructuralParity(suites, { children: [] });
  });
});
