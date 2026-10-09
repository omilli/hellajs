import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertAttrForwarded,
  assertHandlerForwarded,
  assertStructuralParity,
  classTokens,
  messagePartVariants,
  messageVariants,
  renderVariant,
} from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

describe("message", () => {
  test.each(messageVariants)("$part $format/$style renders the align attribute", (variant) => {
    const root = renderVariant(variant, { children: ["x"] });
    expect(root.getAttribute("data-slot")).toBe("message");
    expect(root.getAttribute("data-align")).toBe("start");
    const end = renderVariant(variant, { align: "end", children: ["x"] });
    expect(end.getAttribute("data-align")).toBe("end");
  });

  test.each(messageVariants)("$part $format/$style carries the row-reverse class on end alignment", (variant) => {
    const root = renderVariant(variant, { align: "end", children: ["x"] });
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith("message")).toBe(true);
    } else {
      expect(classTokens(root)).toContain("data-[align=end]:flex-row-reverse");
    }
  });

  test.each(messagePartVariants)("$part $format/$style renders its slot", (variant) => {
    const root = renderVariant(variant, { children: ["x"] });
    expect(root.getAttribute("data-slot")).toBe(`message-${variant.part.toLowerCase()}`);
    expect(root.textContent).toBe("x");
  });

  test.each(messagePartVariants.filter((variant) => variant.part === "Group"))("$part $format/$style renders the group stack", (variant) => {
    const root = renderVariant(variant, { children: ["x"] });
    expect(root.tagName).toBe("DIV");
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith("message-group")).toBe(true);
    } else {
      expect(classTokens(root)).toContain("flex-col");
    }
  });

  test.each(messagePartVariants.filter((variant) => variant.part === "Avatar"))("$part $format/$style renders the avatar well", (variant) => {
    const root = renderVariant(variant, { children: ["A"] });
    expect(root.textContent).toBe("A");
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith("message-avatar")).toBe(true);
    } else {
      expect(classTokens(root)).toContain("rounded-full");
    }
  });

  test.each(messagePartVariants.filter((variant) => variant.part === "Header" || variant.part === "Footer"))("$part $format/$style renders the meta rows", (variant) => {
    const root = renderVariant(variant, { children: ["meta"] });
    expect(root.textContent).toBe("meta");
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith(`message-${variant.part.toLowerCase()}`)).toBe(true);
    } else {
      expect(classTokens(root)).toContain("text-muted-foreground");
    }
  });

  test("all four flavors agree on tag and attributes", () => {
    assertStructuralParity(messageVariants, { align: "end", children: ["x"] });
    assertStructuralParity(messagePartVariants.filter((candidate) => candidate.part === "Avatar"), { children: ["x"] });
  });

  test("forwards user attrs onto the root across all four variants", () => {
    assertAttrForwarded(messageVariants, { title: "Hella" }, "title", "Hella");
  });

  test("fires a user on:click handler across all four variants", () => {
    const onClick = mock(() => {});
    assertHandlerForwarded(messageVariants, { "on:click": onClick }, "on:click", "click", onClick);
  });

  test("merges a user class into the root class across all four variants", () => {
    for (const variant of messageVariants) {
      const root = renderVariant(variant, { class: "my-message", children: ["x"] });
      const tokens = classTokens(root);
      expect(tokens.at(-1)).toBe("my-message");
      expect(tokens.length).toBeGreaterThan(1);
    }
  });
});
