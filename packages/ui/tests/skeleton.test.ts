import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertAttrForwarded,
  assertHandlerForwarded,
  assertStructuralParity,
  classTokens,
  renderVariant,
  skeletonVariants,
} from "./helpers/variants";

/** Verbatim shadcn utility tokens — asserted in the tailwind flavor. */
const BASE_TOKENS = ["animate-pulse", "rounded-md", "bg-accent"];

beforeEach(() => {
  resetTestState();
});

describe("skeleton", () => {
  test.each(skeletonVariants)("$format/$style renders the pulse div with its data-slot and class merge", (variant) => {
    const skeleton = renderVariant(variant, { children: variant.child(""), class: "my-skeleton" });
    expect(skeleton.tagName).toBe("DIV");
    expect(skeleton.getAttribute("data-slot")).toBe("skeleton");
    const tokens = classTokens(skeleton);
    expect(tokens.at(-1)).toBe("my-skeleton");
    if (variant.style === "css") {
      expect(tokens).toHaveLength(2);
      expect(tokens[0]!.startsWith("skeleton-")).toBe(true);
    } else {
      for (const token of BASE_TOKENS) expect(tokens).toContain(token);
    }
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(skeletonVariants);
  });

  test("forwards user attrs onto the root across all four variants", () => {
    assertAttrForwarded(skeletonVariants, { title: "Hella" }, "title", "Hella");
  });

  test("fires a user on:click handler across all four variants", () => {
    const onClick = mock(() => {});
    assertHandlerForwarded(skeletonVariants, { "on:click": onClick }, "on:click", "click", onClick);
  });
});
