import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { resetTestState, getStylesheet, suppressConsole } from "@utils/test-helpers.js";
import { css, cssText, removeCss } from "@hellajs/css/bundle";

let sup: ReturnType<typeof suppressConsole>;

beforeEach(() => {
  resetTestState();
  // happy-dom rejects @layer/@starting-style insertRule, so several tests in this
  // file trigger the skip-with-warning path — capture instead of print.
  sup = suppressConsole();
});

afterEach(() => {
  sup.restore();
});

describe("css at-rules", () => {
  test("media query with nested selectors", () => {
    css({
      "@media (prefers-color-scheme: dark)": {
        ":root": {
          "--theme-bg": "black",
          "--theme-color": "white"
        }
      }
    });
    const content = getStylesheet("hella-css");
    expect(content).toContain("@media (prefers-color-scheme:dark){:root{--theme-bg:black;--theme-color:white}}");
  });

  test("@keyframes generates correct animation", () => {
    css({
      "@keyframes spin": {
        from: { transform: "rotate(0deg)" },
        to: { transform: "rotate(360deg)" },
      },
    });
    const content = getStylesheet("hella-css");
    expect(content).toContain("@keyframes spin");
    expect(content).toContain("0%{transform:rotate(0deg)}");
    expect(content).toContain("100%{transform:rotate(360deg)}");
  });

  test("@keyframes with percentage stops", () => {
    css({
      "@keyframes fadeIn": {
        "0%": { opacity: "0" },
        "50%": { opacity: "0.5" },
        "100%": { opacity: "1" },
      },
    });
    const content = getStylesheet("hella-css");
    expect(content).toContain("@keyframes fadeIn");
    expect(content).toContain("0%{opacity:0}");
    expect(content).toContain("100%{opacity:1}");
  });

  test("@font-face generates correct rule", () => {
    css({
      "@font-face": {
        fontFamily: '"Inter"',
        src: 'url("/fonts/inter.woff2") format("woff2")',
        fontWeight: "400",
        fontStyle: "normal",
      },
    });
    const content = getStylesheet("hella-css");
    expect(content).toContain("@font-face{");
    expect(content).toContain("font-family:Inter");
    expect(content).toContain("font-weight:400");
  });

  test("@container generates correct rule", () => {
    css({
      "@container (min-width: 400px)": {
        ".card": {
          fontSize: "1.25rem",
        },
      },
    });
    const content = getStylesheet("hella-css");
    expect(content).toContain("@container (min-width:400px)");
    expect(content).toContain(".card{font-size:1.25rem}");
  });

  test("@supports generates correct rule", () => {
    css({
      "@supports (display: grid)": {
        ".container": { display: "grid" },
      },
    });
    const content = getStylesheet("hella-css");
    expect(content).toContain("@supports (display:grid){.container{display:grid}}");
  });

  test("@layer generates correct rule", () => {
    const layer = {
      "@layer base": {
        "h1": { fontSize: "2rem" },
        "p": { lineHeight: "1.5" },
      },
    };
    // happy-dom rejects @layer insertRule (the premise of the phantom-index
    // regression pair in sheet-warn.test.ts), so composition is asserted via
    // the server text return (same process() derivation). The patched global
    // is restored in finally and asserted after restore so a throwing
    // css(layer) cannot leak document = undefined into sibling files.
    css(layer);
    expect(getStylesheet("hella-css")).toBe("");

    const savedDocument = globalThis.document;
    let serverText: string;
    (globalThis as unknown as Record<string, unknown>).document = undefined;
    try {
      css(layer);
      serverText = cssText();
    } finally {
      (globalThis as unknown as Record<string, unknown>).document = savedDocument;
    }
    expect(serverText).toBe("@layer base{h1{font-size:2rem}p{line-height:1.5}}");
  });

  test("global @media (no name) is unaffected", () => {
    css({
      "@media (max-width: 768px)": { ".card": { padding: "0.75rem" } },
      ".card": { padding: "1rem" },
    });
    const content = getStylesheet("hella-css");
    expect(content).toContain("@media (max-width:768px){.card{padding:0.75rem}}");
    expect(content).toContain(".card{padding:1rem}");
  });

  describe("selector-less conditional at-rule bodies", () => {
    test.each([
      "@media (min-width: 1px)",
      "@container (min-width: 400px)",
      "@supports (display: grid)",
      "@starting-style",
    ])("%s with direct declarations throws in a global call", (atRule) => {
      expect(() => css({ [atRule]: { color: "red" } })).toThrow(
        `[css] conditional at-rule "${atRule}" contains declarations with no selector — nest selectors under the at-rule`
      );
    });

    test("removeCss throws for the same shape", () => {
      expect(() => removeCss({ "@media (min-width: 1px)": { color: "red" } })).toThrow(
        '[css] conditional at-rule "@media (min-width: 1px)" contains declarations with no selector'
      );
    });

    test("null-only body does not throw (nulls are skipped)", () => {
      expect(() => css({ "@media (min-width: 1px)": { color: null as unknown as undefined } })).not.toThrow();
      expect(getStylesheet("hella-css")).toContain("@media (min-width:1px){}");
    });

    test("conditional at-rule nested under a plain selector inherits it", () => {
      css({ "div.card": { "@media (min-width: 1px)": { color: "red" } } });
      const content = getStylesheet("hella-css");
      expect(content).toContain("@media (min-width:1px){div.card{color:red}}");
      expect(content).not.toContain("{{");
    });
  });
});
