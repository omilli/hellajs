import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertStructuralParity,
  classTokens,
  renderVariant,
  separatorVariants,
} from "./helpers/variants";
import type { SeparatorVariantProps } from "./helpers/variants";

/** Verbatim shadcn utility tokens — one data-conditional base serves both orientations. */
const BASE_TOKENS = ["shrink-0", "bg-border", "data-[orientation=horizontal]:h-px", "data-[orientation=horizontal]:w-full", "data-[orientation=vertical]:h-full", "data-[orientation=vertical]:w-px"];

beforeEach(() => {
  resetTestState();
});

describe("separator", () => {
  test.each(separatorVariants)("$format/$style renders the horizontal default with separator semantics", (variant) => {
    const separator = renderVariant(variant, { children: variant.child(""), class: "my-sep" });
    expect(separator.tagName).toBe("DIV");
    expect(separator.getAttribute("data-slot")).toBe("separator");
    expect(separator.getAttribute("role")).toBe("separator");
    expect(separator.getAttribute("data-orientation")).toBe("horizontal");
    expect(separator.getAttribute("aria-orientation")).toBe("horizontal");
    const tokens = classTokens(separator);
    expect(tokens.at(-1)).toBe("my-sep");
    if (variant.style === "css") {
      expect(tokens).toHaveLength(2);
      expect(tokens[0]!.startsWith("h-hella-separator-")).toBe(true);
    } else {
      for (const token of BASE_TOKENS) expect(tokens).toContain(token);
    }
  });

  test.each(separatorVariants)("$format/$style reflects the vertical orientation on both data attributes", (variant) => {
    const separator = renderVariant(variant, { children: variant.child(""), orientation: "vertical" });
    expect(separator.getAttribute("data-orientation")).toBe("vertical");
    expect(separator.getAttribute("aria-orientation")).toBe("vertical");
    if (variant.style === "tailwind") {
      const tokens = classTokens(separator);
      for (const token of BASE_TOKENS) expect(tokens).toContain(token);
    }
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(separatorVariants);
  });

  test("keeps structural parity for the vertical orientation across all four variants", () => {
    assertStructuralParity(separatorVariants, { orientation: "vertical" } as SeparatorVariantProps);
  });
});
