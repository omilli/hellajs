import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState, getStylesheet, getHostStylesheet } from "@utils/test-helpers.js";
import { style, removeStyle } from "@hellajs/css/bundle";
import { createShadowHost } from "./helpers";

beforeEach(() => {
  resetTestState();
});

describe("style", () => {
  test("returns the labeled class and injects the rule under it", () => {
    const cls = style({ background: "white", "&:hover": { opacity: 0.8 } }, { label: "card" });
    expect(cls).toBe("h-card-1z0q41r");
    expect(getStylesheet("hella-css")).toBe(".h-card-1z0q41r{background:white}.h-card-1z0q41r:hover{opacity:0.8}");
  });

  test("same object and label derive the identical class", () => {
    const first = style({ color: "red", fontSize: "1rem" }, { label: "btn" });
    const second = style({ fontSize: "1rem", color: "red" }, { label: "btn" });
    expect(second).toBe(first);
  });

  test("same object without a label derives a different class with the same declarations", () => {
    const labeled = style({ color: "red" }, { label: "btn" });
    const plain = style({ color: "red" });
    expect(plain).not.toBe(labeled);
    expect(getStylesheet("hella-css")).toBe(`.${labeled}{color:red}.${plain}{color:red}`);
  });

  test("label sanitizes invalid characters to hyphens", () => {
    const cls = style({ color: "red" }, { label: "my card!" });
    expect(cls).toBe("h-my-card-1ql06pj");
  });

  test("label empty after sanitization is treated as absent", () => {
    const sanitized = style({ color: "red" }, { label: "///" });
    const plain = style({ color: "red" });
    expect(sanitized).toBe(plain);
  });

  test("repeat style call bumps the reference count without duplicating the rule", () => {
    const styles = { color: "red" };
    const first = style(styles);
    const second = style(styles);
    expect(second).toBe(first);
    expect(getStylesheet("hella-css")).toBe(`.${first}{color:red}`);
  });

  test("removeStyle decrements and keeps the rule above zero references", () => {
    const styles = { color: "red" };
    const cls = style(styles);
    style(styles);
    removeStyle(styles);
    expect(getStylesheet("hella-css")).toBe(`.${cls}{color:red}`);
  });

  test("removeStyle drops the rule at zero references", () => {
    const cls = style({ color: "red", "&:hover": { color: "blue" } });
    removeStyle({ "&:hover": { color: "blue" }, color: "red" });
    expect(getStylesheet("hella-css")).toBe("");
    expect(cls).toMatch(/^h-[a-z0-9]+$/);
  });

  test("removeStyle no-ops for input that was never styled", () => {
    expect(() => removeStyle({ color: "red" })).not.toThrow();
    expect(getStylesheet("hella-css")).toBe("");
  });

  test("& composes against the class at every occurrence", () => {
    const cls = style({ "&:hover, &.active": { color: "blue" } });
    expect(getStylesheet("hella-css")).toBe(`.${cls}:hover,.${cls}.active{color:blue}`);
  });

  test("plain nested keys compose as descendants of the class", () => {
    const cls = style({ h2: { marginTop: 0 } });
    expect(getStylesheet("hella-css")).toBe(`.${cls} h2{margin-top:0px}`);
  });

  test("conditional at-rules inherit the class", () => {
    const cls = style({ "@media (min-width: 600px)": { padding: "2rem" } });
    expect(getStylesheet("hella-css")).toBe(`@media (min-width:600px){.${cls}{padding:2rem}}`);
  });

  test("definitional at-rules stay global under a class", () => {
    const cls = style({
      color: "red",
      "@keyframes spin": { from: { opacity: 0 }, to: { opacity: 1 } },
    }, { label: "anim" });
    expect(getStylesheet("hella-css")).toBe(
      `.${cls}{color:red}@keyframes spin{0%{opacity:0}100%{opacity:1}}`
    );
  });

  test("value semantics under a class mirror css()", () => {
    const cls = style({
      width: 5,
      opacity: 0.5,
      fontFamily: ["Helvetica", "Arial"],
      "--custom": 10,
      content: "Hello",
    });
    expect(getStylesheet("hella-css")).toBe(
      `.${cls}{width:5px;opacity:0.5;font-family:Helvetica,Arial;--custom:10;content:"Hello"}`
    );
  });

  test("function leaf values throw the css error", () => {
    // @ts-expect-error - testing invalid input
    expect(() => style({ padding: () => "1px" })).toThrow(
      "[css] function values are not supported in css objects — use vars() for reactive values, key: padding"
    );
  });

  test.each([null, undefined, "not-an-object", 42])("throws on non-object input", (invalid) => {
    // @ts-expect-error - testing invalid input
    expect(() => style(invalid)).toThrow("[css] style:");
  });

  test("throws when a string base is paired with a non-object override", () => {
    // @ts-expect-error - testing invalid input
    expect(() => style("card", 42)).toThrow("[css] style: expected a CSS object, received 42");
  });

  test("host option injects into the host, not the document head", () => {
    const shadowRoot = createShadowHost();
    const cls = style({ color: "red" }, { host: shadowRoot });
    expect(shadowRoot.querySelectorAll("style").length).toBe(1);
    expect(getHostStylesheet(shadowRoot)).toBe(`.${cls}{color:red}`);
    expect(document.getElementById("hella-css")).toBeNull();
  });

  test("the same object in two hosts derives the same class and injects into both", () => {
    const first = createShadowHost();
    const second = createShadowHost();
    const styles = { color: "red" };
    const clsFirst = style(styles, { host: first });
    const clsSecond = style(styles, { host: second });
    expect(clsSecond).toBe(clsFirst);
    expect(getHostStylesheet(first)).toBe(`.${clsFirst}{color:red}`);
    expect(getHostStylesheet(second)).toBe(`.${clsFirst}{color:red}`);
  });

  test("removeStyle with host decrements that host's registration only", () => {
    const first = createShadowHost();
    const second = createShadowHost();
    const styles = { color: "red" };
    const cls = style(styles, { host: first });
    style(styles, { host: second });

    removeStyle(styles, { host: first });

    expect(getHostStylesheet(first)).toBe("");
    expect(getHostStylesheet(second)).toBe(`.${cls}{color:red}`);
  });
});
