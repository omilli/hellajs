import { describe, expect, test, beforeEach } from "bun:test";
import { flush, signal } from "@hellajs/core";
import { resetTestState, getStylesheet } from "@utils/test-helpers.js";
import { vars, removeVars, cssText } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
});

describe("vars media", () => {
  test("media wraps default-scope variables in the at-rule", () => {
    vars({ bg: "#000" }, { media: "(prefers-color-scheme: dark)" });

    flush();
    expect(getStylesheet("hella-vars")).toBe("@media (prefers-color-scheme:dark){:root{--bg:#000}}");
  });

  test("media composes with scoped and prefix options", () => {
    vars({ x: { y: 1 } }, { media: "(min-width: 600px)", scoped: ".card", prefix: "ui" });

    flush();
    expect(getStylesheet("hella-vars")).toBe("@media (min-width:600px){.card{--ui-x-y:1}}");
  });

  test("same scope under different media coexists without overwriting", () => {
    vars({ bg: "#fff" }, { media: "(prefers-color-scheme: light)" });
    vars({ bg: "#000" }, { media: "(prefers-color-scheme: dark)" });

    flush();
    expect(getStylesheet("hella-vars")).toBe(
      "@media (prefers-color-scheme:light){:root{--bg:#fff}}@media (prefers-color-scheme:dark){:root{--bg:#000}}"
    );
  });

  test("reactive media vars rewrite the wrapped rule on signal write", () => {
    const bg = signal("#111");
    vars({ bg }, { media: "(prefers-color-scheme: dark)" });

    flush();
    expect(getStylesheet("hella-vars")).toBe("@media (prefers-color-scheme:dark){:root{--bg:#111}}");

    bg("#222");
    flush();
    expect(getStylesheet("hella-vars")).toBe("@media (prefers-color-scheme:dark){:root{--bg:#222}}");
  });

  test("removeVars removes only its media bucket", () => {
    const compact = { pad: "4px" };
    vars(compact, { media: "(min-width: 600px)" });
    vars({ bg: "#000" }, { media: "(prefers-color-scheme: dark)" });

    flush();
    expect(getStylesheet("hella-vars")).toBe(
      "@media (min-width:600px){:root{--pad:4px}}@media (prefers-color-scheme:dark){:root{--bg:#000}}"
    );

    removeVars(compact, { media: "(min-width: 600px)" });
    flush();
    expect(getStylesheet("hella-vars")).toBe("@media (prefers-color-scheme:dark){:root{--bg:#000}}");
  });

  test("reactive same-ref repeat call with differing media throws and writes no stray rule", () => {
    const v = { c: signal("red") };
    vars(v, { media: "(prefers-color-scheme: dark)" });

    expect(() => vars(v)).toThrow("[css] vars:");

    flush();
    expect(getStylesheet("hella-vars")).toBe("@media (prefers-color-scheme:dark){:root{--c:red}}");
  });

  test("server registration wraps media vars and cssText() carries them", () => {
    const g = globalThis as unknown as Record<string, unknown>;
    const origDocument = g.document;
    g.document = undefined;
    let result: unknown;
    let text: string;
    try {
      result = vars({ bg: "#000" }, { media: "(prefers-color-scheme: dark)" });
      text = cssText();
    } finally {
      g.document = origDocument;
    }

    expect(result).toEqual({ bg: "var(--bg)" });
    expect(text).toBe("@media (prefers-color-scheme: dark){:root{--bg:#000}}");
  });
});
