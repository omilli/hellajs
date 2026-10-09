import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertAttrForwarded,
  assertHandlerForwarded,
  assertStructuralParity,
  classTokens,
  paginationPartVariants,
  paginationVariants,
  renderVariant,
} from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

describe("pagination", () => {
  test.each(paginationVariants)("$format/$style renders the navigation landmark", (variant) => {
    const root = renderVariant(variant, { children: variant.child!("x") });
    expect(root.tagName).toBe("NAV");
    expect(root.getAttribute("role")).toBe("navigation");
    expect(root.getAttribute("aria-label")).toBe("pagination");
    expect(root.getAttribute("data-slot")).toBe("pagination");
    expect(root.textContent).toBe("x");
  });

  test.each(paginationPartVariants.filter((variant) => variant.part === "Content"))("$part $format/$style renders the list", (variant) => {
    const root = renderVariant(variant, { children: ["x"] });
    expect(root.tagName).toBe("UL");
    expect(root.getAttribute("data-slot")).toBe("pagination-content");
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith("pagination-content")).toBe(true);
    } else {
      expect(classTokens(root)).toContain("gap-1");
    }
  });

  test.each(paginationPartVariants.filter((variant) => variant.part === "Item"))("$part $format/$style renders a bare list item", (variant) => {
    const root = renderVariant(variant, { children: ["cell"] });
    expect(root.tagName).toBe("LI");
    expect(root.getAttribute("data-slot")).toBe("pagination-item");
    expect(root.textContent).toBe("cell");
  });

  test.each(paginationPartVariants.filter((variant) => variant.part === "Link"))("$part $format/$style renders the link slot with icon size default", (variant) => {
    const root = renderVariant(variant, { children: ["1"] });
    expect(root.tagName).toBe("A");
    expect(root.getAttribute("data-slot")).toBe("pagination-link");
    expect(root.hasAttribute("data-active")).toBe(false);
    expect(root.hasAttribute("aria-current")).toBe(false);
    if (variant.style === "css") {
      expect(classTokens(root).some((token) => token.startsWith("pagination-link-size-icon"))).toBe(true);
    } else {
      expect(classTokens(root)).toContain("size-9");
    }
  });

  test.each(paginationPartVariants.filter((variant) => variant.part === "Link"))("$part $format/$style marks the active link", (variant) => {
    const root = renderVariant(variant, { isActive: true, children: ["1"] });
    expect(root.getAttribute("aria-current")).toBe("page");
    expect(root.getAttribute("data-active")).toBe("true");
    if (variant.style === "css") {
      const tokens = classTokens(root);
      expect(tokens.some((token) => token.startsWith("pagination-link-outline"))).toBe(true);
    } else {
      expect(classTokens(root)).toContain("shadow-xs");
    }
  });

  test.each(paginationPartVariants.filter((variant) => variant.part === "Link"))("$part $format/$style passes href and size through", (variant) => {
    const root = renderVariant(variant, { href: "?page=2", size: "sm", children: ["2"] });
    expect(root.getAttribute("href")).toBe("?page=2");
    if (variant.style === "css") {
      expect(classTokens(root).some((token) => token.startsWith("pagination-link-size-sm"))).toBe(true);
    } else {
      expect(classTokens(root)).toContain("h-8");
    }
  });

  test.each(paginationPartVariants.filter((variant) => variant.part === "Link"))("$part $format/$style renders the inactive link flag when explicitly false", (variant) => {
    const root = renderVariant(variant, { isActive: false, children: ["1"] });
    expect(root.getAttribute("data-active")).toBe("false");
    expect(root.hasAttribute("aria-current")).toBe(false);
  });

  test.each(paginationPartVariants.filter((variant) => variant.part === "Previous" || variant.part === "Next"))("$part $format/$style carries the accessible label, fixed size, and icon", (variant) => {
    const root = renderVariant(variant, {});
    expect(root.tagName).toBe("A");
    expect(root.getAttribute("aria-label")).toBe(variant.part === "Previous" ? "Go to previous page" : "Go to next page");
    expect(root.querySelector("svg path")).not.toBeNull();
    const label = root.querySelector("span")!;
    expect(label.textContent).toBe(variant.part === "Previous" ? "Previous" : "Next");
    if (variant.style === "css") {
      expect(classTokens(label)[0]!.startsWith("pagination-hidden-until-sm")).toBe(true);
    } else {
      expect(classTokens(label)).toContain("hidden");
      expect(classTokens(root)).toContain(variant.part === "Previous" ? "sm:pl-2.5" : "sm:pr-2.5");
    }
  });

  test.each(paginationPartVariants.filter((variant) => variant.part === "Ellipsis"))("$part $format/$style renders the more-pages icon and sr-only label", (variant) => {
    const root = renderVariant(variant, {});
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.getAttribute("data-slot")).toBe("pagination-ellipsis");
    expect(root.querySelectorAll("svg circle")).toHaveLength(3);
    expect(root.querySelector("span")!.textContent).toBe("More pages");
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith("pagination-ellipsis")).toBe(true);
    } else {
      expect(classTokens(root)).toContain("size-9");
    }
  });

  test("forwards user attrs onto the root across all four variants", () => {
    assertAttrForwarded(paginationVariants, { title: "Hella" }, "title", "Hella");
  });

  test("merges the user class last on the root across all four variants", () => {
    for (const variant of paginationVariants) {
      const root = renderVariant(variant, { class: "my-pagination", children: variant.child!("x") });
      expect(classTokens(root).at(-1)).toBe("my-pagination");
    }
  });

  test("fires a user on:click on the link without breaking the active wiring", () => {
    const onClick = mock(() => {});
    assertHandlerForwarded(paginationPartVariants.filter((variant) => variant.part === "Link"), { isActive: true, "on:click": onClick }, "on:click", "click", onClick);
    for (const variant of paginationPartVariants.filter((candidate) => candidate.part === "Link")) {
      const root = renderVariant(variant, { isActive: true, children: ["1"] });
      expect(root.getAttribute("aria-current")).toBe("page");
    }
  });

  test("lands the user href on the nav anchors through the spread", () => {
    for (const variant of paginationPartVariants.filter((candidate) => candidate.part === "Previous" || candidate.part === "Next")) {
      const root = renderVariant(variant, { href: "?page=2" });
      expect(root.getAttribute("href")).toBe("?page=2");
    }
  });

  test("all four flavors agree on tag and attributes", () => {
    assertStructuralParity(paginationVariants, { children: ["x"] });
    assertStructuralParity(paginationPartVariants.filter((candidate) => candidate.part === "Link"), { isActive: true, children: ["1"] });
  });
});
