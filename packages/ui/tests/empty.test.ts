import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertStructuralParity,
  classTokens,
  emptyPartVariants,
  emptyVariants,
  renderVariant,
} from "./helpers/variants";
import type { EmptyMediaVariantProps } from "./helpers/variants";

/** Verbatim shadcn utility tokens — asserted in the tailwind flavor. */
const TOKENS = {
  base: ["flex", "min-w-0", "flex-1", "flex-col", "items-center", "gap-6", "rounded-lg", "border-dashed", "p-6", "text-center", "text-balance", "md:p-12"],
  header: ["flex", "max-w-sm", "flex-col", "items-center", "gap-2", "text-center"],
  media: ["mb-2", "flex", "shrink-0", "items-center", "justify-center", "[&_svg]:pointer-events-none"],
  mediaDefault: ["bg-transparent"],
  mediaIcon: ["size-10", "rounded-lg", "bg-muted", "text-foreground", "[&_svg:not([class*='size-'])]:size-6"],
  title: ["text-lg", "font-medium", "tracking-tight"],
  description: ["text-sm/relaxed", "text-muted-foreground", "[&>a]:underline", "[&>a]:underline-offset-4", "[&>a:hover]:text-primary"],
  content: ["flex", "w-full", "max-w-sm", "min-w-0", "flex-col", "gap-4", "text-sm", "text-balance"],
};

/** EmptyMedia's data-slot is "empty-icon", not "empty-media" — per the ref. */
const PART_SLOTS: Record<string, string> = {
  Header: "empty-header",
  Media: "empty-icon",
  Title: "empty-title",
  Description: "empty-description",
  Content: "empty-content",
};

/** Verbatim tailwind tokens per part. */
function partTokens(part: string): string[] {
  return part === "Header" ? TOKENS.header
    : part === "Media" ? TOKENS.media
    : part === "Title" ? TOKENS.title
    : part === "Description" ? TOKENS.description
    : TOKENS.content;
}

beforeEach(() => {
  resetTestState();
});

describe("empty", () => {
  test.each(emptyVariants)("$format/$style renders the empty root with its data-slot and class merge", (variant) => {
    const empty = renderVariant(variant, { children: variant.child("No results"), class: "my-empty" });
    expect(empty.tagName).toBe("DIV");
    expect(empty.getAttribute("data-slot")).toBe("empty");
    const tokens = classTokens(empty);
    expect(tokens.at(-1)).toBe("my-empty");
    if (variant.style === "css") {
      expect(tokens).toHaveLength(2);
      expect(tokens[0]!.startsWith("h-hella-empty-")).toBe(true);
    } else {
      for (const token of TOKENS.base) expect(tokens).toContain(token);
    }
  });

  test.each(emptyPartVariants)("$format/$style $part renders with its data-slot and classes", (variant) => {
    const el = renderVariant(variant, { children: [], class: "my-part" });
    expect(el.getAttribute("data-slot")).toBe(PART_SLOTS[variant.part]!);
    const tokens = classTokens(el);
    expect(tokens.at(-1)).toBe("my-part");
    if (variant.style === "css") {
      expect(tokens[0]!.startsWith(`h-hella-empty-${variant.part.toLowerCase()}-`)).toBe(true);
    } else {
      for (const token of partTokens(variant.part)) expect(tokens).toContain(token);
    }
  });

  test.each(emptyVariants)("$format/$style renders EmptyMedia's icon variant with its data-variant", (variant) => {
    const media = renderVariant(
      emptyPartVariants.filter((suite) => suite.part === "Media" && suite.style === variant.style && suite.format === variant.format)[0]!,
      { children: [], variant: "icon", class: "my-media" } as EmptyMediaVariantProps,
    );
    expect(media.getAttribute("data-variant")).toBe("icon");
    const tokens = classTokens(media);
    expect(tokens.at(-1)).toBe("my-media");
    if (variant.style === "css") {
      expect(tokens[1]!.startsWith("h-hella-empty-media-icon-")).toBe(true);
    } else {
      for (const token of TOKENS.mediaIcon) expect(tokens).toContain(token);
    }
  });

  test.each(emptyVariants)("$format/$style keeps the default media variant unstyled to bg-transparent", (variant) => {
    const media = renderVariant(
      emptyPartVariants.filter((suite) => suite.part === "Media" && suite.style === variant.style && suite.format === variant.format)[0]!,
      { children: [] } as EmptyMediaVariantProps,
    );
    expect(media.getAttribute("data-variant")).toBe("default");
    if (variant.style === "css") {
      expect(classTokens(media)[1]!.startsWith("h-hella-empty-media-default-")).toBe(true);
    } else {
      expect(classTokens(media)).toContain("bg-transparent");
    }
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(emptyVariants);
  });

  test("keeps structural parity for every part across all four variants", () => {
    for (const part of Object.keys(PART_SLOTS)) {
      const suites = emptyPartVariants.filter((variant) => variant.part === part);
      assertStructuralParity(suites, { children: [] });
    }
  });
});
