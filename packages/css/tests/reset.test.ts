import { describe, expect, test, beforeEach, afterEach } from "vite-plus/test";
import { resetTestState, getStylesheet, suppressConsole } from "@utils/test-helpers.js";
import { css, cssText, removeCss, reset } from "@hellajs/css";

let sup: ReturnType<typeof suppressConsole>;

beforeEach(() => {
  resetTestState();
  // happy-dom may reject vendor-prefixed preflight selectors at insertRule,
  // which warns per rejection — capture instead of print.
  sup = suppressConsole();
});

afterEach(() => {
  sup.restore();
});

describe("reset", () => {
  test("registers the preflight rules as globals", () => {
    css(reset);

    const sheet = getStylesheet("hella-css");
    expect(sheet).toContain("box-sizing:border-box");
    expect(sheet).toContain("line-height:1.5");
    expect(sheet).toContain("list-style:none");
  });

  test("emits the exact preflight text", () => {
    css(reset);

    const text = cssText();
    expect(
      text.startsWith(
        `*, ::after, ::before, ::backdrop, ::file-selector-button {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border: 0 solid;
}`,
      ),
    ).toBe(true);
    expect(text).toContain(`a {
  color: inherit;
  -webkit-text-decoration: inherit;
  text-decoration: inherit;
}`);
    expect(text)
      .toContain(`@supports (not (-webkit-appearance: -apple-pay-button)) or (contain-intrinsic-size: 1px) {
  ::placeholder {
    color: color-mix(in oklab, currentcolor 50%, transparent);
  }
}`);
  });

  test("registers server-side and returns an empty string", () => {
    const origDocument = globalThis.document;
    (globalThis as unknown as Record<string, unknown>).document = undefined;
    const returned = css(reset);
    const text = cssText();
    (globalThis as unknown as Record<string, unknown>).document = origDocument;

    expect(returned).toBe("");
    expect(text).toContain("box-sizing: border-box");
    expect(text).toContain("display: none !important");
  });

  test("removeCss drops the reset registration", () => {
    css(reset);

    removeCss(reset);
    expect(cssText()).toBe("");
  });

  test("repeat registrations dedup by text and refcount", () => {
    css(reset);
    css(reset);

    removeCss(reset);
    expect(cssText()).toContain("box-sizing: border-box");
    removeCss(reset);
    expect(cssText()).toBe("");
  });
});
