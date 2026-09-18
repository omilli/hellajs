import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertStructuralParity,
  classTokens,
  inputVariants,
  renderVariant,
} from "./helpers/variants";

beforeEach(() => {
  resetTestState();
});

describe("input", () => {
  test.each(inputVariants)("$format/$style renders an input element with its attributes", (variant) => {
    const input = renderVariant(variant, {
      type: "email",
      placeholder: "you@example.com",
      id: "email-field",
      ariaLabel: "Email address",
    });
    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("data-slot")).toBe("input");
    expect(input.getAttribute("type")).toBe("email");
    expect(input.getAttribute("placeholder")).toBe("you@example.com");
    expect(input.getAttribute("id")).toBe("email-field");
    expect(input.getAttribute("aria-label")).toBe("Email address");
  });

  test.each(inputVariants)("$format/$style renders a static value into the value property", (variant) => {
    const input = renderVariant(variant, { value: "hello" }) as HTMLInputElement;
    expect(input.value).toBe("hello");
  });

  test.each(inputVariants)("$format/$style updates the value when a bare signal changes", (variant) => {
    const value = signal("first");
    const input = renderVariant(variant, { value }) as HTMLInputElement;
    expect(input.value).toBe("first");
    value("second");
    flush();
    expect(input.value).toBe("second");
  });

  test.each(inputVariants)("$format/$style passes the typed value to oninput", (variant) => {
    const oninput = mock<(v: string) => void>(() => {});
    const input = renderVariant(variant, { oninput }) as HTMLInputElement;
    input.value = "typed";
    input.dispatchEvent(new Event("input"));
    expect(oninput).toHaveBeenCalledTimes(1);
    expect(oninput).toHaveBeenCalledWith("typed");
  });

  test.each(inputVariants)("$format/$style composes base, focus, and invalid classes", (variant) => {
    const input = renderVariant(variant, {});
    const tokens = classTokens(input);
    if (variant.style === "css") {
      expect(tokens).toHaveLength(3);
      expect(tokens[0]!.startsWith("h-hella-input-")).toBe(true);
      expect(tokens[1]!.startsWith("h-hella-input-focus-")).toBe(true);
      expect(tokens[2]!.startsWith("h-hella-input-invalid-")).toBe(true);
    } else {
      expect(tokens).toContain("w-full");
      expect(tokens).toContain("rounded-md");
      expect(tokens).toContain("dark:bg-input/30");
      expect(tokens).toContain("focus-visible:ring-[3px]");
      expect(tokens).toContain("aria-invalid:border-destructive");
    }
  });

  test.each(inputVariants)("$format/$style sets aria-invalid only from the prop", (variant) => {
    const invalid = renderVariant(variant, { ariaInvalid: true });
    expect(invalid.getAttribute("aria-invalid")).toBe("true");
    const valid = renderVariant(variant, {});
    expect(valid.hasAttribute("aria-invalid")).toBe(false);
  });

  test.each(inputVariants)("$format/$style merges props.class into the class attribute", (variant) => {
    const input = renderVariant(variant, { class: "my-input" });
    const tokens = classTokens(input);
    expect(tokens.at(-1)).toBe("my-input");
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(inputVariants, { type: "text" });
  });
});
