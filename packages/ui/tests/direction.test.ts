import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { resetTestState } from "@utils/test-helpers.js";
import "@hellajs/dom/features/routed-props";
import {
  assertAttrForwarded,
  assertHandlerForwarded,
  assertStructuralParity,
  classTokens,
  directionVariants,
  renderVariant,
} from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

describe("direction", () => {
  test.each(directionVariants)(
    "$style renders the dir wrapper with children passthrough",
    (variant) => {
      const root = renderVariant(variant, { dir: "rtl", children: variant.child!("x") });
      expect(root.getAttribute("data-slot")).toBe("direction-provider");
      expect(root.getAttribute("dir")).toBe("rtl");
      expect(root.textContent).toBe("x");
    },
  );

  test.each(directionVariants)(
    "$style omits dir when unset and renders ltr explicitly",
    (variant) => {
      expect(renderVariant(variant, { children: variant.child!("x") }).hasAttribute("dir")).toBe(
        false,
      );
      expect(
        renderVariant(variant, { dir: "ltr", children: variant.child!("x") }).getAttribute("dir"),
      ).toBe("ltr");
    },
  );

  test.each(directionVariants)(
    "$style stays layout-neutral through its single class",
    (variant) => {
      const root = renderVariant(variant, { children: variant.child!("x") });
      const tokens = classTokens(root);
      if (variant.style === "css") {
        expect(tokens[0]!.startsWith("direction-provider")).toBe(true);
      } else {
        expect(tokens).toContain("contents");
      }
    },
  );

  test("both styles agree on tag and attributes", () => {
    assertStructuralParity(directionVariants, { dir: "rtl", children: ["x"] });
  });

  test("forwards user attrs onto the root across both styles", () => {
    assertAttrForwarded(directionVariants, { title: "Hella" }, "title", "Hella");
  });

  test("fires a user on:click handler across both styles", () => {
    const onClick = vi.fn(() => {});
    assertHandlerForwarded(
      directionVariants,
      { "on:click": onClick },
      "on:click",
      "click",
      onClick,
    );
  });

  test("merges a user class into the root class across both styles", () => {
    for (const variant of directionVariants) {
      const root = renderVariant(variant, { class: "my-dir", children: variant.child!("x") });
      const tokens = classTokens(root);
      expect(tokens.at(-1)).toBe("my-dir");
      expect(tokens.length).toBeGreaterThan(1);
    }
  });
});
