import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertAttrForwarded,
  assertHandlerForwarded,
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
      "aria-label": "Email address",
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

  test.each(inputVariants)("$format/$style passes the typed value to on:input via e.target", (variant) => {
    const onInput = mock((e: Event) => (e.target as HTMLInputElement).value);
    const input = renderVariant(variant, { "on:input": onInput }) as HTMLInputElement;
    input.value = "typed";
    input.dispatchEvent(new Event("input"));
    expect(onInput).toHaveBeenCalledTimes(1);
    expect(onInput.mock.results[0]!.value).toBe("typed");
  });

  test.each(inputVariants)("$format/$style composes base, focus, and invalid classes", (variant) => {
    const input = renderVariant(variant, {});
    const tokens = classTokens(input);
    if (variant.style === "css") {
      expect(tokens).toHaveLength(3);
      expect(tokens[0]!.startsWith("input-")).toBe(true);
      expect(tokens[1]!.startsWith("input-focus-")).toBe(true);
      expect(tokens[2]!.startsWith("input-invalid-")).toBe(true);
    } else {
      expect(tokens).toContain("w-full");
      expect(tokens).toContain("rounded-md");
      expect(tokens).toContain("dark:bg-input/30");
      expect(tokens).toContain("focus-visible:ring-[3px]");
      expect(tokens).toContain("aria-invalid:border-destructive");
    }
  });

  test.each(inputVariants)("$format/$style renders aria-invalid from the kebab attribute", (variant) => {
    const invalid = renderVariant(variant, { "aria-invalid": "true" });
    expect(invalid.getAttribute("aria-invalid")).toBe("true");
    const valid = renderVariant(variant, {});
    expect(valid.hasAttribute("aria-invalid")).toBe(false);
  });

  test.each(inputVariants)("$format/$style merges props.class into the class attribute", (variant) => {
    const input = renderVariant(variant, { class: "my-input" });
    const tokens = classTokens(input);
    expect(tokens.at(-1)).toBe("my-input");
  });

  test("forwards user attrs onto the root across all four variants", () => {
    assertAttrForwarded(inputVariants, { title: "Hella" }, "title", "Hella");
  });

  test("fires a user on:click handler across all four variants", () => {
    const onClick = mock(() => {});
    assertHandlerForwarded(inputVariants, { "on:click": onClick }, "on:click", "click", onClick);
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(inputVariants, { type: "text" });
  });
});
