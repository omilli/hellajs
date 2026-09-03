import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState, getStylesheet } from "@utils/test-helpers.js";
import { keyframes, removeKeyframes, style, cssText } from "@hellajs/css/bundle";

beforeEach(() => {
  resetTestState();
});

describe("keyframes", () => {
  test("returns a content-hashed h-kf- name", () => {
    const name = keyframes({ from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } });

    expect(name).toMatch(/^h-kf-[a-z0-9]+$/);
  });

  test("injects the exact @keyframes rule into the stylesheet", () => {
    const name = keyframes({ "0%": { opacity: "0" }, "100%": { opacity: "1" } });

    expect(getStylesheet("hella-css")).toBe(`@keyframes ${name}{0%{opacity:0}100%{opacity:1}}`);
  });

  test("carries the exact from/to rule form via cssText (happy-dom re-serializes from/to in the CSSOM)", () => {
    const name = keyframes({ from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } });

    expect(cssText()).toBe(`@keyframes ${name}{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`);
  });

  test("injects from/to steps into the CSSOM as 0%/100% (happy-dom serialization)", () => {
    const name = keyframes({ from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } });

    expect(getStylesheet("hella-css")).toBe(`@keyframes ${name}{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`);
  });

  test("repeat call with a structurally equal object returns the same name and injects one rule", () => {
    const first = keyframes({ from: { transform: "scale(1)" }, to: { transform: "scale(1.1)" } });
    const second = keyframes({ to: { transform: "scale(1.1)" }, from: { transform: "scale(1)" } });

    expect(second).toBe(first);
    expect(getStylesheet("hella-css")).toBe(`@keyframes ${first}{0%{transform:scale(1)}100%{transform:scale(1.1)}}`);
  });

  test("composes into a style() animation declaration", () => {
    const spin = keyframes({ "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } });
    const cls = style({ animation: `${spin} 1s linear infinite` });

    expect(getStylesheet("hella-css")).toBe(`@keyframes ${spin}{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}.${cls}{animation:${spin} 1s linear infinite}`);
  });

  test("removeKeyframes decrements and drops the rule at zero references", () => {
    const steps = { from: { opacity: "0" }, to: { opacity: "1" } };
    const name = keyframes(steps);
    keyframes(steps);

    removeKeyframes(steps);
    expect(cssText()).toBe(`@keyframes ${name}{from{opacity:0}to{opacity:1}}`);

    removeKeyframes(steps);
    expect(cssText()).toBe("");
    expect(getStylesheet("hella-css")).toBe("");
  });

  test("removeKeyframes is a no-op for unknown input", () => {
    expect(() => removeKeyframes({ from: { opacity: "0" } })).not.toThrow();
    expect(getStylesheet("hella-css")).toBe("");
  });

  describe("input validation", () => {
    test.each([null, undefined, "not-an-object"])("throws on non-object input", (invalid) => {
      // @ts-expect-error - testing invalid input
      expect(() => keyframes(invalid)).toThrow("[css] keyframes:");
    });
  });
});
