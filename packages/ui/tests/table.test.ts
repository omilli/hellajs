import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertStructuralParity,
  classTokens,
  renderVariant,
  tablePartVariants,
  tableVariants,
} from "./helpers/variants";

/** Element tags per Table part. */
const PART_TAGS: Record<string, string> = {
  Header: "THEAD",
  Body: "TBODY",
  Footer: "TFOOT",
  Row: "TR",
  Head: "TH",
  Cell: "TD",
  Caption: "CAPTION",
};

/** Verbatim shadcn utility tokens — asserted in the tailwind flavor. */
const TOKENS: Record<string, string[]> = {
  Header: ["[&_tr]:border-b"],
  Body: ["[&_tr:last-child]:border-0"],
  Footer: ["border-t", "bg-muted/50", "font-medium", "[&>tr]:last:border-b-0"],
  Row: ["border-b", "transition-colors", "hover:bg-muted/50", "has-aria-expanded:bg-muted/50", "data-[state=selected]:bg-muted"],
  Head: ["h-10", "px-2", "text-left", "align-middle", "font-medium", "whitespace-nowrap", "text-foreground", "[&:has([role=checkbox])]:pr-0", "[&>[role=checkbox]]:translate-y-[2px]"],
  Cell: ["p-2", "align-middle", "whitespace-nowrap", "[&:has([role=checkbox])]:pr-0", "[&>[role=checkbox]]:translate-y-[2px]"],
  Caption: ["mt-4", "text-sm", "text-muted-foreground"],
};

beforeEach(() => {
  resetTestState();
});

describe("table", () => {
  test.each(tableVariants)("$format/$style wraps the table in the overflow container", (variant) => {
    const wrapper = renderVariant(variant, { children: variant.child("Rows"), class: "my-table" });
    expect(wrapper.tagName).toBe("DIV");
    expect(wrapper.getAttribute("data-slot")).toBe("table-container");
    if (variant.style === "css") {
      expect(classTokens(wrapper)).toHaveLength(1);
      expect(classTokens(wrapper)[0]!.startsWith("h-hella-table-container-")).toBe(true);
    } else {
      expect(classTokens(wrapper)).toContain("relative");
      expect(classTokens(wrapper)).toContain("w-full");
      expect(classTokens(wrapper)).toContain("overflow-x-auto");
    }
    const table = wrapper.querySelector("table")!;
    expect(table.getAttribute("data-slot")).toBe("table");
    expect(table.textContent).toBe("Rows");
    expect(classTokens(table).at(-1)).toBe("my-table");
    if (variant.style === "css") {
      expect(classTokens(table)[0]!.startsWith("h-hella-table-")).toBe(true);
    } else {
      expect(classTokens(table)).toContain("caption-bottom");
    }
  });

  test.each(tablePartVariants)("$format/$style $part renders its tag, data-slot, and classes", (variant) => {
    const el = renderVariant(variant, { children: [], class: "my-part" });
    expect(el.tagName).toBe(PART_TAGS[variant.part]!);
    expect(el.getAttribute("data-slot")).toBe(`table-${variant.part.toLowerCase()}`);
    const tokens = classTokens(el);
    expect(tokens.at(-1)).toBe("my-part");
    if (variant.style === "css") {
      expect(tokens[0]!.startsWith(`h-hella-table-${variant.part.toLowerCase()}-`)).toBe(true);
    } else {
      for (const token of TOKENS[variant.part]!) expect(tokens).toContain(token);
    }
  });

  test.each(tablePartVariants.filter((variant) => variant.part === "Head" || variant.part === "Cell"))(
    "$format/$style $part passes colSpan through",
    (variant) => {
      const spanned = renderVariant(variant, { children: [], colSpan: 2 });
      expect(spanned.getAttribute("colspan")).toBe("2");
      const plain = renderVariant(variant, { children: [] });
      expect(plain.hasAttribute("colspan")).toBe(false);
    },
  );

  test("keeps structural parity for the full table across all four variants", () => {
    assertStructuralParity(tableVariants);
  });

  test("keeps structural parity for every part across all four variants", () => {
    for (const part of Object.keys(PART_TAGS)) {
      const suites = tablePartVariants.filter((variant) => variant.part === part);
      assertStructuralParity(suites, { children: [] });
    }
  });
});
