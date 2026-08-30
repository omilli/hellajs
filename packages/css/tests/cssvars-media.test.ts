import { describe, expect, test, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, getStylesheet } from "@utils/test-helpers.js";
import { cssVars, removeCssVars } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
});

describe("cssVars media", () => {
  test("media wraps default-scope variables in the at-rule", () => {
    cssVars({ bg: "#000" }, { media: "(prefers-color-scheme: dark)" });

    flush();
    expect(getStylesheet("hella-vars")).toBe("@media (prefers-color-scheme:dark){:root{--bg:#000}}");
  });

  test("media composes with scoped and prefix options", () => {
    cssVars({ x: { y: 1 } }, { media: "(min-width: 600px)", scoped: ".card", prefix: "ui" });

    flush();
    expect(getStylesheet("hella-vars")).toBe("@media (min-width:600px){.card{--ui-x-y:1}}");
  });

  test("same scope under different media coexists without overwriting", () => {
    cssVars({ bg: "#fff" }, { media: "(prefers-color-scheme: light)" });
    cssVars({ bg: "#000" }, { media: "(prefers-color-scheme: dark)" });

    flush();
    expect(getStylesheet("hella-vars")).toBe(
      "@media (prefers-color-scheme:light){:root{--bg:#fff}}@media (prefers-color-scheme:dark){:root{--bg:#000}}"
    );
  });

  test("reactive media vars rewrite the wrapped rule on signal write", () => {
    const bg = signal("#111");
    cssVars({ bg }, { media: "(prefers-color-scheme: dark)" });

    flush();
    expect(getStylesheet("hella-vars")).toBe("@media (prefers-color-scheme:dark){:root{--bg:#111}}");

    bg("#222");
    flush();
    expect(getStylesheet("hella-vars")).toBe("@media (prefers-color-scheme:dark){:root{--bg:#222}}");
  });

  test("removeCssVars removes only its media bucket", () => {
    const compact = { pad: "4px" };
    cssVars(compact, { media: "(min-width: 600px)" });
    cssVars({ bg: "#000" }, { media: "(prefers-color-scheme: dark)" });

    flush();
    expect(getStylesheet("hella-vars")).toBe(
      "@media (min-width:600px){:root{--pad:4px}}@media (prefers-color-scheme:dark){:root{--bg:#000}}"
    );

    removeCssVars(compact, { media: "(min-width: 600px)" });
    flush();
    expect(getStylesheet("hella-vars")).toBe("@media (prefers-color-scheme:dark){:root{--bg:#000}}");
  });

  test("reactive same-ref repeat call with differing media throws and writes no stray rule", () => {
    const v = { c: signal("red") };
    cssVars(v, { media: "(prefers-color-scheme: dark)" });

    expect(() => cssVars(v)).toThrow("[css] cssVars:");

    flush();
    expect(getStylesheet("hella-vars")).toBe("@media (prefers-color-scheme:dark){:root{--c:red}}");
  });

  test("server text return wraps declarations in the media at-rule", () => {
    const g = globalThis as unknown as Record<string, unknown>;
    const origDocument = g.document;
    g.document = undefined;
    let text: unknown;
    try {
      text = cssVars({ bg: "#000" }, { media: "(prefers-color-scheme: dark)" });
    } finally {
      g.document = origDocument;
    }

    expect(text).toBe("@media (prefers-color-scheme: dark){:root{--bg:#000}}");
  });
});
