import { describe, test, expect, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertStructuralParity,
  classTokens,
  itemPartVariants,
  itemVariants,
  renderVariant,
} from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

describe("item", () => {
  test.each(itemPartVariants)("$part $format/$style renders its slot", (variant) => {
    const bare = variant.part === "Separator";
    const root = renderVariant(variant, bare ? {} : { children: ["x"] });
    if (bare) {
      expect(root.getAttribute("data-slot")).toBe("item-separator");
      expect(root.getAttribute("role")).toBe("separator");
      expect(root.getAttribute("data-orientation")).toBe("horizontal");
      return;
    }
    expect(root.getAttribute("data-slot")).toBe(`item-${variant.part.toLowerCase()}`);
    expect(root.textContent).toBe("x");
  });

  test.each(itemVariants)("$part $format/$style renders variant and size attributes with matching classes", (variant) => {
    const muted = renderVariant(variant, { variant: "muted", size: "sm", children: ["x"] });
    expect(muted.getAttribute("data-variant")).toBe("muted");
    expect(muted.getAttribute("data-size")).toBe("sm");
    if (variant.style === "css") {
      const tokens = classTokens(muted);
      expect(tokens.some((token) => token.startsWith("h-hella-item-muted"))).toBe(true);
      expect(tokens.some((token) => token.startsWith("h-hella-item-size-sm"))).toBe(true);
    } else {
      const tokens = classTokens(muted);
      expect(tokens).toContain("bg-muted/50");
      expect(tokens).toContain("gap-2.5");
    }
  });

  test.each(itemVariants)("$part $format/$style renders selected state from a static boolean", (variant) => {
    const unselected = renderVariant(variant, { children: ["x"] });
    expect(unselected.getAttribute("data-selected")).toBe("false");
    expect(unselected.getAttribute("aria-selected")).toBe("false");
    const selected = renderVariant(variant, { selected: true, children: ["x"] });
    expect(selected.getAttribute("data-selected")).toBe("true");
    expect(selected.getAttribute("aria-selected")).toBe("true");
  });

  test.each(itemVariants)("$part $format/$style tracks a reactive selected() signal", (variant) => {
    const selected = signal(true);
    const root = renderVariant(variant, { selected: () => selected(), children: ["x"] });
    expect(root.getAttribute("data-selected")).toBe("true");
    expect(root.getAttribute("aria-selected")).toBe("true");
    selected(false);
    flush();
    expect(root.getAttribute("data-selected")).toBe("false");
    expect(root.getAttribute("aria-selected")).toBe("false");
  });

  test.each(itemPartVariants.filter((variant) => variant.part === "Media"))("$part $format/$style renders media variants", (variant) => {
    const icon = renderVariant(variant, { variant: "icon", children: ["x"] });
    expect(icon.getAttribute("data-variant")).toBe("icon");
    if (variant.style === "css") {
      expect(classTokens(icon).some((token) => token.startsWith("h-hella-item-media-icon"))).toBe(true);
    } else {
      expect(classTokens(icon)).toContain("size-8");
    }
    const image = renderVariant(variant, { variant: "image", children: ["x"] });
    expect(image.getAttribute("data-variant")).toBe("image");
  });

  test.each(itemPartVariants.filter((variant) => variant.part === "Title" || variant.part === "Description"))("$part $format/$style renders the text parts", (variant) => {
    const root = renderVariant(variant, { children: ["content"] });
    expect(root.textContent).toBe("content");
    if (variant.part === "Description") {
      expect(root.tagName).toBe("P");
    } else {
      expect(root.tagName).toBe("DIV");
    }
  });

  test("all four flavors agree on tag and attributes", () => {
    assertStructuralParity(itemVariants, { selected: true, variant: "outline", size: "sm", children: ["x"] });
    assertStructuralParity(itemPartVariants.filter((candidate) => candidate.part === "Media"), { variant: "icon", children: ["x"] });
  });
});
