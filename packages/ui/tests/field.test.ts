import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertStructuralParity,
  classTokens,
  fieldPartVariants,
  fieldVariants,
  renderVariant,
} from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

/** The bare slot of every Field part (children-bearing parts need children in every render). */
function slotOf(variant: { part: string }): string {
  const slots: Record<string, string> = {
    Set: "field-set",
    Legend: "field-legend",
    Group: "field-group",
    Content: "field-content",
    Label: "field-label",
    Title: "field-label",
    Description: "field-description",
    Separator: "field-separator",
    Error: "field-error",
  };
  return slots[variant.part]!;
}

describe("field", () => {
  test.each(fieldPartVariants)("$part $format/$style renders its slot", (variant) => {
    const children = variant.part === "Separator" || variant.part === "Error" ? undefined : ["x"];
    const root = renderVariant(variant, { children } as never);
    expect(root.getAttribute("data-slot")).toBe(slotOf(variant));
  });

  test.each(fieldVariants)("$part $format/$style renders orientation variants on the field root", (variant) => {
    const horizontal = renderVariant(variant, { orientation: "horizontal", children: ["x"] });
    expect(horizontal.getAttribute("data-orientation")).toBe("horizontal");
    if (variant.style === "css") {
      const tokens = classTokens(horizontal);
      expect(tokens.some((token) => token.startsWith("h-hella-field-horizontal"))).toBe(true);
    } else {
      expect(classTokens(horizontal)).toContain("flex-row");
      expect(classTokens(horizontal)).toContain("has-[>[data-slot=field-content]]:items-start");
    }
  });

  test.each(fieldVariants)("$part $format/$style renders the responsive orientation with the container query variant class", (variant) => {
    const root = renderVariant(variant, { orientation: "responsive", children: ["x"] });
    if (variant.style === "css") {
      expect(classTokens(root).some((token) => token.startsWith("h-hella-field-responsive"))).toBe(true);
    } else {
      expect(classTokens(root)).toContain("@md/field-group:flex-row");
    }
  });

  test.each(fieldVariants)("$part $format/$style renders data-disabled and data-invalid flags", (variant) => {
    const root = renderVariant(variant, { disabled: true, invalid: true, children: ["x"] });
    expect(root.getAttribute("data-disabled")).toBe("true");
    expect(root.getAttribute("data-invalid")).toBe("true");
    if (variant.style === "tailwind") {
      expect(classTokens(root)).toContain("data-[invalid=true]:text-destructive");
    }
  });

  test.each(fieldPartVariants.filter((variant) => variant.part === "Legend"))("$part $format/$style renders legend variants", (variant) => {
    const legend = renderVariant(variant, { variant: "legend", children: ["x"] });
    expect(legend.getAttribute("data-variant")).toBe("legend");
    const label = renderVariant(variant, { variant: "label", children: ["x"] });
    expect(label.getAttribute("data-variant")).toBe("label");
    if (variant.style === "css") {
      expect(classTokens(label).some((token) => token.startsWith("h-hella-field-legend-label"))).toBe(true);
    } else {
      expect(classTokens(label)).toContain("data-[variant=label]:text-sm");
    }
  });

  test.each(fieldPartVariants.filter((variant) => variant.part === "Label"))("$part $format/$style composes the label base with the field overrides", (variant) => {
    const root = renderVariant(variant, { children: ["x"] });
    expect(root.tagName).toBe("LABEL");
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith("h-hella-field-label")).toBe(true);
    } else {
      const tokens = classTokens(root);
      expect(tokens).toContain("select-none");
      expect(tokens).toContain("group-data-[disabled=true]/field:opacity-50");
      expect(tokens).toContain("has-[>[data-slot=field]]:w-full");
    }
  });

  test.each(fieldPartVariants.filter((variant) => variant.part === "Separator"))("$part $format/$style nests the rule and omits the content span when empty", (variant) => {
    const bare = renderVariant(variant, {});
    expect(bare.getAttribute("data-content")).toBe("false");
    expect(bare.querySelector("[role='separator']")).not.toBeNull();
    expect(bare.querySelector("[data-slot='field-separator-content']")).toBeNull();
  });

  test.each(fieldPartVariants.filter((variant) => variant.part === "Separator"))("$part $format/$style renders the content span when children exist", (variant) => {
    const root = renderVariant(variant, { children: ["or"] });
    expect(root.getAttribute("data-content")).toBe("true");
    const content = root.querySelector("[data-slot='field-separator-content']")!;
    expect(content.textContent).toBe("or");
  });

  test.each(fieldPartVariants.filter((variant) => variant.part === "Error"))("$part $format/$style renders the destructive tokens and alert role", (variant) => {
    const root = renderVariant(variant, { children: ["Required"] });
    expect(root.getAttribute("role")).toBe("alert");
    expect(root.textContent).toBe("Required");
    expect(root.hasAttribute("hidden")).toBe(false);
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith("h-hella-field-error")).toBe(true);
    } else {
      expect(classTokens(root)).toContain("text-destructive");
    }
  });

  test.each(fieldPartVariants.filter((variant) => variant.part === "Error"))("$part $format/$style hides when empty", (variant) => {
    const root = renderVariant(variant, {});
    expect(root.hasAttribute("hidden")).toBe(true);
  });

  test.each(fieldPartVariants.filter((variant) => variant.part === "Error"))("$part $format/$style renders a single error message as text", (variant) => {
    const root = renderVariant(variant, { errors: [{ message: "Too short" }] });
    expect(root.textContent).toBe("Too short");
    expect(root.hasAttribute("hidden")).toBe(false);
  });

  test.each(fieldPartVariants.filter((variant) => variant.part === "Error"))("$part $format/$style renders multiple errors as a deduplicated list", (variant) => {
    const root = renderVariant(variant, {
      errors: [{ message: "Too short" }, { message: "Too short" }, { message: "Required" }, undefined],
    });
    const list = root.querySelector("ul")!;
    expect(list.querySelectorAll("li")).toHaveLength(2);
    expect(root.textContent).toContain("Required");
  });

  test("all four flavors agree on tag and attributes", () => {
    assertStructuralParity(fieldVariants, { orientation: "horizontal", children: ["x"] });
    assertStructuralParity(fieldVariants, { disabled: true, invalid: true, children: ["x"] });
    assertStructuralParity(fieldPartVariants.filter((candidate) => candidate.part === "Error"), {});
  });
});
