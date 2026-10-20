import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { resetTestState } from "@utils/test-helpers.js";
import "@hellajs/dom/features/routed-props";
import {
  aspectRatioVariants,
  assertAttrForwarded,
  assertHandlerForwarded,
  assertStructuralParity,
  classTokens,
  renderVariant,
} from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

describe("aspect-ratio", () => {
  test.each(aspectRatioVariants)(
    "$style renders the wrapper with the ratio in its style attribute",
    (variant) => {
      const ratio = renderVariant(variant, { ratio: 1.5, children: variant.child("Media") });
      expect(ratio.tagName).toBe("DIV");
      expect(ratio.getAttribute("data-slot")).toBe("aspect-ratio");
      const style = (ratio.getAttribute("style") ?? "").replace(/\s/g, "");
      expect(style).toContain("aspect-ratio:1.5");
      expect(style).toContain("width:100%");
    },
  );

  test.each(aspectRatioVariants)("$style defaults the ratio to 1", (variant) => {
    const ratio = renderVariant(variant, { children: variant.child("Media") });
    expect((ratio.getAttribute("style") ?? "").replace(/\s/g, "")).toContain("aspect-ratio:1");
  });

  test.each(aspectRatioVariants)("$style renders children inside the wrapper", (variant) => {
    const ratio = renderVariant(variant, { children: variant.child("Media") });
    expect(ratio.textContent).toBe("Media");
  });

  test.each(aspectRatioVariants)(
    "$style merges props.class into the class attribute",
    (variant) => {
      const ratio = renderVariant(variant, { class: "my-ratio", children: variant.child("Media") });
      const tokens = classTokens(ratio);
      expect(tokens.at(-1)).toBe("my-ratio");
      if (variant.style === "css") {
        expect(tokens).toHaveLength(2);
        expect(tokens[0]!.startsWith("aspect-ratio-")).toBe(true);
      } else {
        expect(tokens).toContain("relative");
      }
    },
  );

  test("keeps structural parity across both styles", () => {
    // HappyDOM can serialize the style attribute through cssText (spaces) — parity ignores style.
    assertStructuralParity(aspectRatioVariants, { ratio: 1.5 }, ["style"]);
  });

  test("forwards user attrs onto the root across both styles", () => {
    assertAttrForwarded(aspectRatioVariants, { title: "Hella" }, "title", "Hella");
  });

  test("fires a user on:click handler across both styles", () => {
    const onClick = vi.fn(() => {});
    assertHandlerForwarded(
      aspectRatioVariants,
      { "on:click": onClick },
      "on:click",
      "click",
      onClick,
    );
  });
});
