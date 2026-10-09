import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertAttrForwarded,
  assertHandlerForwarded,
  assertStructuralParity,
  buttonGroupPartVariants,
  buttonGroupVariants,
  classTokens,
  renderVariant,
} from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

describe("button-group", () => {
  test.each(buttonGroupVariants)("$format/$style renders the group role and slot", (variant) => {
    const root = renderVariant(variant, { children: variant.child!("x") });
    expect(root.getAttribute("data-slot")).toBe("button-group");
    expect(root.getAttribute("role")).toBe("group");
    expect(root.getAttribute("data-orientation")).toBe("horizontal");
    expect(root.textContent).toBe("x");
  });

  test.each(buttonGroupVariants)("$format/$style renders the orientation attribute per variant", (variant) => {
    const vertical = renderVariant(variant, { orientation: "vertical", children: variant.child!("x") });
    expect(vertical.getAttribute("data-orientation")).toBe("vertical");
    if (variant.style === "css") {
      const tokens = classTokens(vertical).filter((token) => token.startsWith("button-group-vertical"));
      expect(tokens).toHaveLength(1);
    } else {
      expect(classTokens(vertical)).toContain("flex-col");
    }
  });

  test.each(buttonGroupVariants)("$format/$style composes the group base and orientation classes", (variant) => {
    const root = renderVariant(variant, { children: variant.child!("x") });
    const tokens = classTokens(root);
    if (variant.style === "css") {
      expect(tokens[0]!.startsWith("button-group-")).toBe(true);
      expect(tokens.some((token) => token.startsWith("button-group-horizontal"))).toBe(true);
    } else {
      expect(tokens).toContain("w-fit");
      expect(tokens).toContain("[&>*:not(:first-child)]:rounded-l-none");
    }
  });

  test.each(buttonGroupPartVariants)("$part $format/$style renders its slot and class composition", (variant) => {
    const root = variant.part === "Text"
      ? renderVariant(variant, { children: ["label"] })
      : renderVariant(variant, { orientation: "vertical" });
    expect(root.getAttribute("data-slot")).toBe(`button-group-${variant.part.toLowerCase()}`);
    if (variant.part === "Text") {
      expect(root.textContent).toBe("label");
    } else {
      expect(root.getAttribute("role")).toBe("separator");
      expect(root.getAttribute("data-orientation")).toBe("vertical");
    }
  });

  test("separator part keeps the group's own base and the self-stretch overrides apart", () => {
    for (const variant of buttonGroupPartVariants.filter((candidate) => candidate.part === "Separator")) {
      const root = renderVariant(variant, {});
      const tokens = classTokens(root);
      if (variant.style === "css") {
        expect(tokens.some((token) => token.startsWith("button-group-separator-"))).toBe(true);
        expect(tokens.some((token) => token.startsWith("button-group-separator-override"))).toBe(true);
      } else {
        expect(tokens).toContain("shrink-0");
        expect(tokens).toContain("self-stretch");
        expect(tokens).toContain("data-[orientation=vertical]:h-auto");
      }
    }
  });

  test.each(buttonGroupVariants)("$format/$style merges props.class last", (variant) => {
    const root = renderVariant(variant, { class: "my-group", children: variant.child!("x") });
    expect(classTokens(root).at(-1)).toBe("my-group");
  });

  test("forwards user attrs onto the root across all four variants", () => {
    assertAttrForwarded(buttonGroupVariants, { title: "Hella" }, "title", "Hella");
  });

  test("fires a user on:click handler across all four variants", () => {
    const onClick = mock(() => {});
    assertHandlerForwarded(buttonGroupVariants, { "on:click": onClick }, "on:click", "click", onClick);
  });

  test("all four flavors agree on tag and attributes", () => {
    assertStructuralParity(buttonGroupVariants, { orientation: "horizontal", children: ["x"] });
    assertStructuralParity(buttonGroupVariants, { orientation: "vertical", children: ["x"] });
    assertStructuralParity(buttonGroupPartVariants.filter((candidate) => candidate.part === "Text"), { children: ["x"] });
  });
});
