import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { signal } from "@hellajs/core";
import { css, cssVars, removeCss, removeCssVars, resetCss, resetCssVars } from "@hellajs/css/bundle";

let origDocument: unknown;

beforeEach(() => {
  origDocument = globalThis.document;
  (globalThis as unknown as Record<string, unknown>).document = undefined;
});

afterEach(() => {
  (globalThis as unknown as Record<string, unknown>).document = origDocument;
  resetCss();
  resetCssVars();
});

describe("platform-dependent return (no document)", () => {
  test("css() returns CSS text for scoped styles", () => {
    const result = css({ color: "red" }, { name: "x" });
    expect(result).toBe(".x{color:red}");
  });

  test("css() returns CSS text for global styles", () => {
    const result = css({ body: { margin: "0" } });
    expect(result).toBe("body{margin:0}");
  });

  test("css() returns text for complex nested styles", () => {
    const result = css({
      color: "red",
      "&:hover": { color: "blue" },
    }, { name: "btn" });
    expect(result).toBe(".btn{color:red}.btn:hover{color:blue}");
  });

  test("css() does not inject into the DOM", () => {
    css({ color: "red" }, { name: "server-leak" });
    (globalThis as unknown as Record<string, unknown>).document = origDocument;
    const el = document.getElementById("hella-css");
    expect(el?.textContent ?? "").not.toContain("server-leak");
  });

  test("cssVars() returns vars text for static values", () => {
    const result = cssVars({ theme: { color: "red" } });
    expect(result as unknown as string).toBe(":root{--theme-color:red}");
  });

  test("cssVars() returns vars text with scoped option", () => {
    const result = cssVars({ theme: { color: "blue" } }, { scoped: ".card" });
    expect(result as unknown as string).toBe(".card{--theme-color:blue}");
  });

  test("cssVars() returns vars text with prefix option", () => {
    const result = cssVars({ color: "red" }, { prefix: "app" });
    expect(result as unknown as string).toBe(":root{--app-color:red}");
  });

  test("cssVars() resolves reactive signals to initial values in text", () => {
    const color = signal("red");
    const result = cssVars({ x: color });
    expect(result as unknown as string).toBe(":root{--x:red}");
  });

  test("cssVars() does not inject into the DOM", () => {
    cssVars({ theme: { color: "red" } });
    (globalThis as unknown as Record<string, unknown>).document = origDocument;
    const el = document.getElementById("hella-vars");
    expect(el?.textContent ?? "").not.toContain("--theme-color");
  });

  test("removeCss is a no-op", () => {
    expect(() => removeCss({ color: "red" }, { name: "x" })).not.toThrow();
  });

  test("removeCssVars is a no-op", () => {
    expect(() => removeCssVars({ theme: { color: "red" } })).not.toThrow();
  });

  test("resetCss does not throw", () => {
    expect(() => resetCss()).not.toThrow();
  });

  test("resetCssVars does not throw", () => {
    expect(() => resetCssVars()).not.toThrow();
  });
});
