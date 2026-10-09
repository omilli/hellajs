import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertAttrForwarded,
  assertHandlerForwarded,
  assertStructuralParity,
  bubblePartVariants,
  bubbleVariants,
  classTokens,
  renderVariant,
} from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

describe("bubble", () => {
  test.each(bubbleVariants)("$part $format/$style renders the variant and align attributes", (variant) => {
    const root = renderVariant(variant, { children: ["x"] });
    expect(root.getAttribute("data-slot")).toBe("bubble");
    expect(root.getAttribute("data-variant")).toBe("default");
    expect(root.getAttribute("data-align")).toBe("start");
  });

  test.each(bubbleVariants)("$part $format/$style carries the variant class for every style", (variant) => {
    const root = renderVariant(variant, { variant: "secondary", align: "end", children: ["x"] });
    expect(root.getAttribute("data-variant")).toBe("secondary");
    expect(root.getAttribute("data-align")).toBe("end");
    if (variant.style === "css") {
      const tokens = classTokens(root);
      expect(tokens.some((token) => token.startsWith("bubble-secondary"))).toBe(true);
    } else {
      expect(classTokens(root)).toContain("*:data-[slot=bubble-content]:bg-secondary");
    }
  });

  test.each(bubbleVariants)("$part $format/$style renders all seven variants", (variant) => {
    for (const name of ["default", "secondary", "muted", "tinted", "outline", "ghost", "destructive"]) {
      const root = renderVariant(variant, { variant: name as "default", children: ["x"] });
      expect(root.getAttribute("data-variant")).toBe(name);
      if (variant.style === "css") {
        expect(classTokens(root).some((token) => token.startsWith(`bubble-${name}`))).toBe(true);
      }
    }
  });

  test.each(bubblePartVariants.filter((variant) => variant.part === "Group"))("$part $format/$style renders the group stack", (variant) => {
    const root = renderVariant(variant, { children: ["x"] });
    expect(root.tagName).toBe("DIV");
    expect(root.getAttribute("data-slot")).toBe("bubble-group");
    expect(root.textContent).toBe("x");
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith("bubble-group")).toBe(true);
    } else {
      expect(classTokens(root)).toContain("gap-2");
    }
  });

  test.each(bubblePartVariants.filter((variant) => variant.part === "Content"))("$part $format/$style renders the message content", (variant) => {
    const root = renderVariant(variant, { children: ["hello"] });
    expect(root.getAttribute("data-slot")).toBe("bubble-content");
    expect(root.textContent).toBe("hello");
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith("bubble-content")).toBe(true);
    } else {
      expect(classTokens(root)).toContain("rounded-xl");
    }
  });

  test.each(bubblePartVariants.filter((variant) => variant.part === "Reactions"))("$part $format/$style defaults reactions to bottom-end", (variant) => {
    const root = renderVariant(variant, { children: ["x"] });
    expect(root.getAttribute("data-slot")).toBe("bubble-reactions");
    expect(root.getAttribute("data-side")).toBe("bottom");
    expect(root.getAttribute("data-align")).toBe("end");
    if (variant.style === "css") {
      const tokens = classTokens(root);
      expect(tokens.some((token) => token.startsWith("bubble-reactions-bottom"))).toBe(true);
      expect(tokens.some((token) => token.startsWith("bubble-reactions-end"))).toBe(true);
    } else {
      expect(classTokens(root)).toContain("translate-y-3/4");
    }
  });

  test.each(bubblePartVariants.filter((variant) => variant.part === "Reactions"))("$part $format/$style renders side and align variants", (variant) => {
    const root = renderVariant(variant, { side: "top", align: "start", children: ["x"] });
    expect(root.getAttribute("data-side")).toBe("top");
    expect(root.getAttribute("data-align")).toBe("start");
    if (variant.style === "css") {
      const tokens = classTokens(root);
      expect(tokens.some((token) => token.startsWith("bubble-reactions-top"))).toBe(true);
      expect(tokens.some((token) => token.startsWith("bubble-reactions-start"))).toBe(true);
    } else {
      const tokens = classTokens(root);
      expect(tokens).toContain("-translate-y-3/4");
      expect(tokens).toContain("left-3");
    }
  });

  test("all four flavors agree on tag and attributes", () => {
    assertStructuralParity(bubbleVariants, { variant: "ghost", align: "end", children: ["x"] });
    assertStructuralParity(bubblePartVariants.filter((candidate) => candidate.part === "Reactions"), { side: "top", align: "start", children: ["x"] });
    assertStructuralParity(bubblePartVariants.filter((candidate) => candidate.part === "Content"), { children: ["x"] });
  });

  test("forwards user attrs onto the root across all four variants", () => {
    assertAttrForwarded(bubbleVariants, { title: "Hella" }, "title", "Hella");
  });

  test("fires a user on:click handler across all four variants", () => {
    const onClick = mock(() => {});
    assertHandlerForwarded(bubbleVariants, { "on:click": onClick }, "on:click", "click", onClick);
  });

  test("merges a user class into the root class across all four variants", () => {
    for (const variant of bubbleVariants) {
      const root = renderVariant(variant, { class: "my-bubble", children: ["x"] });
      const tokens = classTokens(root);
      expect(tokens.at(-1)).toBe("my-bubble");
      expect(tokens.length).toBeGreaterThan(1);
    }
  });
});
