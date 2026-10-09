import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertAttrForwarded,
  assertHandlerForwarded,
  assertStructuralParity,
  classTokens,
  labelVariants,
  renderVariant,
} from "./helpers/variants";

/** Verbatim shadcn utility tokens — asserted in the tailwind flavor. */
const BASE_TOKENS = ["flex", "items-center", "gap-2", "text-sm", "leading-none", "font-medium", "select-none", "group-data-[disabled=true]:pointer-events-none", "group-data-[disabled=true]:opacity-50", "peer-disabled:cursor-not-allowed", "peer-disabled:opacity-50"];

beforeEach(() => {
  resetTestState();
});

describe("label", () => {
  test.each(labelVariants)("$format/$style renders the label root with its data-slot and class merge", (variant) => {
    const label = renderVariant(variant, { children: variant.child("Email"), class: "my-label" });
    expect(label.tagName).toBe("LABEL");
    expect(label.getAttribute("data-slot")).toBe("label");
    const tokens = classTokens(label);
    expect(tokens.at(-1)).toBe("my-label");
    if (variant.style === "css") {
      expect(tokens).toHaveLength(2);
      expect(tokens[0]!.startsWith("label-")).toBe(true);
    } else {
      for (const token of BASE_TOKENS) expect(tokens).toContain(token);
    }
  });

  test.each(labelVariants)("$format/$style passes the for attribute through to the label element", (variant) => {
    const labeled = renderVariant(variant, { children: variant.child("Email"), for: "email" });
    expect(labeled.getAttribute("for")).toBe("email");
    const unlabeled = renderVariant(variant, { children: variant.child("Email") });
    expect(unlabeled.getAttribute("for")).toBeNull();
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(labelVariants);
  });

  test("forwards user attrs onto the root across all four variants", () => {
    assertAttrForwarded(labelVariants, { title: "Hella" }, "title", "Hella");
  });

  test("fires a user on:click handler across all four variants", () => {
    const onClick = mock(() => {});
    assertHandlerForwarded(labelVariants, { "on:click": onClick }, "on:click", "click", onClick);
  });
});
