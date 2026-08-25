import { describe, expect, test, beforeEach } from "bun:test";
import { resetTestState, getStylesheet } from "@utils/test-helpers.js";
import { css, removeCss } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
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
    // happy-dom rejects @layer insertRule (the premise of the failed-insertRule
    // tests below), so composition is asserted via the server text return
    // (same process() derivation), captured before asserting so a failure
    // cannot leak the patched global.
    css(layer);
    expect(getStylesheet("hella-css")).toBe("");

    const savedDocument = globalThis.document;
    (globalThis as unknown as Record<string, unknown>).document = undefined;
    const serverText = css(layer);
    (globalThis as unknown as Record<string, unknown>).document = savedDocument;
    expect(serverText).toBe("@layer base{h1{font-size:2rem}p{line-height:1.5}}");
  });

  test("scoped @media wraps direct properties under class selector", () => {
    css({
      "@media (max-width: 768px)": { fontSize: "12px", color: "red" }
    }, { name: "btn" });
    const content = getStylesheet("hella-css");
    expect(content).toContain("@media (max-width:768px){.btn{");
    expect(content).toContain("font-size:12px");
    expect(content).toContain("color:red");
    expect(content).not.toContain("{{");
  });

  test("scoped @media composes descendant selectors", () => {
    css({
      "@media (max-width: 768px)": {
        ".child": { color: "blue" }
      }
    }, { name: "btn" });
    const content = getStylesheet("hella-css");
    expect(content).toContain("@media (max-width:768px){");
    expect(content).toContain(".btn .child{color:blue}");
  });

  test("scoped @media composes & selector", () => {
    css({
      "@media (max-width: 768px)": {
        "&:hover": { color: "red" }
      }
    }, { name: "btn" });
    const content = getStylesheet("hella-css");
    expect(content).toContain("@media (max-width:768px){");
    expect(content).toContain(".btn:hover{color:red}");
  });

  test("scoped @container inherits scope", () => {
    css({
      "@container (min-width: 400px)": { fontSize: "12px" }
    }, { name: "btn" });
    const content = getStylesheet("hella-css");
    expect(content).toContain("@container (min-width:400px){");
    expect(content).toContain(".btn{font-size:12px}");
  });

  test("scoped @supports inherits scope", () => {
    css({
      "@supports (display: grid)": { display: "grid" }
    }, { name: "btn" });
    const content = getStylesheet("hella-css");
    expect(content).toContain("@supports (display:grid){");
    expect(content).toContain(".btn{display:grid}");
  });

  test("scoped @starting-style inherits scope", () => {
    const startingStyle = { "@starting-style": { opacity: "1" } };
    // happy-dom rejects @starting-style insertRule, so composition is asserted
    // via the server text return (same process() derivation), captured before
    // asserting so a failure cannot leak the patched global.
    css(startingStyle, { name: "btn" });
    expect(getStylesheet("hella-css")).toBe("");

    const savedDocument = globalThis.document;
    (globalThis as unknown as Record<string, unknown>).document = undefined;
    const serverText = css(startingStyle, { name: "btn" });
    (globalThis as unknown as Record<string, unknown>).document = savedDocument;
    expect(serverText).toBe("@starting-style{.btn{opacity:1}}");
  });

  test("@keyframes stays global even with name option", () => {
    css({
      "@keyframes spin": {
        from: { transform: "rotate(0deg)" },
        to: { transform: "rotate(360deg)" },
      },
    }, { name: "btn" });
    const content = getStylesheet("hella-css");
    expect(content).toContain("@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}");
    expect(content).not.toContain(".btn{@keyframes");
  });

  test("@font-face stays global even with name option", () => {
    css({
      "@font-face": {
        fontFamily: '"Custom"',
        src: 'url("/fonts/custom.woff2") format("woff2")',
      },
    }, { name: "btn" });
    const content = getStylesheet("hella-css");
    expect(content).toContain("@font-face{");
    expect(content).toContain("font-family:Custom");
    expect(content).not.toContain(".btn{@font-face");
  });

  test("@layer stays global even with name option", () => {
    const layer = {
      "@layer utilities": {
        ".flex": { display: "flex" },
      },
    };
    // happy-dom rejects @layer insertRule — assert no stray .btn wrap client-side
    // and the composition via the server text return (captured before asserting).
    css(layer, { name: "btn" });
    const content = getStylesheet("hella-css");
    expect(content).not.toContain("@layer");
    expect(content).not.toContain(".btn{@layer");

    const savedDocument = globalThis.document;
    (globalThis as unknown as Record<string, unknown>).document = undefined;
    const serverText = css(layer, { name: "btn" });
    (globalThis as unknown as Record<string, unknown>).document = savedDocument;
    expect(serverText).toBe("@layer utilities{.flex{display:flex}}");
  });

  describe("failed insertRule", () => {
    function getCssSheet(): CSSStyleSheet {
      return (document.getElementById("hella-css") as HTMLStyleElement).sheet as CSSStyleSheet;
    }

    test("phantom indexMap entry is not created when insertRule throws", () => {
      // happy-dom rejects @layer, so insertRule will throw.
      // The phantom entry bug would cause a subsequent supported rule to
      // be injected at a stale index, corrupting the sheet.
      css({ "@layer base": { h1: { fontSize: "2rem" } } });
      css({ body: { margin: "0" } });
      const sheet = getCssSheet();
      expect(sheet.cssRules.length).toBe(1);
      expect(sheet.cssRules[0]!.cssText).toContain("body");
      // @layer is rejected by happy-dom, so it is absent from the CSSOM —
      // the failed insert is the premise of this test.
      const content = getStylesheet("hella-css");
      expect(content).not.toContain("@layer");
      expect(content).toContain("body");
    });

    test("re-injecting a failed rule key does not corrupt existing rules", () => {
      // First injection fails (happy-dom rejects @layer).
      css({ "@layer base": { h1: { fontSize: "2rem" } } });
      // Supported rule lands fine.
      css({ body: { margin: "0" } });
      // Re-inject same @layer key with different text — exercises existing-key path.
      css({ "@layer base": { h1: { color: "red" } } });
      const sheet = getCssSheet();
      expect(sheet.cssRules.length).toBe(1);
      expect(sheet.cssRules[0]!.cssText).toContain("body");
    });
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
        `[css] conditional at-rule "${atRule}" contains declarations with no selector — nest selectors under it or use the name option`
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
