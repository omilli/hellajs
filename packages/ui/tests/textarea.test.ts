import { describe, test, expect, beforeEach, mock } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import {
  assertStructuralParity,
  classTokens,
  renderVariant,
  textareaVariants,
} from "./helpers/variants";

/** Verbatim shadcn utility tokens — asserted in the tailwind flavor. */
const BASE_TOKENS = ["flex", "field-sizing-content", "min-h-16", "w-full", "rounded-md", "border", "border-input", "bg-transparent", "px-3", "py-2", "text-base", "shadow-xs", "transition-[color,box-shadow]", "outline-none", "placeholder:text-muted-foreground", "disabled:cursor-not-allowed", "disabled:opacity-50", "md:text-sm", "dark:bg-input/30"];

beforeEach(() => {
  resetTestState();
});

describe("textarea", () => {
  test.each(textareaVariants)("$format/$style renders the textarea root with its attributes", (variant) => {
    const textarea = renderVariant(variant, {
      placeholder: "Tell us more",
      id: "bio-field",
      ariaLabel: "Biography",
      rows: 4,
    }) as HTMLTextAreaElement;
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea.getAttribute("data-slot")).toBe("textarea");
    expect(textarea.getAttribute("placeholder")).toBe("Tell us more");
    expect(textarea.getAttribute("id")).toBe("bio-field");
    expect(textarea.getAttribute("aria-label")).toBe("Biography");
    expect(textarea.getAttribute("rows")).toBe("4");
  });

  test.each(textareaVariants)("$format/$style renders a static value into the value property", (variant) => {
    const textarea = renderVariant(variant, { value: "hello" }) as HTMLTextAreaElement;
    expect(textarea.value).toBe("hello");
  });

  test.each(textareaVariants)("$format/$style updates the value when a bare signal changes", (variant) => {
    const value = signal("first");
    const textarea = renderVariant(variant, { value }) as HTMLTextAreaElement;
    expect(textarea.value).toBe("first");
    value("second");
    flush();
    expect(textarea.value).toBe("second");
  });

  test.each(textareaVariants)("$format/$style passes the typed value to oninput", (variant) => {
    const oninput = mock<(v: string) => void>(() => {});
    const textarea = renderVariant(variant, { oninput }) as HTMLTextAreaElement;
    textarea.value = "typed";
    textarea.dispatchEvent(new Event("input"));
    expect(oninput).toHaveBeenCalledTimes(1);
    expect(oninput).toHaveBeenCalledWith("typed");
  });

  test.each(textareaVariants)("$format/$style composes base, focus, and invalid classes", (variant) => {
    const textarea = renderVariant(variant, {});
    const tokens = classTokens(textarea);
    if (variant.style === "css") {
      expect(tokens).toHaveLength(3);
      expect(tokens[0]!.startsWith("h-hella-textarea-")).toBe(true);
      expect(tokens[1]!.startsWith("h-hella-textarea-focus-")).toBe(true);
      expect(tokens[2]!.startsWith("h-hella-textarea-invalid-")).toBe(true);
    } else {
      for (const token of BASE_TOKENS) expect(tokens).toContain(token);
      expect(tokens).toContain("focus-visible:ring-[3px]");
      expect(tokens).toContain("aria-invalid:border-destructive");
      expect(tokens).toContain("dark:aria-invalid:ring-destructive/40");
    }
  });

  test.each(textareaVariants)("$format/$style sets aria-invalid only from the prop", (variant) => {
    const invalid = renderVariant(variant, { ariaInvalid: true });
    expect(invalid.getAttribute("aria-invalid")).toBe("true");
    const valid = renderVariant(variant, {});
    expect(valid.hasAttribute("aria-invalid")).toBe(false);
  });

  test.each(textareaVariants)("$format/$style merges props.class into the class attribute", (variant) => {
    const textarea = renderVariant(variant, { class: "my-textarea" });
    expect(classTokens(textarea).at(-1)).toBe("my-textarea");
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(textareaVariants, { placeholder: "Parity" });
  });
});
