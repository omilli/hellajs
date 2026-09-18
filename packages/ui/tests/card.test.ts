import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertStructuralParity,
  cardPartVariants,
  cardVariants,
  classTokens,
  renderVariant,
} from "./helpers/variants";
import type { CardPartProps } from "./helpers/variants";

/** The verbatim shadcn class sets per part — first tokens are part-unique in the tailwind flavor. */
const PART_TOKENS: Record<string, string[]> = {
  "": ["flex", "flex-col", "gap-6", "rounded-xl", "bg-card"],
  Header: ["@container/card-header", "grid", "auto-rows-min", "px-6"],
  Title: ["leading-none", "font-semibold"],
  Description: ["text-sm", "text-muted-foreground"],
  Action: ["col-start-2", "row-span-2", "row-start-1"],
  Content: ["px-6"],
  Footer: ["flex", "items-center", "px-6"],
};

beforeEach(() => {
  resetTestState();
});

describe("card", () => {
  test.each(cardVariants)("$format/$style renders the default Card with its data-slot and class merge", (variant) => {
    const card = renderVariant(variant, { children: variant.child("Content"), class: "my-card" });
    expect(card.tagName).toBe("DIV");
    expect(card.getAttribute("data-slot")).toBe("card");
    const tokens = classTokens(card);
    expect(tokens.at(-1)).toBe("my-card");
    if (variant.style === "css") {
      expect(tokens).toHaveLength(2);
      expect(tokens[0]!.startsWith("h-hella-card-")).toBe(true);
    } else {
      for (const token of PART_TOKENS[""]!) expect(tokens).toContain(token);
    }
  });

  test.each(cardVariants)("$format/$style renders children directly with no inner wrapper", (variant) => {
    const card = renderVariant(variant, { children: variant.child("Content") });
    expect(card.textContent).toBe("Content");
    expect(card.children).toHaveLength(0);
  });

  test.each(cardPartVariants)("$format/$style $part renders with its data-slot and classes", (variant) => {
    const el = renderVariant(variant, { children: [], class: "my-part" });
    expect(el.getAttribute("data-slot")).toBe(`card-${variant.part.toLowerCase()}`);
    const tokens = classTokens(el);
    expect(tokens.at(-1)).toBe("my-part");
    if (variant.style === "css") {
      expect(tokens[0]!.startsWith(`h-hella-card-${variant.part.toLowerCase()}-`)).toBe(true);
    } else {
      for (const token of PART_TOKENS[variant.part]!) expect(tokens).toContain(token);
    }
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(cardVariants);
  });

  test("keeps structural parity for every part across all four variants", () => {
    for (const part of ["Header", "Title", "Description", "Action", "Content", "Footer"]) {
      const suites = cardPartVariants.filter((variant) => variant.part === part);
      assertStructuralParity(suites, { children: [] } as Partial<CardPartProps> as CardPartProps);
    }
  });
});
