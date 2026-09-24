import { describe, test, expect, beforeEach, mock } from "bun:test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { html } from "@hellajs/dom";
import {
  assertStructuralParity,
  classTokens,
  nativeSelectPartVariants,
  nativeSelectVariants,
  renderVariant,
} from "./helpers/variants";
import type { HellaChild } from "@hellajs/dom";

/** Verbatim shadcn utility tokens — asserted in the tailwind flavor. */
const TOKENS = {
  wrapper: ["group/native-select", "relative", "w-fit", "has-[select:disabled]:opacity-50"],
  base: ["h-9", "w-full", "min-w-0", "appearance-none", "rounded-md", "border", "border-input", "bg-transparent", "px-3", "py-2", "pr-9", "text-sm", "shadow-xs", "data-[size=sm]:h-8", "data-[size=sm]:py-1", "dark:bg-input/30", "dark:hover:bg-input/50"],
  icon: ["pointer-events-none", "absolute", "top-1/2", "right-3.5", "size-4", "-translate-y-1/2", "text-muted-foreground", "opacity-50", "select-none"],
  option: ["bg-[Canvas]", "text-[CanvasText]"],
};

/** One authored option element — options are caller-authored native children. */
const option = (value: string, label: string, disabled = false): HellaChild =>
  html`<option value="${value}" disabled="${disabled}">${label}</option>`;

beforeEach(() => {
  resetTestState();
});

describe("native-select", () => {
  test.each(nativeSelectVariants)("$format/$style renders the wrapper, select, and chevron icon", (variant) => {
    const wrapper = renderVariant(variant, { children: variant.child(option("a", "A")) });
    expect(wrapper.getAttribute("data-slot")).toBe("native-select-wrapper");
    const select = wrapper.querySelector("select")!;
    expect(select.getAttribute("data-slot")).toBe("native-select");
    expect(select.tagName).toBe("SELECT");
    const icon = wrapper.querySelector("svg[data-slot='native-select-icon']")!;
    expect(icon).toBeDefined();
    expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(icon.querySelector("path")!.getAttribute("d")).toBe("m6 9 6 6 6-6");
  });

  test.each(nativeSelectVariants)("$format/$style renders options from authored children", (variant) => {
    const wrapper = renderVariant(variant, { children: variant.child(option("eu", "EU Central")) });
    const select = wrapper.querySelector("select")!;
    const opt = select.querySelector("option")!;
    expect(opt).toBeDefined();
    expect(opt.getAttribute("value")).toBe("eu");
    expect(opt.textContent).toBe("EU Central");
    expect(opt.hasAttribute("disabled")).toBe(false);
  });

  test.each(nativeSelectVariants)("$format/$style passes disabled options through untouched", (variant) => {
    const wrapper = renderVariant(variant, { children: variant.child(option("x", "Off", true)) });
    const opt = wrapper.querySelector("option")! as HTMLOptionElement;
    expect(opt.disabled).toBe(true);
  });

  test.each(nativeSelectVariants)("$format/$style renders the default and sm data-size", (variant) => {
    const def = renderVariant(variant, { children: variant.child(option("a", "A")) });
    expect(def.querySelector("select")!.getAttribute("data-size")).toBe("default");
    const small = renderVariant(variant, { size: "sm", children: variant.child(option("a", "A")) });
    expect(small.querySelector("select")!.getAttribute("data-size")).toBe("sm");
  });

  test.each(nativeSelectVariants)("$format/$style renders a static value once options exist", async (variant) => {
    const select = renderVariant(variant, { value: "eu", children: variant.child(option("eu", "EU")) }).querySelector("select")! as HTMLSelectElement;
    // The value applies at afterMount (children must exist for the match); the mount walk is observer-delivered.
    for (let i = 0; i < 10 && select.value !== "eu"; i++) await delay();
    expect(select.value).toBe("eu");
  });

  test.each(nativeSelectVariants)("$format/$style applies a mid-list value after mount", async (variant) => {
    const select = renderVariant(variant, { value: "us", children: variant.child(html`<option value="eu">EU</option><option value="us">US</option>`) }).querySelector("select")! as HTMLSelectElement;
    for (let i = 0; i < 10 && select.value !== "us"; i++) await delay();
    expect(select.value).toBe("us");
  });

  test.each(nativeSelectVariants)("$format/$style passes the selected value to onchange", (variant) => {
    const onchange = mock<(v: string) => void>(() => {});
    const select = renderVariant(variant, { onchange, children: variant.child(option("eu", "EU")) }).querySelector("select")! as HTMLSelectElement;
    select.value = "eu";
    select.dispatchEvent(new Event("change"));
    expect(onchange).toHaveBeenCalledTimes(1);
    expect(onchange).toHaveBeenCalledWith("eu");
  });

  test.each(nativeSelectVariants)("$format/$style composes wrapper, base, focus, and invalid classes", (variant) => {
    const wrapper = renderVariant(variant, { class: "my-select", children: variant.child(option("a", "A")) });
    const wrapperTokens = classTokens(wrapper);
    if (variant.style === "css") {
      expect(wrapperTokens).toHaveLength(1);
      expect(wrapperTokens[0]!.startsWith("h-hella-native-select-wrapper-")).toBe(true);
    } else {
      for (const token of TOKENS.wrapper) expect(wrapperTokens).toContain(token);
    }
    const selectTokens = classTokens(wrapper.querySelector("select")!);
    if (variant.style === "css") {
      expect(selectTokens).toHaveLength(4);
      expect(selectTokens[0]!.startsWith("h-hella-native-select-")).toBe(true);
      expect(selectTokens[1]!.startsWith("h-hella-native-select-focus-")).toBe(true);
      expect(selectTokens[2]!.startsWith("h-hella-native-select-invalid-")).toBe(true);
      expect(selectTokens.at(-1)).toBe("my-select");
    } else {
      for (const token of TOKENS.base) expect(selectTokens).toContain(token);
      expect(selectTokens.at(-1)).toBe("my-select");
    }
    const iconTokens = classTokens(wrapper.querySelector("svg")!);
    if (variant.style === "css") {
      expect(iconTokens).toHaveLength(1);
      expect(iconTokens[0]!.startsWith("h-hella-native-select-icon-")).toBe(true);
    } else {
      for (const token of TOKENS.icon) expect(iconTokens).toContain(token);
    }
  });

  test.each(nativeSelectVariants)("$format/$style sets aria-invalid only from the prop", (variant) => {
    const invalid = renderVariant(variant, { ariaInvalid: true, children: variant.child(option("a", "A")) });
    expect(invalid.querySelector("select")!.getAttribute("aria-invalid")).toBe("true");
    const valid = renderVariant(variant, { children: variant.child(option("a", "A")) });
    expect(valid.querySelector("select")!.hasAttribute("aria-invalid")).toBe(false);
  });

  test.each(nativeSelectPartVariants)("$format/$style $part renders with its data-slot and classes", (variant) => {
    const el = renderVariant(variant, { children: [], class: "my-part" });
    expect(el.getAttribute("data-slot")).toBe(`native-select-${variant.part.toLowerCase()}`);
    const tokens = classTokens(el);
    expect(tokens.at(-1)).toBe("my-part");
    if (variant.style === "css") {
      expect(tokens[0]!.startsWith(`h-hella-native-select-${variant.part.toLowerCase()}-`)).toBe(true);
    } else {
      for (const token of TOKENS.option) expect(tokens).toContain(token);
    }
  });

  test("keeps structural parity across all four variants", () => {
    assertStructuralParity(nativeSelectVariants);
  });

  test("keeps structural parity for every part across all four variants", () => {
    for (const part of ["Option", "OptGroup"]) {
      const suites = nativeSelectPartVariants.filter((variant) => variant.part === part);
      assertStructuralParity(suites, { children: [] });
    }
  });
});
