import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertAttrForwarded,
  assertHandlerForwarded,
  assertStructuralParity,
  classTokens,
  markerPartVariants,
  markerVariants,
  renderVariant,
} from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

describe("marker", () => {
  test.each(markerVariants)("$format/$style renders the marker root with the default variant", (variant) => {
    const root = renderVariant(variant, { children: variant.child!("text") });
    expect(root.getAttribute("data-slot")).toBe("marker");
    expect(root.getAttribute("data-variant")).toBe("default");
    expect(root.textContent).toBe("text");
    if (variant.style === "css") {
      const tokens = classTokens(root).filter((token) => token.startsWith("marker"));
      expect(tokens[0]!.startsWith("marker")).toBe(true);
    } else {
      expect(classTokens(root)).toContain("text-muted-foreground");
    }
  });

  test.each(markerVariants)("$format/$style renders the separator variant with its rule pseudo-elements", (variant) => {
    const root = renderVariant(variant, { variant: "separator", children: variant.child!("text") });
    expect(root.getAttribute("data-variant")).toBe("separator");
    if (variant.style === "css") {
      expect(classTokens(root).some((token) => token.startsWith("marker-separator"))).toBe(true);
    } else {
      const tokens = classTokens(root);
      expect(tokens).toContain("before:h-px");
      expect(tokens).toContain("after:bg-border");
    }
  });

  test.each(markerVariants)("$format/$style renders the border variant", (variant) => {
    const root = renderVariant(variant, { variant: "border", children: variant.child!("text") });
    expect(root.getAttribute("data-variant")).toBe("border");
    if (variant.style === "css") {
      expect(classTokens(root).some((token) => token.startsWith("marker-border"))).toBe(true);
    } else {
      expect(classTokens(root)).toContain("border-b");
    }
  });

  test.each(markerPartVariants)("$part $format/$style renders its slot and aria", (variant) => {
    const root = renderVariant(variant, { children: ["x"] });
    expect(root.getAttribute("data-slot")).toBe(`marker-${variant.part.toLowerCase()}`);
    if (variant.part === "Icon") {
      expect(root.getAttribute("aria-hidden")).toBe("true");
    }
    expect(root.textContent).toBe("x");
  });

  test.each(markerPartVariants.filter((variant) => variant.part === "Icon"))("$part $format/$style sizes the icon wrapper", (variant) => {
    const root = renderVariant(variant, { children: ["x"] });
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith("marker-icon")).toBe(true);
    } else {
      expect(classTokens(root)).toContain("size-4");
    }
  });

  test("all four flavors agree on tag and attributes", () => {
    assertStructuralParity(markerVariants, { variant: "separator", children: ["text"] });
    assertStructuralParity(markerVariants, { variant: "border", children: ["text"] });
    for (const part of ["Icon", "Content"] as const) {
      assertStructuralParity(markerPartVariants.filter((candidate) => candidate.part === part), { children: ["x"] });
    }
  });

  test("forwards user attrs onto the root across all four variants", () => {
    assertAttrForwarded(markerVariants, { title: "Hella" }, "title", "Hella");
  });

  test("fires a user on:click handler across all four variants", () => {
    const onClick = mock(() => {});
    assertHandlerForwarded(markerVariants, { "on:click": onClick }, "on:click", "click", onClick);
  });

  test("merges a user class into the root class across all four variants", () => {
    for (const variant of markerVariants) {
      const root = renderVariant(variant, { class: "my-marker", children: variant.child!("text") });
      const tokens = classTokens(root);
      expect(tokens.at(-1)).toBe("my-marker");
      expect(tokens.length).toBeGreaterThan(1);
    }
  });
});
