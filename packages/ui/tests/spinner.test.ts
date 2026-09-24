import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertStructuralParity,
  classTokens,
  renderVariant,
  spinnerVariants,
} from "./helpers/variants";

/** Verbatim shadcn utility tokens — asserted in the tailwind flavor. */
const BASE_TOKENS = ["size-4", "animate-spin"];

/** The loader-circle path inlined from refs/icons/loader-circle.svg. */
const LOADER_PATH = "M21 12a9 9 0 1 1-6.219-8.56";

beforeEach(() => {
  resetTestState();
});

describe("spinner", () => {
  test.each(spinnerVariants)("$format/$style renders the loading svg with status semantics", (variant) => {
    const spinner = renderVariant(variant, { class: "my-spinner" });
    expect(spinner.tagName).toBe("svg");
    expect(spinner.getAttribute("role")).toBe("status");
    expect(spinner.getAttribute("aria-label")).toBe("Loading");
    expect(spinner.getAttribute("data-slot")).toBeNull();
    const tokens = classTokens(spinner);
    expect(tokens.at(-1)).toBe("my-spinner");
    if (variant.style === "css") {
      expect(tokens).toHaveLength(2);
      expect(tokens[0]!.startsWith("h-hella-spinner-")).toBe(true);
    } else {
      for (const token of BASE_TOKENS) expect(tokens).toContain(token);
    }
  });

  test.each(spinnerVariants)("$format/$style inlines the loader-circle path from the icon ref", (variant) => {
    const spinner = renderVariant(variant, {});
    const path = spinner.querySelector("path");
    expect(path).not.toBeNull();
    expect(path!.getAttribute("d")).toBe(LOADER_PATH);
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(spinnerVariants);
  });
});
