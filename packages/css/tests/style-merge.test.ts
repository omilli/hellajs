import { describe, test, expect, beforeEach } from "vite-plus/test";
import { resetTestState, getStylesheet, getHostStylesheet } from "@utils/test-helpers.js";
import { style, removeStyle } from "@hellajs/css";
import { createShadowHost } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("style merge", () => {
  const base = { padding: "1rem", color: "red" };
  const override = { color: "blue" };

  test("an array of style objects merges into one class, nested selectors key by key", () => {
    const cls = style([
      { padding: "1rem", "&:focus": { borderColor: "blue", color: "navy" } },
      { color: "red", "&:focus": { color: "green" } },
    ]);
    expect(cls).toMatch(/^[a-z]+$/);
    expect(getStylesheet("hella-css")).toBe(
      `.${cls}{padding:1rem;color:red}.${cls}:focus{border-color:blue;color:green}`,
    );
  });

  test("merges left to right and the last entry wins a shared key", () => {
    const cls = style([{ padding: "1rem", color: "red" }, { margin: 0 }, { color: "blue" }]);
    expect(getStylesheet("hella-css")).toBe(`.${cls}{padding:1rem;color:blue;margin:0px}`);
  });

  test("a single-element array derives the same class as the bare object", () => {
    const single = style([base]);
    expect(single).toBe(style(base));
    expect(getStylesheet("hella-css")).toBe(`.${single}{padding:1rem;color:red}`);
  });

  test("an array value in a later entry replaces the earlier array value", () => {
    const cls = style([{ fontFamily: ["Helvetica", "Arial"] }, { fontFamily: ["monospace"] }]);
    expect(getStylesheet("hella-css")).toBe(`.${cls}{font-family:monospace}`);
  });

  test("the label option names the merged class", () => {
    const cls = style([base, override], { label: "field-error" });
    expect(cls).toMatch(/^field-error-[a-z]+$/);
    expect(getStylesheet("hella-css")).toBe(`.${cls}{padding:1rem;color:blue}`);
  });

  test("the host option registers the merged rule into the host only", () => {
    const host = createShadowHost();
    const cls = style([base, override], { host });
    expect(getHostStylesheet(host)).toBe(`.${cls}{padding:1rem;color:blue}`);
    expect(document.getElementById("hella-css")).toBeNull();
  });

  test("removeStyle with the same array and options removes the hosted merge", () => {
    const host = createShadowHost();
    const cls = style([base, override], { host });
    expect(getHostStylesheet(host)).toBe(`.${cls}{padding:1rem;color:blue}`);

    removeStyle([base, override], { host });

    expect(getHostStylesheet(host)).toBe("");
  });

  test("throws on an empty array", () => {
    expect(() => style([])).toThrow("[css] style: expected at least one style object");
  });

  test.each(["card", null])("throws when an array element is not a plain object", (element) => {
    // @ts-expect-error - testing invalid input
    expect(() => style([base, element])).toThrow(
      `[css] style: expected a CSS object, received ${element}`,
    );
  });

  test("throws the css error when the label option is not a string", () => {
    // @ts-expect-error - testing invalid input
    expect(() => style(base, { label: { fontWeight: 600 } })).toThrow(
      "[css] style: label must be a string, received [object Object]",
    );
    // @ts-expect-error - testing invalid input
    expect(() => style([base], { label: 5 })).toThrow(
      "[css] style: label must be a string, received 5",
    );
  });

  test("rejects a positional override pair at compile time", () => {
    // @ts-expect-error - a second style object is no longer an override; merge through an array
    style(base, override);
    // @ts-expect-error - the three-argument compose form is removed
    style(base, override, { label: "x" });
  });
});
