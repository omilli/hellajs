import { describe, test, expect, beforeEach, mock } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import {
  alertPartVariants,
  alertVariants,
  assertAttrForwarded,
  assertHandlerForwarded,
  assertStructuralParity,
  classTokens,
  renderVariant,
} from "./helpers/variants";

/** Verbatim shadcn utility tokens per part/variant — asserted in the tailwind flavor. */
const TOKENS = {
  base: ["relative", "grid", "w-full", "grid-cols-[0_1fr]", "rounded-lg", "px-4", "py-3", "text-sm", "has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr]", "[&>svg]:size-4"],
  default: ["bg-card", "text-card-foreground"],
  destructive: ["text-destructive", "*:data-[slot=alert-description]:text-destructive/90"],
  title: ["col-start-2", "line-clamp-1", "min-h-4", "font-medium", "tracking-tight"],
  description: ["col-start-2", "grid", "gap-1", "text-sm", "text-muted-foreground", "[&_p]:leading-relaxed"],
};

beforeEach(() => {
  resetTestState();
});

describe("alert", () => {
  test.each(alertVariants)("$format/$style renders the alert root with role and class merge", (variant) => {
    const alert = renderVariant(variant, { children: variant.child("Heads up"), class: "my-alert" });
    expect(alert.tagName).toBe("DIV");
    expect(alert.getAttribute("data-slot")).toBe("alert");
    expect(alert.getAttribute("role")).toBe("alert");
    const tokens = classTokens(alert);
    expect(tokens.at(-1)).toBe("my-alert");
    if (variant.style === "css") {
      expect(tokens).toHaveLength(3);
      expect(tokens[0]!.startsWith("alert-")).toBe(true);
      expect(tokens[1]!.startsWith("alert-default-")).toBe(true);
    } else {
      for (const token of [...TOKENS.base, ...TOKENS.default]) expect(tokens).toContain(token);
    }
  });

  test.each(alertVariants)("$format/$style renders the destructive variant's token set", (variant) => {
    const alert = renderVariant(variant, { children: variant.child("Error"), variant: "destructive" });
    const tokens = classTokens(alert);
    if (variant.style === "css") {
      expect(tokens[1]!.startsWith("alert-destructive-")).toBe(true);
    } else {
      for (const token of TOKENS.destructive) expect(tokens).toContain(token);
    }
  });

  test.each(alertVariants)("$format/$style renders children directly with no inner wrapper", (variant) => {
    const alert = renderVariant(variant, { children: variant.child("Heads up") });
    expect(alert.textContent).toBe("Heads up");
    expect(alert.children).toHaveLength(0);
  });

  test.each(alertPartVariants)("$format/$style $part renders with its data-slot and classes", (variant) => {
    const el = renderVariant(variant, { children: [], class: "my-part" });
    expect(el.getAttribute("data-slot")).toBe(`alert-${variant.part.toLowerCase()}`);
    const tokens = classTokens(el);
    expect(tokens.at(-1)).toBe("my-part");
    const expected = variant.part === "Title" ? TOKENS.title : TOKENS.description;
    if (variant.style === "css") {
      expect(tokens[0]!.startsWith(`alert-${variant.part.toLowerCase()}-`)).toBe(true);
    } else {
      for (const token of expected) expect(tokens).toContain(token);
    }
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(alertVariants);
  });

  test("forwards user attrs onto the root across all four variants", () => {
    assertAttrForwarded(alertVariants, { title: "Hella" }, "title", "Hella");
  });

  test("fires a user on:click handler across all four variants", () => {
    const onClick = mock(() => {});
    assertHandlerForwarded(alertVariants, { "on:click": onClick }, "on:click", "click", onClick);
  });

  test("keeps structural parity for every part across all four variants", () => {
    for (const part of ["Title", "Description"]) {
      const suites = alertPartVariants.filter((variant) => variant.part === part);
      assertStructuralParity(suites, { children: [] });
    }
  });
});
