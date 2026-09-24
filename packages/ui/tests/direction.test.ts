import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertStructuralParity,
  classTokens,
  directionVariants,
  renderVariant,
} from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

describe("direction", () => {
  test.each(directionVariants)("$format/$style renders the dir wrapper with children passthrough", (variant) => {
    const root = renderVariant(variant, { dir: "rtl", children: variant.child!("x") });
    expect(root.getAttribute("data-slot")).toBe("direction-provider");
    expect(root.getAttribute("dir")).toBe("rtl");
    expect(root.textContent).toBe("x");
  });

  test.each(directionVariants)("$format/$style omits dir when unset and renders ltr explicitly", (variant) => {
    expect(renderVariant(variant, { children: variant.child!("x") }).hasAttribute("dir")).toBe(false);
    expect(renderVariant(variant, { dir: "ltr", children: variant.child!("x") }).getAttribute("dir")).toBe("ltr");
  });

  test.each(directionVariants)("$format/$style stays layout-neutral through its single class", (variant) => {
    const root = renderVariant(variant, { children: variant.child!("x") });
    const tokens = classTokens(root);
    if (variant.style === "css") {
      expect(tokens[0]!.startsWith("h-hella-direction-provider")).toBe(true);
    } else {
      expect(tokens).toContain("contents");
    }
  });

  test("all four flavors agree on tag and attributes", () => {
    assertStructuralParity(directionVariants, { dir: "rtl", children: ["x"] });
  });
});
