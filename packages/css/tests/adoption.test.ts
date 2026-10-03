import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { css, style, removeStyle } from "@hellajs/css/bundle";
import { getCssSheet } from "./helpers";

/**
 * Seeds the SSR shape: a hella-css element already carrying rules the client
 * registration state does not know (direct insertRule — platform-independent).
 */
function seedSsrSheet(cssTexts: string[]): HTMLStyleElement {
  const el = document.createElement("style");
  el.id = "hella-css";
  document.head.appendChild(el);
  let i = 0;
  while (i < cssTexts.length) {
    const text = cssTexts[i] as string;
    el.sheet!.insertRule(text, i);
    i++;
  }
  return el;
}

beforeEach(() => {
  resetTestState();
});

describe("sheet adoption", () => {
  test("drains a pre-existing hella-css element and repopulates identical registrations without duplicates", () => {
    const cls = style({ color: "red" }, { label: "adopt-btn" });
    resetTestState();
    seedSsrSheet([`.${cls}{color:red}`]);
    expect(getCssSheet().cssRules.length).toBe(1);
    expect(style({ color: "red" }, { label: "adopt-btn" })).toBe(cls);
    expect(document.querySelectorAll("#hella-css").length).toBe(1);
    expect(getCssSheet().cssRules.length).toBe(1);
    expect(getCssSheet().cssRules[0]!.cssText).toContain(cls);
  });

  test("appends post-adoption registrations and removes them via removeStyle", () => {
    seedSsrSheet([".one{color:red}"]);
    css({ ".one": { color: "red" } });
    expect(getCssSheet().cssRules.length).toBe(1);
    style({ color: "blue" }, { label: "adopt-new" });
    expect(getCssSheet().cssRules.length).toBe(2);
    removeStyle({ color: "blue" }, { label: "adopt-new" });
    expect(getCssSheet().cssRules.length).toBe(1);
    expect(getCssSheet().cssRules[0]!.cssText).toContain(".one");
    expect(document.querySelectorAll("#hella-css").length).toBe(1);
  });
});
