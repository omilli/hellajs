import { describe, test, expect, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertStructuralParity,
  classTokens,
  progressVariants,
  renderVariant,
} from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

describe("progress", () => {
  test.each(progressVariants)("$format/$style renders the progressbar role and aria values", (variant) => {
    const root = renderVariant(variant, { value: 50 });
    expect(root.getAttribute("data-slot")).toBe("progress");
    expect(root.getAttribute("role")).toBe("progressbar");
    expect(root.getAttribute("aria-valuemin")).toBe("0");
    expect(root.getAttribute("aria-valuemax")).toBe("100");
    expect(root.getAttribute("aria-valuenow")).toBe("50");
    const indicator = root.querySelector("[data-slot='progress-indicator']")!;
    expect(indicator.getAttribute("aria-valuenow")).toBeNull();
  });

  test.each(progressVariants)("$format/$style drives the indicator transform from the value", (variant) => {
    const root = renderVariant(variant, { value: 25 });
    const indicator = root.querySelector("[data-slot='progress-indicator']")!;
    expect(indicator.getAttribute("style")).toContain("translateX(-75%)");
  });

  test.each(progressVariants)("$format/$style renders the indeterminate state without aria-valuenow", (variant) => {
    const root = renderVariant(variant, {});
    expect(root.getAttribute("data-state")).toBe("indeterminate");
    expect(root.hasAttribute("aria-valuenow")).toBe(false);
    const indicator = root.querySelector("[data-slot='progress-indicator']")!;
    expect(indicator.getAttribute("data-state")).toBe("indeterminate");
    expect(indicator.getAttribute("style")).toContain("translateX(-100%)");
  });

  test.each(progressVariants)("$format/$style carries the animation class in the css flavor", (variant) => {
    const root = renderVariant(variant, { value: null });
    const indicator = root.querySelector("[data-slot='progress-indicator']")!;
    const tokens = classTokens(indicator);
    if (variant.style === "css") {
      expect(tokens).toHaveLength(1);
      expect(tokens[0]!.startsWith("progress-indicator-")).toBe(true);
    } else {
      expect(tokens).toContain("transition-all");
    }
  });

  test.each(progressVariants)("$format/$style completes at the max value", (variant) => {
    const root = renderVariant(variant, { value: 100 });
    expect(root.getAttribute("data-state")).toBe("complete");
    expect(root.querySelector("[data-slot='progress-indicator']")!.getAttribute("style")).toContain("translateX(-0%)");
  });

  test.each(progressVariants)("$format/$style updates the width when a reactive value changes", (variant) => {
    const value = signal(20);
    const root = renderVariant(variant, { value: () => value() });
    const indicator = root.querySelector("[data-slot='progress-indicator']")!;
    expect(root.getAttribute("aria-valuenow")).toBe("20");
    expect(indicator.getAttribute("style")).toContain("translateX(-80%)");
    value(70);
    flush();
    expect(root.getAttribute("aria-valuenow")).toBe("70");
    expect(indicator.getAttribute("style")).toContain("translateX(-30%)");
  });

  test.each(progressVariants)("$format/$style merges props.class into the root class attribute", (variant) => {
    const root = renderVariant(variant, { class: "my-progress" });
    expect(classTokens(root).at(-1)).toBe("my-progress");
    if (variant.style === "css") {
      expect(classTokens(root)[0]!.startsWith("progress-")).toBe(true);
    } else {
      expect(classTokens(root)).toContain("bg-primary/20");
    }
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(progressVariants, { value: 50 });
  });
});
